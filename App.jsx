import React, { useState, useEffect, useMemo } from 'react';

const STORAGE_KEY = 'wa:dashboard:v1';
const LOCAL_KEY = 'wa:dashboard:v1:local';

const COLORS = {
  navy: '#0A0A0A', navy2: '#111111', navy3: '#161616',
  gold: '#C9A84C', goldBright: '#E5C76B',
  goldDim: 'rgba(201, 168, 76, 0.3)', goldFaint: 'rgba(201, 168, 76, 0.08)',
  cream: '#f5f1e8', text: '#e8e3d8',
  textDim: 'rgba(232, 227, 216, 0.55)', textFaint: 'rgba(232, 227, 216, 0.3)',
  border: 'rgba(201, 168, 76, 0.18)',
  success: '#8cc084', warning: '#d4a574', danger: '#c87572'
};

const EMPTY_COMP = { account: '', hook: '', format: '', estViews: '', whatWorked: '' };
const DEFAULT_RESEARCH = { weekOf: null, competitorReels: [EMPTY_COMP, EMPTY_COMP, EMPTY_COMP, EMPTY_COMP, EMPTY_COMP], audienceLanguage: '', trendSignals: '', personalSaves: [] };

const DEFAULT_DATA = {
  meta: { lastUpdated: null, version: 4 },
  activeBrief: {
    title: 'Peter Lynch curation reel', figure: 'Lynch',
    targetLine: '"The best stock to buy is the one you already own"',
    postDate: '2026-05-16', postTime: '21:00 CET',
    duration: '18-22 sec', audio: 'Hans Zimmer "Time" at 15-20%',
    status: 'Awaiting clip source URL',
    notes: 'Two-line title card. Polarising closing card: "You probably sold yours last year." CTA closing card per locked format. Cross-post YouTube Shorts.'
  },
  posts: [
    { id: 'p1', date: '2026-05-14', platform: 'Instagram', figure: 'Dalio', format: 'Curation', title: 'Holy Grail diversification', views: 0, watchTime: 0, saveRate: 0, shareRate: 0 },
    { id: 'p2', date: '2026-05-13', platform: 'Instagram', figure: 'Buffett', format: 'Stream 4', title: 'Penny / Dividend stream', views: 2346, watchTime: 18, saveRate: 0.1, shareRate: 0.1 },
    { id: 'p3', date: '2026-05-11', platform: 'Instagram', figure: '—', format: 'Carousel', title: '7 Income Streams 9-slide', views: 0, watchTime: 0, saveRate: 0, shareRate: 0 },
    { id: 'p4', date: '2026-05-10', platform: 'Instagram', figure: 'Buffett', format: 'Curation', title: 'Retained earnings', views: 0, watchTime: 0, saveRate: 0, shareRate: 0 },
    { id: 'p5', date: '2026-05-07', platform: 'Instagram', figure: 'Dalio', format: 'Curation', title: 'Cash is trash', views: 1801, watchTime: 15, saveRate: 0, shareRate: 0 }
  ],
  tasks: [
    { id: 't1', text: 'Update Seedance ending block in Settings > Profile to new block-character aesthetic', priority: 'high', completed: false, due: '2026-05-15' },
    { id: 't2', text: 'Source modern HD Peter Lynch clip with target line "best stock to buy is the one you already own"', priority: 'high', completed: false, due: '2026-05-16' },
    { id: 't3', text: 'Build Lynch reel in CapCut — 18-22s, two-line title, polarising closer, CTA closing card, Hans Zimmer "Time"', priority: 'high', completed: false, due: '2026-05-16' },
    { id: 't4', text: 'Post Lynch reel 9pm CET + reply to every comment 9pm-9:30pm', priority: 'high', completed: false, due: '2026-05-16' },
    { id: 't5', text: 'Set up ManyChat WEALTH keyword flow (3-message sequence)', priority: 'medium', completed: false, due: '2026-05-22' },
    { id: 't6', text: 'Migrate dashboard to Vercel + Supabase (kill artifact dependency)', priority: 'medium', completed: false, due: '2026-05-24' },
    { id: 't7', text: 'Monthly Instagram strategy review (last Sunday of month)', priority: 'low', completed: false, due: '2026-05-31' },
    { id: 't8', text: 'Beehiiv setup trigger — fire when 50 Gumroad email captures hit', priority: 'low', completed: false, due: null },
    { id: 't9', text: 'Activate Make.com automation when Sunday production exceeds 6 hours', priority: 'low', completed: false, due: null }
  ],
  funnel: [{ id: 'f1', weekOf: '2026-05-12', followers: 0, freeDownloads: 0, sales8: 0, sales37: 0, newsletterSubs: 0 }],
  rotation: {
    Buffett: { lastUsed: '2026-05-13', cooldownDays: 10 }, Dalio: { lastUsed: '2026-05-14', cooldownDays: 14 },
    Lynch: { lastUsed: '2026-05-16', cooldownDays: 14 }, Munger: { lastUsed: null, cooldownDays: 14 },
    Hormozi: { lastUsed: null, cooldownDays: 14 }, Druckenmiller: { lastUsed: null, cooldownDays: 14 },
    'Howard Marks': { lastUsed: null, cooldownDays: 14 }, Burry: { lastUsed: null, cooldownDays: 14 }, Bogle: { lastUsed: null, cooldownDays: 14 }
  },
  forecastInputs: {
    avgViewsPerPost: 2000, weeklyGrowthPct: 5, postsPerWeek: 6,
    bioLinkCTR: 2, freeDownloadConv: 40, eightEuroConv: 4, thirtySevenEuroConv: 1.5,
    eightEuroPrice: 8, thirtySevenEuroPrice: 37, monthlyCost: 90
  },
  researchInputs: DEFAULT_RESEARCH
};

const fmtDate = iso => !iso ? '—' : new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
const daysSince = iso => !iso ? null : Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
const todayISO = () => new Date().toISOString().slice(0, 10);
const sundayOf = (d = new Date()) => { const x = new Date(d); x.setDate(x.getDate() - x.getDay()); return x.toISOString().slice(0, 10); };
const wordCount = s => s && s.trim() ? s.trim().split(/\s+/).length : 0;

// Storage layer with cloud + localStorage fallback
async function loadData() {
  let cloudData = null;
  try { const r = await window.storage.get(STORAGE_KEY); if (r?.value) cloudData = JSON.parse(r.value); } catch (e) {}
  let localData = null;
  try { const v = localStorage.getItem(LOCAL_KEY); if (v) localData = JSON.parse(v); } catch (e) {}
  // Prefer whichever has more recent meta.lastUpdated
  if (cloudData && localData) {
    const cT = cloudData.meta?.lastUpdated ? new Date(cloudData.meta.lastUpdated).getTime() : 0;
    const lT = localData.meta?.lastUpdated ? new Date(localData.meta.lastUpdated).getTime() : 0;
    return { data: lT > cT ? localData : cloudData, source: lT > cT ? 'local (newer)' : 'cloud' };
  }
  if (cloudData) return { data: cloudData, source: 'cloud' };
  if (localData) return { data: localData, source: 'local backup' };
  return { data: null, source: 'none' };
}

async function saveData(data) {
  const json = JSON.stringify(data);
  let localOk = false;
  try { localStorage.setItem(LOCAL_KEY, json); localOk = true; } catch (e) {}
  let cloudOk = false; let cloudError = null;
  for (let i = 0; i < 3; i++) {
    try { await window.storage.set(STORAGE_KEY, json); cloudOk = true; break; }
    catch (e) { cloudError = e?.message || String(e); if (i < 2) await new Promise(r => setTimeout(r, 400 * Math.pow(2, i))); }
  }
  return { localOk, cloudOk, cloudError };
}

async function exportData(data) {
  const json = JSON.stringify(data, null, 2);
  try { await navigator.clipboard.writeText(json); return { ok: true, method: 'clipboard' }; }
  catch (e) {
    try {
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `wa-dashboard-${todayISO()}.json`;
      a.click(); URL.revokeObjectURL(url);
      return { ok: true, method: 'download' };
    } catch (e2) { return { ok: false, error: e2.message }; }
  }
}

// Decimal input that accepts comma OR period
function DecimalInput({ value, onSave, style, placeholder, ...rest }) {
  const [local, setLocal] = useState(value == null ? '' : String(value));
  useEffect(() => { setLocal(value == null ? '' : String(value)); }, [value]);
  const commit = () => {
    if (local === '') { if (value !== 0) onSave(0); return; }
    const normalized = local.replace(',', '.').replace(/[^\d.\-]/g, '');
    const parsed = parseFloat(normalized);
    const result = isNaN(parsed) ? 0 : parsed;
    if (result !== value) onSave(result);
    setLocal(String(result));
  };
  return <input type="text" inputMode="decimal" className="wa-input" placeholder={placeholder} style={{ padding: 6, ...style }} value={local} onChange={e => setLocal(e.target.value)} onBlur={commit} {...rest} />;
}

// Integer input
function IntInput({ value, onSave, style, placeholder, ...rest }) {
  const [local, setLocal] = useState(value == null ? '' : String(value));
  useEffect(() => { setLocal(value == null ? '' : String(value)); }, [value]);
  const commit = () => {
    const cleaned = local.replace(/[^\d\-]/g, '');
    const result = cleaned === '' || cleaned === '-' ? 0 : parseInt(cleaned, 10);
    if (result !== value) onSave(result);
    setLocal(String(result));
  };
  return <input type="text" inputMode="numeric" className="wa-input" placeholder={placeholder} style={{ padding: 6, ...style }} value={local} onChange={e => setLocal(e.target.value)} onBlur={commit} {...rest} />;
}

// Inline text edit
function TextInput({ value, onSave, style, ...rest }) {
  const [local, setLocal] = useState(value ?? '');
  useEffect(() => { setLocal(value ?? ''); }, [value]);
  return <input className="wa-input" style={{ padding: 6, ...style }} value={local} onChange={e => setLocal(e.target.value)} onBlur={() => { if (local !== (value ?? '')) onSave(local); }} {...rest} />;
}

// Delete button with inline confirm (no browser dialog)
function DeleteBtn({ onConfirm }) {
  const [confirming, setConfirming] = useState(false);
  useEffect(() => {
    if (!confirming) return;
    const t = setTimeout(() => setConfirming(false), 3000);
    return () => clearTimeout(t);
  }, [confirming]);
  return (
    <button
      onClick={() => { if (confirming) { onConfirm(); setConfirming(false); } else { setConfirming(true); } }}
      style={{
        background: confirming ? COLORS.danger : 'transparent',
        color: confirming ? COLORS.navy : COLORS.gold,
        border: `1px solid ${confirming ? COLORS.danger : COLORS.goldDim}`,
        padding: '10px 14px', minWidth: 44, minHeight: 44,
        fontSize: confirming ? 10 : 16, letterSpacing: confirming ? '0.15em' : '0',
        cursor: 'pointer', fontFamily: 'inherit', fontWeight: 500
      }}
    >{confirming ? 'CONFIRM?' : '×'}</button>
  );
}

export default function Dashboard() {
  const [data, setData] = useState(DEFAULT_DATA);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('overview');
  const [saveStatus, setSaveStatus] = useState({ phase: 'idle', message: '' });
  const [loadInfo, setLoadInfo] = useState({ source: 'none', postCount: 0, funnelCount: 0 });

  useEffect(() => {
    (async () => {
      const result = await loadData();
      if (result.data) {
        setData({ ...DEFAULT_DATA, ...result.data, researchInputs: { ...DEFAULT_RESEARCH, ...(result.data.researchInputs || {}) } });
        setLoadInfo({ source: result.source, postCount: result.data.posts?.length || 0, funnelCount: result.data.funnel?.length || 0 });
      } else {
        setLoadInfo({ source: 'none', postCount: 0, funnelCount: 0 });
      }
      setLoading(false);
    })();
  }, []);

  async function save(updater) {
    const newData = typeof updater === 'function' ? updater(data) : updater;
    const stamped = { ...newData, meta: { ...newData.meta, lastUpdated: new Date().toISOString() } };
    setData(stamped);
    setSaveStatus({ phase: 'saving', message: 'Saving…' });
    const result = await saveData(stamped);
    if (result.cloudOk && result.localOk) setSaveStatus({ phase: 'saved', message: '✓ Saved (cloud + local)' });
    else if (result.cloudOk) setSaveStatus({ phase: 'saved', message: '✓ Saved (cloud only)' });
    else if (result.localOk) setSaveStatus({ phase: 'partial', message: '⚠ Local only — cloud failed' });
    else setSaveStatus({ phase: 'error', message: '✗ Save failed everywhere' });
    setTimeout(() => setSaveStatus(s => ['saved', 'partial'].includes(s.phase) ? { phase: 'idle', message: '' } : s), 2500);
  }

  async function handleExport() {
    const r = await exportData(data);
    if (r.ok) setSaveStatus({ phase: 'saved', message: r.method === 'clipboard' ? '✓ Copied to clipboard' : '✓ Downloaded backup' });
    else setSaveStatus({ phase: 'error', message: 'Export failed: ' + r.error });
    setTimeout(() => setSaveStatus({ phase: 'idle', message: '' }), 2500);
  }

  if (loading) return <div style={{ background: COLORS.navy, color: COLORS.gold, minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', letterSpacing: '0.3em', fontSize: 12 }}>LOADING</div>;

  const tabs = [['overview', 'OVERVIEW'], ['posts', 'POSTS'], ['rotation', 'ROTATION'], ['tasks', 'TASKS'], ['funnel', 'FUNNEL'], ['forecast', 'FORECAST']];
  const statusColor = saveStatus.phase === 'error' ? COLORS.danger : saveStatus.phase === 'partial' ? COLORS.warning : saveStatus.phase === 'saved' ? COLORS.success : COLORS.textDim;
  const bannerColor = loadInfo.source === 'cloud' ? COLORS.success : loadInfo.source === 'local backup' || loadInfo.source === 'local (newer)' ? COLORS.warning : COLORS.warning;
  const bannerBg = loadInfo.source === 'cloud' ? 'rgba(140,192,132,0.08)' : 'rgba(212,165,116,0.08)';

  return (
    <div style={{ background: COLORS.navy, color: COLORS.text, minHeight: '100vh', fontFamily: 'Montserrat, system-ui, sans-serif' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@500;600;700&family=Montserrat:wght@300;400;500;600;700&display=swap');
        * { box-sizing: border-box; }
        input, textarea, select, button { font-family: inherit; }
        .wa-h { font-family: 'Cormorant Garamond', serif; font-weight: 600; letter-spacing: 0.02em; }
        .wa-num { font-family: 'Cormorant Garamond', serif; font-weight: 600; font-feature-settings: 'tnum'; }
        .wa-btn { background: transparent; color: ${COLORS.gold}; border: 1px solid ${COLORS.goldDim}; padding: 10px 14px; font-size: 11px; letter-spacing: 0.15em; text-transform: uppercase; cursor: pointer; transition: all 0.2s; font-weight: 500; min-height: 40px; }
        .wa-btn:hover { background: ${COLORS.goldFaint}; border-color: ${COLORS.gold}; }
        .wa-btn-primary { background: ${COLORS.gold}; color: ${COLORS.navy}; border-color: ${COLORS.gold}; }
        .wa-btn-primary:hover { background: ${COLORS.goldBright}; }
        .wa-input, .wa-textarea, .wa-select { background: ${COLORS.navy2}; color: ${COLORS.text}; border: 1px solid ${COLORS.border}; padding: 10px 12px; font-size: 14px; outline: none; transition: border-color 0.2s; width: 100%; font-family: inherit; min-height: 40px; }
        .wa-input:focus, .wa-textarea:focus, .wa-select:focus { border-color: ${COLORS.gold}; }
        .wa-textarea { resize: vertical; min-height: 90px; line-height: 1.5; }
        .wa-card { background: ${COLORS.navy2}; border: 1px solid ${COLORS.border}; padding: 20px; }
        .wa-label { font-size: 10px; letter-spacing: 0.2em; text-transform: uppercase; color: ${COLORS.textDim}; margin-bottom: 6px; font-weight: 500; }
        .wa-tab { background: transparent; border: none; color: ${COLORS.textDim}; padding: 14px 18px; font-size: 11px; letter-spacing: 0.2em; cursor: pointer; transition: color 0.2s; font-weight: 500; white-space: nowrap; }
        .wa-tab:hover { color: ${COLORS.text}; }
        .wa-tab-active { color: ${COLORS.gold}; border-bottom: 1px solid ${COLORS.gold}; }
        .tabs-wrap { position: relative; }
        .tabs-wrap::after { content: ''; position: absolute; top: 0; right: 0; width: 32px; height: 100%; background: linear-gradient(to right, transparent, ${COLORS.navy}); pointer-events: none; }
        table { width: 100%; border-collapse: collapse; }
        th { text-align: left; font-size: 10px; letter-spacing: 0.15em; text-transform: uppercase; color: ${COLORS.textDim}; padding: 10px 6px; border-bottom: 1px solid ${COLORS.border}; font-weight: 500; }
        td { padding: 10px 6px; font-size: 13px; border-bottom: 1px solid ${COLORS.goldFaint}; vertical-align: middle; }
        .entry-row { display: grid; grid-template-columns: var(--cols); gap: 12px; align-items: end; }
        .stack-cards { display: grid; grid-template-columns: var(--cols, repeat(4, 1fr)); gap: 12px; }
        .modal-comp-row { display: grid; grid-template-columns: repeat(5, 1fr); gap: 8px; padding: 8px 0; border-bottom: 1px solid ${COLORS.goldFaint}; }
        .modal-comp-row > div .wa-label { display: none; }
        @media (max-width: 720px) {
          .entry-row { grid-template-columns: 1fr !important; }
          .stack-cards { grid-template-columns: 1fr !important; }
          .wa-tab { padding: 12px 14px; font-size: 10px; }
          th, td { padding: 8px 4px; font-size: 11px; }
          .wa-card { padding: 14px; }
          .modal-comp-row { grid-template-columns: 1fr; gap: 8px; padding: 16px; border: 1px solid ${COLORS.border}; margin-bottom: 12px; }
          .modal-comp-row > div .wa-label { display: block; }
        }
      `}</style>

      <header style={{ borderBottom: `1px solid ${COLORS.border}`, padding: '20px 16px 14px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <div style={{ fontSize: 10, letterSpacing: '0.3em', color: COLORS.gold, marginBottom: 6 }}>@THE_WEALTHALCHEMY · v4</div>
            <h1 className="wa-h" style={{ margin: 0, fontSize: 28, color: COLORS.cream, lineHeight: 1 }}>Operations Dashboard</h1>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div className="wa-label">Status</div>
            <div style={{ fontSize: 12, color: statusColor, marginBottom: 6, minHeight: 16 }}>{saveStatus.message || 'Idle'}</div>
            <button className="wa-btn" style={{ minHeight: 32, padding: '6px 10px', fontSize: 10 }} onClick={handleExport}>Export Backup</button>
          </div>
        </div>
        <div style={{ marginTop: 14, padding: 10, background: bannerBg, border: `1px solid ${bannerColor}`, fontSize: 12, color: bannerColor }}>
          {loadInfo.source === 'cloud' && <>● Loaded from cloud storage: {loadInfo.postCount} posts, {loadInfo.funnelCount} funnel rows.</>}
          {loadInfo.source === 'local backup' && <>● Loaded from local browser backup ({loadInfo.postCount} posts, {loadInfo.funnelCount} funnel rows). Cloud storage unavailable — data is safe on this device but won't sync to other chats until cloud recovers.</>}
          {loadInfo.source === 'local (newer)' && <>● Loaded from local backup (more recent than cloud): {loadInfo.postCount} posts, {loadInfo.funnelCount} funnel rows.</>}
          {loadInfo.source === 'none' && <>● No data found in cloud or local. Showing defaults. Enter data and it will save to both layers.</>}
        </div>
      </header>

      <div className="tabs-wrap" style={{ borderBottom: `1px solid ${COLORS.border}`, padding: '0 8px', display: 'flex', overflowX: 'auto' }}>
        {tabs.map(([id, label]) => (
          <button key={id} className={`wa-tab ${tab === id ? 'wa-tab-active' : ''}`} onClick={() => setTab(id)}>{label}</button>
        ))}
      </div>

      <main style={{ padding: '20px 12px', maxWidth: 1400, margin: '0 auto' }}>
        {tab === 'overview' && <Overview data={data} save={save} />}
        {tab === 'posts' && <Posts data={data} save={save} />}
        {tab === 'rotation' && <Rotation data={data} save={save} />}
        {tab === 'tasks' && <Tasks data={data} save={save} />}
        {tab === 'funnel' && <Funnel data={data} save={save} />}
        {tab === 'forecast' && <Forecast data={data} save={save} />}
      </main>
    </div>
  );
}

function StatCard({ label, value, sub }) {
  return (
    <div className="wa-card" style={{ padding: 16 }}>
      <div className="wa-label">{label}</div>
      <div className="wa-num" style={{ fontSize: 28, color: COLORS.cream, lineHeight: 1, margin: '6px 0 4px' }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: COLORS.textDim }}>{sub}</div>}
    </div>
  );
}

function Overview({ data, save }) {
  const [editingBrief, setEditingBrief] = useState(false);
  const valid = data.posts.filter(p => p.views > 0);
  const top = [...valid].sort((a, b) => b.views - a.views).slice(0, 3);
  const avgWatch = valid.length ? (valid.reduce((s, p) => s + p.watchTime, 0) / valid.length).toFixed(1) : '0';
  const openTasks = data.tasks.filter(t => !t.completed).length;
  const highPri = data.tasks.filter(t => !t.completed && t.priority === 'high').length;
  const latest = data.funnel[data.funnel.length - 1] || {};
  const b = data.activeBrief;

  return (
    <div>
      <div className="wa-card" style={{ marginBottom: 16, borderColor: COLORS.gold, position: 'relative' }}>
        <div style={{ position: 'absolute', top: -10, left: 16, background: COLORS.navy, padding: '0 12px', fontSize: 9, letterSpacing: '0.3em', color: COLORS.gold }}>ACTIVE BRIEF</div>
        <div style={{ position: 'absolute', top: 12, right: 12 }}>
          <button className="wa-btn" style={{ minHeight: 32, padding: '6px 10px', fontSize: 10 }} onClick={() => setEditingBrief(true)}>Edit</button>
        </div>
        <h2 className="wa-h" style={{ margin: '0 60px 8px 0', fontSize: 22, color: COLORS.cream }}>{b.title}</h2>
        <div style={{ fontSize: 13, color: COLORS.gold, marginBottom: 14, fontStyle: 'italic' }}>{b.targetLine}</div>
        <div style={{ fontSize: 12, color: COLORS.textDim, lineHeight: 1.6, marginBottom: 14 }}>{b.notes}</div>
        <div className="stack-cards" style={{ '--cols': 'repeat(3, 1fr)' }}>
          <div><div className="wa-label">Post Slot</div><div className="wa-num" style={{ fontSize: 16, color: COLORS.gold }}>{fmtDate(b.postDate)}</div><div style={{ fontSize: 11, color: COLORS.textDim }}>{b.postTime} · {b.duration}</div></div>
          <div><div className="wa-label">Audio</div><div style={{ fontSize: 12 }}>{b.audio}</div></div>
          <div><div className="wa-label">Status</div><div style={{ fontSize: 12, color: COLORS.warning }}>{b.status}</div></div>
        </div>
      </div>

      <div className="stack-cards" style={{ marginBottom: 16 }}>
        <StatCard label="Followers" value={latest.followers || 0} />
        <StatCard label="Avg Watch" value={`${avgWatch}s`} />
        <StatCard label="Open Tasks" value={openTasks} sub={`${highPri} high priority`} />
        <StatCard label="Free DLs" value={latest.freeDownloads || 0} sub="Gumroad" />
      </div>

      <div className="wa-card">
        <div className="wa-label" style={{ marginBottom: 14 }}>Top Performing Posts</div>
        {top.length === 0 ? (
          <div style={{ color: COLORS.textDim, fontSize: 13, padding: '16px 0' }}>No metrics entered yet. Go to POSTS tab.</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table>
              <thead><tr><th>Date</th><th>Figure</th><th>Title</th><th>Views</th><th>Watch</th><th>Share %</th></tr></thead>
              <tbody>{top.map(p => (
                <tr key={p.id}>
                  <td style={{ whiteSpace: 'nowrap' }}>{fmtDate(p.date)}</td>
                  <td style={{ color: COLORS.gold }}>{p.figure}</td>
                  <td>{p.title}</td>
                  <td className="wa-num" style={{ fontSize: 16 }}>{p.views.toLocaleString()}</td>
                  <td>{p.watchTime}s</td>
                  <td>{p.shareRate}%</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        )}
      </div>

      {editingBrief && <EditBriefModal initial={b} onSave={brief => save({ ...data, activeBrief: brief })} onClose={() => setEditingBrief(false)} />}
    </div>
  );
}

function EditBriefModal({ initial, onSave, onClose }) {
  const [b, setB] = useState(initial);
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 1000, overflowY: 'auto', padding: 16, fontFamily: 'Montserrat, sans-serif' }}>
      <div onClick={e => e.stopPropagation()} style={{ maxWidth: 700, margin: '20px auto', background: COLORS.navy2, border: `1px solid ${COLORS.gold}`, padding: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 8 }}>
          <h2 className="wa-h" style={{ margin: 0, fontSize: 22, color: COLORS.cream }}>Edit Active Brief</h2>
          <button className="wa-btn" onClick={onClose}>× Close</button>
        </div>
        <div style={{ marginBottom: 14 }}><div className="wa-label">Title</div><input className="wa-input" value={b.title} onChange={e => setB({ ...b, title: e.target.value })} /></div>
        <div style={{ marginBottom: 14 }}><div className="wa-label">Figure</div><input className="wa-input" value={b.figure} placeholder="e.g. Lynch, Buffett" onChange={e => setB({ ...b, figure: e.target.value })} /></div>
        <div style={{ marginBottom: 14 }}><div className="wa-label">Target Line</div><input className="wa-input" value={b.targetLine} onChange={e => setB({ ...b, targetLine: e.target.value })} /></div>
        <div className="entry-row" style={{ '--cols': 'repeat(2, 1fr)', marginBottom: 14 }}>
          <div><div className="wa-label">Post Date</div><input className="wa-input" type="date" value={b.postDate} onChange={e => setB({ ...b, postDate: e.target.value })} /></div>
          <div><div className="wa-label">Post Time</div><input className="wa-input" value={b.postTime} placeholder="e.g. 21:00 CET" onChange={e => setB({ ...b, postTime: e.target.value })} /></div>
        </div>
        <div className="entry-row" style={{ '--cols': 'repeat(2, 1fr)', marginBottom: 14 }}>
          <div><div className="wa-label">Duration</div><input className="wa-input" value={b.duration} placeholder="e.g. 18-22 sec" onChange={e => setB({ ...b, duration: e.target.value })} /></div>
          <div><div className="wa-label">Audio</div><input className="wa-input" value={b.audio} onChange={e => setB({ ...b, audio: e.target.value })} /></div>
        </div>
        <div style={{ marginBottom: 14 }}><div className="wa-label">Status</div><input className="wa-input" value={b.status} placeholder="e.g. Awaiting clip / In CapCut / Posted" onChange={e => setB({ ...b, status: e.target.value })} /></div>
        <div style={{ marginBottom: 20 }}><div className="wa-label">Notes</div><textarea className="wa-textarea" value={b.notes} onChange={e => setB({ ...b, notes: e.target.value })} style={{ minHeight: 100 }} /></div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, paddingTop: 16, borderTop: `1px solid ${COLORS.border}`, flexWrap: 'wrap' }}>
          <button className="wa-btn" onClick={onClose}>Cancel</button>
          <button className="wa-btn wa-btn-primary" onClick={() => { onSave(b); onClose(); }}>Save Brief</button>
        </div>
      </div>
    </div>
  );
}

function Posts({ data, save }) {
  const [adding, setAdding] = useState(false);
  const blank = { date: todayISO(), platform: 'Instagram', figure: '', format: 'Curation', title: '', views: 0, watchTime: 0, saveRate: 0, shareRate: 0 };
  const [draft, setDraft] = useState(blank);
  const addPost = () => { if (!draft.title.trim() && !draft.figure.trim()) return; save({ ...data, posts: [{ ...draft, id: 'p' + Date.now() }, ...data.posts] }); setDraft(blank); setAdding(false); };
  const updatePost = (id, field, value) => save({ ...data, posts: data.posts.map(p => p.id === id ? { ...p, [field]: value } : p) });
  const deletePost = id => save({ ...data, posts: data.posts.filter(p => p.id !== id) });
  const parseDec = v => { if (v === '' || v == null) return 0; const n = parseFloat(String(v).replace(',', '.')); return isNaN(n) ? 0 : n; };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, flexWrap: 'wrap', gap: 12 }}>
        <h2 className="wa-h" style={{ margin: 0, fontSize: 22, color: COLORS.cream }}>Post Performance</h2>
        <button className="wa-btn wa-btn-primary" onClick={() => setAdding(!adding)}>{adding ? 'Cancel' : '+ Log Post'}</button>
      </div>

      {adding && (
        <div className="wa-card" style={{ marginBottom: 16 }}>
          <div className="wa-label" style={{ marginBottom: 10 }}>New Post Entry</div>
          <div className="entry-row" style={{ '--cols': 'repeat(2, 1fr)', marginBottom: 12 }}>
            <div><div className="wa-label">Date</div><input className="wa-input" type="date" value={draft.date} onChange={e => setDraft({ ...draft, date: e.target.value })} /></div>
            <div><div className="wa-label">Platform</div><select className="wa-select" value={draft.platform} onChange={e => setDraft({ ...draft, platform: e.target.value })}><option>Instagram</option><option>YouTube</option></select></div>
          </div>
          <div className="entry-row" style={{ '--cols': 'repeat(2, 1fr)', marginBottom: 12 }}>
            <div><div className="wa-label">Figure</div><input className="wa-input" value={draft.figure} placeholder="Lynch, Buffett" onChange={e => setDraft({ ...draft, figure: e.target.value })} /></div>
            <div><div className="wa-label">Format</div><select className="wa-select" value={draft.format} onChange={e => setDraft({ ...draft, format: e.target.value })}><option>Curation</option><option>Stream</option><option>Carousel</option><option>Filler</option></select></div>
          </div>
          <div style={{ marginBottom: 12 }}><div className="wa-label">Title</div><input className="wa-input" value={draft.title} placeholder="Short descriptor" onChange={e => setDraft({ ...draft, title: e.target.value })} /></div>
          <div className="entry-row" style={{ '--cols': 'repeat(2, 1fr)', marginBottom: 8 }}>
            <div><div className="wa-label">Views</div><input className="wa-input" type="text" inputMode="numeric" value={draft.views} onChange={e => setDraft({ ...draft, views: parseInt(e.target.value.replace(/\D/g, '')) || 0 })} /></div>
            <div><div className="wa-label">Watch Time (sec)</div><input className="wa-input" type="text" inputMode="numeric" value={draft.watchTime} onChange={e => setDraft({ ...draft, watchTime: parseInt(e.target.value.replace(/\D/g, '')) || 0 })} /></div>
          </div>
          <div className="entry-row" style={{ '--cols': 'repeat(2, 1fr)', marginBottom: 16 }}>
            <div><div className="wa-label">Save % (1,1 or 1.1)</div><input className="wa-input" type="text" inputMode="decimal" value={draft.saveRate} onChange={e => setDraft({ ...draft, saveRate: parseDec(e.target.value) })} /></div>
            <div><div className="wa-label">Share % (1,1 or 1.1)</div><input className="wa-input" type="text" inputMode="decimal" value={draft.shareRate} onChange={e => setDraft({ ...draft, shareRate: parseDec(e.target.value) })} /></div>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button className="wa-btn wa-btn-primary" onClick={addPost}>Save Post</button>
            <button className="wa-btn" onClick={() => { setDraft(blank); setAdding(false); }}>Cancel</button>
          </div>
        </div>
      )}

      <div className="wa-card">
        <div style={{ fontSize: 11, color: COLORS.textDim, marginBottom: 10 }}>Tap a cell, edit, tap away to save. Decimal: use comma or period.</div>
        <div style={{ overflowX: 'auto' }}>
          <table>
            <thead><tr><th>Date</th><th>Plat</th><th>Figure</th><th>Format</th><th>Title</th><th>Views</th><th>Watch</th><th>Save %</th><th>Share %</th><th></th></tr></thead>
            <tbody>{data.posts.map(p => (
              <tr key={p.id}>
                <td style={{ whiteSpace: 'nowrap' }}>{fmtDate(p.date)}</td>
                <td style={{ fontSize: 11, color: COLORS.textDim }}>{p.platform}</td>
                <td style={{ color: COLORS.gold }}>{p.figure}</td>
                <td style={{ fontSize: 11 }}>{p.format}</td>
                <td>{p.title}</td>
                <td><IntInput value={p.views} onSave={v => updatePost(p.id, 'views', v)} style={{ width: 80 }} /></td>
                <td><IntInput value={p.watchTime} onSave={v => updatePost(p.id, 'watchTime', v)} style={{ width: 60 }} /></td>
                <td><DecimalInput value={p.saveRate} onSave={v => updatePost(p.id, 'saveRate', v)} style={{ width: 70 }} /></td>
                <td><DecimalInput value={p.shareRate} onSave={v => updatePost(p.id, 'shareRate', v)} style={{ width: 70 }} /></td>
                <td><DeleteBtn onConfirm={() => deletePost(p.id)} /></td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function Rotation({ data, save }) {
  const figures = Object.keys(data.rotation);
  const updateLast = (f, date) => save({ ...data, rotation: { ...data.rotation, [f]: { ...data.rotation[f], lastUsed: date || null } } });
  const getStatus = r => { if (!r.lastUsed) return { label: 'AVAILABLE', color: COLORS.success, days: '—' }; const d = daysSince(r.lastUsed); return d >= r.cooldownDays ? { label: 'AVAILABLE', color: COLORS.success, days: d } : { label: 'COOLDOWN', color: COLORS.warning, days: d }; };
  return (
    <div>
      <h2 className="wa-h" style={{ margin: '0 0 6px', fontSize: 22, color: COLORS.cream }}>Speaker Rotation</h2>
      <p style={{ color: COLORS.textDim, fontSize: 13, marginTop: 0, marginBottom: 16 }}>AVAILABLE = safe to use in the next post.</p>
      <div className="wa-card">
        <div style={{ overflowX: 'auto' }}>
          <table>
            <thead><tr><th>Figure</th><th>Last</th><th>Days</th><th>CD</th><th>Status</th><th>Update</th></tr></thead>
            <tbody>{figures.map(f => {
              const r = data.rotation[f]; const s = getStatus(r);
              return <tr key={f}>
                <td className="wa-h" style={{ fontSize: 15, color: COLORS.cream, whiteSpace: 'nowrap' }}>{f}</td>
                <td style={{ whiteSpace: 'nowrap' }}>{r.lastUsed ? fmtDate(r.lastUsed) : '—'}</td>
                <td className="wa-num" style={{ fontSize: 16 }}>{s.days}</td>
                <td style={{ color: COLORS.textDim }}>{r.cooldownDays}d</td>
                <td><span style={{ color: s.color, fontSize: 10, letterSpacing: '0.2em' }}>{s.label}</span></td>
                <td><input className="wa-input" style={{ width: 140 }} type="date" value={r.lastUsed || ''} onChange={e => updateLast(f, e.target.value)} /></td>
              </tr>;
            })}</tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function Tasks({ data, save }) {
  const [draft, setDraft] = useState({ text: '', priority: 'medium', due: '' });
  const addTask = () => { if (!draft.text.trim()) return; save({ ...data, tasks: [...data.tasks, { ...draft, id: 't' + Date.now(), completed: false, due: draft.due || null }] }); setDraft({ text: '', priority: 'medium', due: '' }); };
  const toggle = id => save({ ...data, tasks: data.tasks.map(t => t.id === id ? { ...t, completed: !t.completed } : t) });
  const del = id => save({ ...data, tasks: data.tasks.filter(t => t.id !== id) });
  const pColor = { high: COLORS.danger, medium: COLORS.warning, low: COLORS.textDim };
  const sorted = [...data.tasks].sort((a, b) => a.completed !== b.completed ? (a.completed ? 1 : -1) : ({ high: 0, medium: 1, low: 2 }[a.priority] - { high: 0, medium: 1, low: 2 }[b.priority]));
  return (
    <div>
      <h2 className="wa-h" style={{ margin: '0 0 16px', fontSize: 22, color: COLORS.cream }}>Tasks</h2>
      <div className="wa-card" style={{ marginBottom: 14 }}>
        <div className="entry-row" style={{ '--cols': '3fr 1fr 1fr auto' }}>
          <div><div className="wa-label">New task</div><input className="wa-input" value={draft.text} placeholder="What needs doing" onChange={e => setDraft({ ...draft, text: e.target.value })} onKeyDown={e => e.key === 'Enter' && addTask()} /></div>
          <div><div className="wa-label">Priority</div><select className="wa-select" value={draft.priority} onChange={e => setDraft({ ...draft, priority: e.target.value })}><option value="high">High</option><option value="medium">Medium</option><option value="low">Low</option></select></div>
          <div><div className="wa-label">Due</div><input className="wa-input" type="date" value={draft.due} onChange={e => setDraft({ ...draft, due: e.target.value })} /></div>
          <button className="wa-btn wa-btn-primary" onClick={addTask}>Add</button>
        </div>
      </div>
      <div className="wa-card">{sorted.map(t => (
        <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: `1px solid ${COLORS.goldFaint}`, opacity: t.completed ? 0.4 : 1, flexWrap: 'wrap' }}>
          <input type="checkbox" checked={t.completed} onChange={() => toggle(t.id)} style={{ accentColor: COLORS.gold, width: 20, height: 20, cursor: 'pointer' }} />
          <div style={{ flex: 1, minWidth: 180, textDecoration: t.completed ? 'line-through' : 'none', fontSize: 13 }}>{t.text}</div>
          <div style={{ fontSize: 9, letterSpacing: '0.2em', color: pColor[t.priority] }}>{t.priority.toUpperCase()}</div>
          <div style={{ fontSize: 11, color: COLORS.textDim }}>{t.due ? fmtDate(t.due) : ''}</div>
          <DeleteBtn onConfirm={() => del(t.id)} />
        </div>
      ))}</div>
    </div>
  );
}

function LineChartSVG({ data, height = 240 }) {
  if (!data || data.length < 2) return null;
  const w = 800, h = height, pad = { l: 50, r: 20, t: 20, b: 30 };
  const xMax = data.length - 1;
  const maxF = Math.max(...data.map(d => d.followers), 1), maxD = Math.max(...data.map(d => d.downloads), 1), maxR = Math.max(...data.map(d => d.revenue), 1);
  const xS = i => pad.l + (i / xMax) * (w - pad.l - pad.r);
  const yS = (v, m) => h - pad.b - (v / m) * (h - pad.t - pad.b);
  const path = (k, m) => data.map((d, i) => `${i === 0 ? 'M' : 'L'} ${xS(i)} ${yS(d[k], m)}`).join(' ');
  return (
    <svg viewBox={`0 0 ${w} ${h}`} style={{ width: '100%' }}>
      {[0, 0.25, 0.5, 0.75, 1].map(t => <line key={t} x1={pad.l} x2={w - pad.r} y1={pad.t + t * (h - pad.t - pad.b)} y2={pad.t + t * (h - pad.t - pad.b)} stroke={COLORS.goldFaint} strokeDasharray="3 3" />)}
      <path d={path('followers', maxF)} stroke={COLORS.gold} strokeWidth="2" fill="none" />
      <path d={path('downloads', maxD)} stroke={COLORS.success} strokeWidth="2" fill="none" />
      <path d={path('revenue', maxR)} stroke={COLORS.warning} strokeWidth="2" fill="none" />
      {data.map((d, i) => <text key={i} x={xS(i)} y={h - 10} fill={COLORS.textDim} fontSize="10" textAnchor="middle">{d.date}</text>)}
    </svg>
  );
}

function Funnel({ data, save }) {
  const blank = { weekOf: todayISO(), followers: 0, freeDownloads: 0, sales8: 0, sales37: 0, newsletterSubs: 0 };
  const [draft, setDraft] = useState(blank);
  const addSnap = () => { save({ ...data, funnel: [...data.funnel, { ...draft, id: 'f' + Date.now() }] }); setDraft(blank); };
  const updSnap = (id, field, value) => save({ ...data, funnel: data.funnel.map(f => f.id === id ? { ...f, [field]: value } : f) });
  const delSnap = id => save({ ...data, funnel: data.funnel.filter(f => f.id !== id) });
  const sorted = [...data.funnel].sort((a, b) => new Date(a.weekOf) - new Date(b.weekOf));
  const chartData = sorted.map(f => ({ date: fmtDate(f.weekOf).split(' ').slice(0, 2).join(' '), followers: f.followers, downloads: f.freeDownloads, revenue: f.sales8 * 8 + f.sales37 * 37 }));

  return (
    <div>
      <h2 className="wa-h" style={{ margin: '0 0 6px', fontSize: 22, color: COLORS.cream }}>Funnel Snapshot</h2>
      <p style={{ color: COLORS.textDim, fontSize: 13, marginTop: 0, marginBottom: 16 }}>One row every Sunday. Five numbers.</p>
      <div className="wa-card" style={{ marginBottom: 14 }}>
        <div className="wa-label" style={{ marginBottom: 10 }}>New Weekly Snapshot</div>
        <div className="entry-row" style={{ '--cols': 'repeat(3, 1fr)', marginBottom: 10 }}>
          <div><div className="wa-label">Week of</div><input className="wa-input" type="date" value={draft.weekOf} onChange={e => setDraft({ ...draft, weekOf: e.target.value })} /></div>
          <div><div className="wa-label">Followers</div><input className="wa-input" type="text" inputMode="numeric" value={draft.followers} onChange={e => setDraft({ ...draft, followers: parseInt(e.target.value.replace(/\D/g, '')) || 0 })} /></div>
          <div><div className="wa-label">Free DLs</div><input className="wa-input" type="text" inputMode="numeric" value={draft.freeDownloads} onChange={e => setDraft({ ...draft, freeDownloads: parseInt(e.target.value.replace(/\D/g, '')) || 0 })} /></div>
        </div>
        <div className="entry-row" style={{ '--cols': 'repeat(3, 1fr)', marginBottom: 14 }}>
          <div><div className="wa-label">€8 sales</div><input className="wa-input" type="text" inputMode="numeric" value={draft.sales8} onChange={e => setDraft({ ...draft, sales8: parseInt(e.target.value.replace(/\D/g, '')) || 0 })} /></div>
          <div><div className="wa-label">€37 sales</div><input className="wa-input" type="text" inputMode="numeric" value={draft.sales37} onChange={e => setDraft({ ...draft, sales37: parseInt(e.target.value.replace(/\D/g, '')) || 0 })} /></div>
          <div><div className="wa-label">Newsletter</div><input className="wa-input" type="text" inputMode="numeric" value={draft.newsletterSubs} onChange={e => setDraft({ ...draft, newsletterSubs: parseInt(e.target.value.replace(/\D/g, '')) || 0 })} /></div>
        </div>
        <button className="wa-btn wa-btn-primary" onClick={addSnap}>Save Snapshot</button>
      </div>

      {chartData.length > 1 && <div className="wa-card" style={{ marginBottom: 14 }}><div className="wa-label" style={{ marginBottom: 14 }}>Growth</div><LineChartSVG data={chartData} /></div>}

      <div className="wa-card" style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 11, color: COLORS.textDim, marginBottom: 10 }}>Tap to edit, tap away to save.</div>
        <div style={{ overflowX: 'auto' }}>
          <table>
            <thead><tr><th>Week</th><th>Foll</th><th>DLs</th><th>€8</th><th>€37</th><th>News</th><th>Rev</th><th></th></tr></thead>
            <tbody>{sorted.slice().reverse().map(f => (
              <tr key={f.id}>
                <td><input className="wa-input" style={{ width: 130 }} type="date" value={f.weekOf} onChange={e => updSnap(f.id, 'weekOf', e.target.value)} /></td>
                <td><IntInput value={f.followers} onSave={v => updSnap(f.id, 'followers', v)} style={{ width: 80 }} /></td>
                <td><IntInput value={f.freeDownloads} onSave={v => updSnap(f.id, 'freeDownloads', v)} style={{ width: 70 }} /></td>
                <td><IntInput value={f.sales8} onSave={v => updSnap(f.id, 'sales8', v)} style={{ width: 60 }} /></td>
                <td><IntInput value={f.sales37} onSave={v => updSnap(f.id, 'sales37', v)} style={{ width: 60 }} /></td>
                <td><IntInput value={f.newsletterSubs} onSave={v => updSnap(f.id, 'newsletterSubs', v)} style={{ width: 70 }} /></td>
                <td className="wa-num" style={{ fontSize: 15, color: COLORS.gold }}>€{(f.sales8 * 8 + f.sales37 * 37).toLocaleString()}</td>
                <td><DeleteBtn onConfirm={() => delSnap(f.id)} /></td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      </div>

      <ResearchInputs data={data} save={save} />
    </div>
  );
}

function ResearchInputs({ data, save }) {
  const [expanded, setExpanded] = useState(false);
  const [editing, setEditing] = useState(false);
  const r = data.researchInputs || DEFAULT_RESEARCH;
  const compCount = r.competitorReels.filter(c => c.account?.trim()).length;
  return (
    <>
      <div className="wa-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10, marginBottom: 16 }}>
          <div>
            <div className="wa-label">Research Inputs</div>
            <div style={{ fontSize: 13, color: COLORS.gold, marginTop: 4 }}>Week of: {r.weekOf ? fmtDate(r.weekOf) : <span style={{ color: COLORS.textDim }}>Not yet logged</span>}</div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="wa-btn" onClick={() => setExpanded(!expanded)}>{expanded ? '▲' : '▼'}</button>
            <button className="wa-btn wa-btn-primary" onClick={() => setEditing(true)}>Refresh</button>
          </div>
        </div>
        <div className="stack-cards">
          <StatCard label="Competitors" value={`${compCount}/5`} sub={compCount === 5 ? 'Complete' : `${5 - compCount} empty`} />
          <StatCard label="Audience" value={wordCount(r.audienceLanguage)} sub="words" />
          <StatCard label="Trends" value={wordCount(r.trendSignals)} sub="words" />
          <StatCard label="Saves" value={r.personalSaves.length} sub="reels" />
        </div>
        {expanded && <ResearchExpanded r={r} />}
      </div>
      {editing && <ResearchModal initial={r} onSave={u => { save({ ...data, researchInputs: { ...u, weekOf: sundayOf() } }); setEditing(false); }} onClose={() => setEditing(false)} />}
    </>
  );
}

function ResearchExpanded({ r }) {
  return (
    <div style={{ marginTop: 20, borderTop: `1px solid ${COLORS.border}`, paddingTop: 18 }}>
      <div style={{ marginBottom: 18 }}>
        <div className="wa-label" style={{ marginBottom: 10 }}>Competitor Reels</div>
        {r.competitorReels.every(c => !c.account?.trim()) ? <div style={{ color: COLORS.textDim, fontSize: 12 }}>None logged yet.</div> : (
          <div style={{ overflowX: 'auto' }}>
            <table><thead><tr><th>Account</th><th>Hook</th><th>Format</th><th>Views</th><th>What Worked</th></tr></thead>
              <tbody>{r.competitorReels.filter(c => c.account?.trim()).map((c, i) => <tr key={i}><td style={{ color: COLORS.gold }}>{c.account}</td><td>{c.hook}</td><td style={{ fontSize: 11 }}>{c.format}</td><td className="wa-num">{c.estViews}</td><td style={{ fontSize: 12 }}>{c.whatWorked}</td></tr>)}</tbody>
            </table>
          </div>
        )}
      </div>
      <div style={{ marginBottom: 18 }}>
        <div className="wa-label" style={{ marginBottom: 8 }}>Audience Language</div>
        {r.audienceLanguage?.trim() ? <div style={{ background: COLORS.navy3, border: `1px solid ${COLORS.goldFaint}`, padding: 14, fontSize: 13, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{r.audienceLanguage}</div> : <div style={{ color: COLORS.textDim, fontSize: 12 }}>None logged yet.</div>}
      </div>
      <div style={{ marginBottom: 18 }}>
        <div className="wa-label" style={{ marginBottom: 8 }}>Trend Signals</div>
        {r.trendSignals?.trim() ? <div style={{ background: COLORS.navy3, border: `1px solid ${COLORS.goldFaint}`, padding: 14, fontSize: 13, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{r.trendSignals}</div> : <div style={{ color: COLORS.textDim, fontSize: 12 }}>None logged yet.</div>}
      </div>
      <div>
        <div className="wa-label" style={{ marginBottom: 10 }}>Personal Saves</div>
        {r.personalSaves.length === 0 ? <div style={{ color: COLORS.textDim, fontSize: 12 }}>None logged yet.</div> : (
          <div style={{ overflowX: 'auto' }}>
            <table><thead><tr><th>Hook</th><th>Caption</th><th>Why Saved</th></tr></thead>
              <tbody>{r.personalSaves.map((s, i) => <tr key={i}><td style={{ fontSize: 12 }}>{s.hook}</td><td style={{ fontSize: 12, color: COLORS.textDim, maxWidth: 320 }}>{s.caption}</td><td style={{ fontSize: 12, color: COLORS.gold }}>{s.whySaved}</td></tr>)}</tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function ResearchModal({ initial, onSave, onClose }) {
  const [comps, setComps] = useState(initial.competitorReels.length === 5 ? initial.competitorReels : [...initial.competitorReels, ...Array(5 - initial.competitorReels.length).fill(EMPTY_COMP)].slice(0, 5));
  const [audience, setAudience] = useState(initial.audienceLanguage || '');
  const [trends, setTrends] = useState(initial.trendSignals || '');
  const [saves, setSaves] = useState(initial.personalSaves.length ? initial.personalSaves : []);
  const uC = (i, f, v) => setComps(comps.map((c, j) => j === i ? { ...c, [f]: v } : c));
  const uS = (i, f, v) => setSaves(saves.map((s, j) => j === i ? { ...s, [f]: v } : s));
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 1000, overflowY: 'auto', padding: 12, fontFamily: 'Montserrat, sans-serif' }}>
      <div onClick={e => e.stopPropagation()} style={{ maxWidth: 900, margin: '12px auto', background: COLORS.navy2, border: `1px solid ${COLORS.gold}`, padding: 18 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
          <div>
            <h2 className="wa-h" style={{ margin: 0, fontSize: 22, color: COLORS.cream }}>Refresh Research Inputs</h2>
            <div style={{ fontSize: 12, color: COLORS.gold, marginTop: 4 }}>Week of: {fmtDate(sundayOf())}</div>
          </div>
          <button className="wa-btn" onClick={onClose}>× Close</button>
        </div>
        <div style={{ marginBottom: 20 }}>
          <div className="wa-label" style={{ marginBottom: 10 }}>Competitor Reels (5)</div>
          {comps.map((c, i) => (
            <div key={i} className="modal-comp-row">
              <div><div className="wa-label">Account</div><input className="wa-input" value={c.account} placeholder="@handle" onChange={e => uC(i, 'account', e.target.value)} /></div>
              <div><div className="wa-label">Hook</div><input className="wa-input" value={c.hook} onChange={e => uC(i, 'hook', e.target.value)} /></div>
              <div><div className="wa-label">Format</div><input className="wa-input" value={c.format} placeholder="curation/stream" onChange={e => uC(i, 'format', e.target.value)} /></div>
              <div><div className="wa-label">Views</div><input className="wa-input" value={c.estViews} placeholder="45k" onChange={e => uC(i, 'estViews', e.target.value)} /></div>
              <div><div className="wa-label">What Worked</div><input className="wa-input" value={c.whatWorked} onChange={e => uC(i, 'whatWorked', e.target.value)} /></div>
            </div>
          ))}
        </div>
        <div style={{ marginBottom: 20 }}>
          <div className="wa-label" style={{ marginBottom: 8 }}>Audience Language (verbatim DMs/comments)</div>
          <textarea className="wa-textarea" value={audience} onChange={e => setAudience(e.target.value)} placeholder="Paste verbatim DMs and comments" style={{ minHeight: 140 }} />
          <div style={{ fontSize: 10, color: COLORS.textDim, marginTop: 4 }}>{wordCount(audience)} words</div>
        </div>
        <div style={{ marginBottom: 20 }}>
          <div className="wa-label" style={{ marginBottom: 8 }}>Trend Signals (Google Trends)</div>
          <textarea className="wa-textarea" value={trends} onChange={e => setTrends(e.target.value)} placeholder="Paste rising queries / breakout terms" style={{ minHeight: 120 }} />
          <div style={{ fontSize: 10, color: COLORS.textDim, marginTop: 4 }}>{wordCount(trends)} words</div>
        </div>
        <div style={{ marginBottom: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <div className="wa-label" style={{ marginBottom: 0 }}>Personal Saves</div>
            <button className="wa-btn" onClick={() => setSaves([...saves, { hook: '', caption: '', whySaved: '' }])}>+ Add</button>
          </div>
          {saves.length === 0 ? <div style={{ color: COLORS.textDim, fontSize: 12, padding: '8px 0' }}>None yet.</div> : saves.map((s, i) => (
            <div key={i} style={{ padding: 10, border: `1px solid ${COLORS.border}`, marginBottom: 8 }}>
              <div className="wa-label">Hook</div><input className="wa-input" value={s.hook} onChange={e => uS(i, 'hook', e.target.value)} style={{ marginBottom: 8 }} />
              <div className="wa-label">Caption</div><input className="wa-input" value={s.caption} onChange={e => uS(i, 'caption', e.target.value)} style={{ marginBottom: 8 }} />
              <div className="wa-label">Why Saved</div><input className="wa-input" value={s.whySaved} onChange={e => uS(i, 'whySaved', e.target.value)} style={{ marginBottom: 8 }} />
              <DeleteBtn onConfirm={() => setSaves(saves.filter((_, j) => j !== i))} />
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, paddingTop: 14, borderTop: `1px solid ${COLORS.border}`, flexWrap: 'wrap' }}>
          <button className="wa-btn" onClick={onClose}>Cancel</button>
          <button className="wa-btn wa-btn-primary" onClick={() => onSave({ competitorReels: comps, audienceLanguage: audience, trendSignals: trends, personalSaves: saves })}>Save · Week {fmtDate(sundayOf())}</button>
        </div>
      </div>
    </div>
  );
}

function AreaChartSVG({ data, breakEven, height = 280 }) {
  if (!data || data.length < 2) return null;
  const w = 800, h = height, pad = { l: 60, r: 20, t: 20, b: 30 };
  const maxRev = Math.max(...data.map(d => d.revenue), breakEven * 1.5, 100);
  const xS = i => pad.l + (i / (data.length - 1)) * (w - pad.l - pad.r);
  const yS = v => h - pad.b - (v / maxRev) * (h - pad.t - pad.b);
  const linePath = data.map((d, i) => `${i === 0 ? 'M' : 'L'} ${xS(i)} ${yS(d.revenue)}`).join(' ');
  const areaPath = linePath + ` L ${xS(data.length - 1)} ${h - pad.b} L ${xS(0)} ${h - pad.b} Z`;
  const beY = yS(breakEven);
  return (
    <svg viewBox={`0 0 ${w} ${h}`} style={{ width: '100%' }}>
      <defs><linearGradient id="goldGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={COLORS.gold} stopOpacity="0.4" /><stop offset="100%" stopColor={COLORS.gold} stopOpacity="0" /></linearGradient></defs>
      {[0, 0.25, 0.5, 0.75, 1].map(t => { const y = pad.t + t * (h - pad.t - pad.b); const v = Math.round(maxRev * (1 - t)); return <g key={t}><line x1={pad.l} x2={w - pad.r} y1={y} y2={y} stroke={COLORS.goldFaint} strokeDasharray="3 3" /><text x={pad.l - 8} y={y + 3} fill={COLORS.textDim} fontSize="10" textAnchor="end">€{v}</text></g>; })}
      <path d={areaPath} fill="url(#goldGrad)" />
      <path d={linePath} stroke={COLORS.gold} strokeWidth="2" fill="none" />
      {beY > pad.t && beY < h - pad.b && <g><line x1={pad.l} x2={w - pad.r} y1={beY} y2={beY} stroke={COLORS.danger} strokeWidth="1" strokeDasharray="4 4" /><text x={w - pad.r - 8} y={beY - 6} fill={COLORS.danger} fontSize="10" textAnchor="end">Break-even €{breakEven}</text></g>}
      {data.map((d, i) => <text key={i} x={xS(i)} y={h - 10} fill={COLORS.textDim} fontSize="10" textAnchor="middle">{d.month}</text>)}
    </svg>
  );
}

function Forecast({ data, save }) {
  const i = data.forecastInputs;
  const update = (field, value) => save({ ...data, forecastInputs: { ...i, [field]: value } });
  const projection = useMemo(() => {
    const out = []; let cross = null;
    for (let m = 0; m <= 12; m++) {
      const mult = Math.pow(1 + i.weeklyGrowthPct / 100, m * 4.33);
      const monthlyViews = i.avgViewsPerPost * mult * i.postsPerWeek * 4.33;
      const downloads = monthlyViews * (i.bioLinkCTR / 100) * (i.freeDownloadConv / 100);
      const revenue = downloads * (i.eightEuroConv / 100) * i.eightEuroPrice + downloads * (i.thirtySevenEuroConv / 100) * i.thirtySevenEuroPrice;
      if (cross === null && revenue >= i.monthlyCost) cross = m;
      out.push({ month: `M${m}`, downloads: Math.round(downloads), revenue: Math.round(revenue) });
    }
    return { data: out, crossover: cross };
  }, [i]);
  const m6 = projection.data[6], m12 = projection.data[12];
  return (
    <div>
      <h2 className="wa-h" style={{ margin: '0 0 6px', fontSize: 22, color: COLORS.cream }}>ROI Forecast</h2>
      <p style={{ color: COLORS.textDim, fontSize: 13, marginTop: 0, marginBottom: 16 }}>12-month projection. Decimals: comma or period.</p>
      <div className="stack-cards" style={{ '--cols': 'repeat(3, 1fr)', marginBottom: 16 }}>
        <StatCard label="Break-even" value={projection.crossover !== null ? `M${projection.crossover}` : '12+'} sub="When revenue covers cost" />
        <StatCard label="Month 6" value={`€${m6.revenue.toLocaleString()}`} sub={`${m6.downloads} downloads`} />
        <StatCard label="Month 12" value={`€${m12.revenue.toLocaleString()}`} sub={`${m12.downloads} downloads`} />
      </div>
      <div className="wa-card" style={{ marginBottom: 16 }}>
        <div className="wa-label" style={{ marginBottom: 14 }}>Monthly Revenue Projection</div>
        <AreaChartSVG data={projection.data} breakEven={i.monthlyCost} />
      </div>
      <div className="wa-card">
        <div className="wa-label" style={{ marginBottom: 14 }}>Forecast Inputs</div>
        <div className="stack-cards" style={{ '--cols': 'repeat(2, 1fr)' }}>
          <div><div className="wa-label">Avg views per post</div><IntInput value={i.avgViewsPerPost} onSave={v => update('avgViewsPerPost', v)} /></div>
          <div><div className="wa-label">Weekly growth %</div><DecimalInput value={i.weeklyGrowthPct} onSave={v => update('weeklyGrowthPct', v)} /></div>
          <div><div className="wa-label">Posts per week</div><IntInput value={i.postsPerWeek} onSave={v => update('postsPerWeek', v)} /></div>
          <div><div className="wa-label">Bio link CTR %</div><DecimalInput value={i.bioLinkCTR} onSave={v => update('bioLinkCTR', v)} /></div>
          <div><div className="wa-label">Free download conv %</div><DecimalInput value={i.freeDownloadConv} onSave={v => update('freeDownloadConv', v)} /></div>
          <div><div className="wa-label">€8 guide conv %</div><DecimalInput value={i.eightEuroConv} onSave={v => update('eightEuroConv', v)} /></div>
          <div><div className="wa-label">€37 blueprint conv %</div><DecimalInput value={i.thirtySevenEuroConv} onSave={v => update('thirtySevenEuroConv', v)} /></div>
          <div><div className="wa-label">€8 price</div><DecimalInput value={i.eightEuroPrice} onSave={v => update('eightEuroPrice', v)} /></div>
          <div><div className="wa-label">€37 price</div><DecimalInput value={i.thirtySevenEuroPrice} onSave={v => update('thirtySevenEuroPrice', v)} /></div>
          <div><div className="wa-label">Monthly cost €</div><DecimalInput value={i.monthlyCost} onSave={v => update('monthlyCost', v)} /></div>
        </div>
      </div>
    </div>
  );
}