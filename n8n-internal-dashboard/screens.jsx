// Screens: DashboardsList (with empty state variants), NewDashboardModal,
// ConfigureScreen (entity binding + action→workflow), action feedback variants.
const { Icon, SEED, byId } = window;

/* ─────────────────────────────────────────────────────────
 *  DashboardsList — top-level Dashboards index
 * ───────────────────────────────────────────────────────── */
function DashboardsList({ onOpen, onNew, onConfigure, emptyVariant, isEmpty }) {
  if (isEmpty) return <EmptyState variant={emptyVariant} onNew={onNew} />;

  return (
    <div style={{ padding: "var(--spacing--lg)", display: "flex", flexDirection: "column", gap: "var(--spacing--md)" }}>
      <div className="row">
        <div className="col" style={{ gap: 2 }}>
          <h1 style={{ margin: 0, fontSize: "var(--font-size--2xl)" }}>Dashboards</h1>
          <span className="caption">Interactive views over your data · powered by A2Dash</span>
        </div>
        <div style={{ flex: 1 }} />
        <button className="btn btn--secondary btn--sm"><Icon name="external" size={14} />Docs</button>
        <button className="btn btn--primary btn--sm" onClick={onNew}><Icon name="plus" size={14} />New dashboard</button>
      </div>

      <div className="row" style={{ gap: 8 }}>
        <div style={{ position: "relative" }}>
          <Icon name="search" size={14} style={{ position: "absolute", left: 10, top: 9, color: "var(--color--text--tint-1)" }} />
          <input className="input" placeholder="Search dashboards…" style={{ paddingLeft: 30, width: 280, height: 32 }} />
        </div>
        <button className="btn btn--secondary btn--sm"><Icon name="filter" size={14} />Status</button>
        <button className="btn btn--secondary btn--sm">Owner: All <Icon name="chevron-down" size={12} /></button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "var(--spacing--md)" }}>
        {SEED.DASHBOARDS.map((d, idx) => (
          <DashboardCard key={d.id} d={d} featured={idx === 0} onOpen={onOpen} onConfigure={onConfigure} />
        ))}
        <button onClick={onNew} style={{
          border: "1.5px dashed var(--color--foreground--shade-1)",
          borderRadius: "var(--radius--sm)",
          background: "transparent",
          padding: "var(--spacing--md)",
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 6,
          minHeight: 180, color: "var(--color--text)",
        }}>
          <Icon name="plus" size={20} />
          <span style={{ fontSize: "var(--font-size--sm)", fontWeight: 500 }}>New dashboard</span>
          <span className="caption">From prompt, JSON, or template</span>
        </button>
      </div>
    </div>
  );
}

function DashboardCard({ d, featured, onOpen, onConfigure }) {
  const statusColor = {
    active: { bg: "var(--color--green-50)", text: "var(--color--green-800)", dot: "var(--color--green-600)" },
    draft:  { bg: "var(--color--gold-50)", text: "var(--color--gold-600)",  dot: "var(--color--gold-500)" },
  }[d.status] || { bg: "#eee", text: "#333", dot: "#999" };
  return (
    <div className="card" style={{ padding: 0, overflow: "hidden", display: "flex", flexDirection: "column" }}>
      <button onClick={() => onOpen(d.id)} style={{
        padding: "var(--spacing--md)",
        background: featured
          ? "linear-gradient(135deg, var(--color--orange-50), var(--color--background--light-3))"
          : "transparent",
        display: "flex", flexDirection: "column", gap: 12, textAlign: "left",
        borderBottom: "1px solid var(--color--foreground--tint-1)",
        cursor: "pointer", flex: 1,
      }}>
        <div className="row">
          <span className="row" style={{ gap: 8 }}>
            <span style={{
              width: 32, height: 32, borderRadius: 8,
              background: featured ? "var(--color--orange-400)" : "var(--color--purple-500)",
              color: "white", display: "inline-flex", alignItems: "center", justifyContent: "center",
            }}>
              <Icon name="dashboards" size={16} />
            </span>
            <div className="col" style={{ gap: 0 }}>
              <span style={{ fontSize: "var(--font-size--md)", fontWeight: 600 }}>{d.name}</span>
              <span className="caption">{d.description}</span>
            </div>
          </span>
        </div>
        <div className="row" style={{ gap: 6, flexWrap: "wrap" }}>
          <span className="chip"><Icon name="database" size={11} />{d.entities} entities</span>
          <span className="chip"><Icon name="table" size={11} />{d.views} views</span>
          <span className="pill" style={{ background: statusColor.bg, color: statusColor.text }}>
            <span className="pill__dot" style={{ background: statusColor.dot }} />
            {d.status}
          </span>
        </div>
      </button>
      <div className="row" style={{ padding: "10px 14px", justifyContent: "space-between" }}>
        <span className="caption">Updated {d.updated} · {d.owner}</span>
        <div className="row" style={{ gap: 2 }}>
          <button className="btn btn--ghost btn--xs" onClick={() => onConfigure(d.id)} title="Configure">
            <Icon name="settings" size={14} />
          </button>
          <button className="btn btn--ghost btn--xs"><Icon name="more" size={14} /></button>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────
 *  EmptyState — 3 variants exposed via tweak
 * ───────────────────────────────────────────────────────── */
function EmptyState({ variant = "illustration", onNew }) {
  return (
    <div style={{
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      padding: "var(--spacing--3xl) var(--spacing--lg)", textAlign: "center", height: "100%",
    }}>
      {variant === "illustration" && <EmptyIllustration />}
      {variant === "minimal"      && <EmptyMinimal />}
      {variant === "cards"        && <EmptyCards />}

      <h1 style={{ margin: 0, fontSize: "var(--font-size--xl)", marginTop: 24 }}>
        {variant === "minimal" ? "No dashboards yet" : "Turn your data into a dashboard"}
      </h1>
      <p style={{
        maxWidth: 480, color: "var(--color--text)", marginTop: 8,
        fontSize: "var(--font-size--sm)", lineHeight: 1.55,
      }}>
        {variant === "minimal"
          ? "Create your first dashboard to start exploring data and triggering workflows."
          : "Describe what you want in plain English, paste an A2Dash JSON, or start from a template. Each dashboard reads from your existing data and lets you fire n8n workflows from any record."}
      </p>
      <div className="row" style={{ marginTop: 20, gap: 8 }}>
        <button className="btn btn--primary" onClick={onNew}>
          <Icon name="sparkles" size={14} />Create with prompt
        </button>
        <button className="btn btn--secondary" onClick={onNew}>Browse templates</button>
      </div>
      {variant !== "minimal" && (
        <div className="row" style={{ marginTop: 28, gap: 16, color: "var(--color--text--tint-1)", fontSize: "var(--font-size--2xs)" }}>
          <span className="row" style={{ gap: 6 }}><Icon name="check" size={12} />Use your existing credentials</span>
          <span className="row" style={{ gap: 6 }}><Icon name="check" size={12} />Actions fire workflows</span>
          <span className="row" style={{ gap: 6 }}><Icon name="check" size={12} />Open A2Dash protocol</span>
        </div>
      )}
    </div>
  );
}

function EmptyIllustration() {
  return (
    <svg width="220" height="160" viewBox="0 0 220 160" fill="none">
      <defs>
        <linearGradient id="g1" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="var(--color--orange-100)" />
          <stop offset="100%" stopColor="var(--color--orange-50)" />
        </linearGradient>
      </defs>
      <rect x="12" y="20" width="196" height="120" rx="10" fill="url(#g1)" stroke="var(--color--orange-200)" strokeWidth="1.5" />
      <rect x="28" y="36" width="60" height="36" rx="5" fill="white" stroke="var(--color--orange-200)" />
      <rect x="36" y="44" width="24" height="6"  rx="2" fill="var(--color--orange-200)" />
      <rect x="36" y="56" width="36" height="10" rx="2" fill="var(--color--orange-400)" />
      <rect x="96" y="36" width="100" height="36" rx="5" fill="white" stroke="var(--color--orange-200)" />
      <path d="M104 64 L114 56 L124 60 L138 48 L152 56 L166 44 L180 50 L188 46"
            stroke="var(--color--orange-500)" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="28" y="84" width="168" height="40" rx="5" fill="white" stroke="var(--color--orange-200)" />
      <rect x="36" y="92"  width="42" height="6"  rx="2" fill="var(--color--orange-200)" />
      <rect x="36" y="104" width="120" height="6" rx="2" fill="var(--color--neutral-200)" />
      <rect x="36" y="114" width="80"  height="5" rx="2" fill="var(--color--neutral-150)" />
      <circle cx="184" cy="104" r="9" fill="var(--color--orange-400)" />
      <path d="M180 104 L183 107 L189 100" stroke="white" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function EmptyMinimal() {
  return (
    <div style={{ width: 64, height: 64, borderRadius: 16, background: "var(--color--background--shade-1)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--color--text--tint-1)" }}>
      <Icon name="dashboards" size={28} />
    </div>
  );
}
function EmptyCards() {
  return (
    <div style={{ display: "flex", gap: 8 }}>
      {["table","kanban","overview","calendar"].map((n,i) => (
        <div key={i} style={{
          width: 56, height: 80, borderRadius: 8,
          background: ["var(--color--orange-100)","var(--color--purple-200)","var(--color--green-100)","var(--color--blue-100)"][i],
          display: "flex", alignItems: "center", justifyContent: "center",
          color: ["var(--color--orange-700)","var(--color--purple-700)","var(--color--green-700)","var(--color--blue-800)"][i],
          transform: `translateY(${[10,-4,6,0][i]}px) rotate(${[-6,2,-2,4][i]}deg)`,
        }}>
          <Icon name={n} size={22} />
        </div>
      ))}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────
 *  NewDashboardModal — Prompt / JSON / Template tabs
 * ───────────────────────────────────────────────────────── */
function NewDashboardModal({ onClose, onCreate }) {
  const [tab, setTab] = React.useState("prompt");
  const [prompt, setPrompt] = React.useState("A sales CRM dashboard with deals, contacts and companies. Pipeline view by stage, a KPI overview and an action to fire a workflow when a deal is marked won.");
  const [json, setJson] = React.useState(`{
  "a2d_version": "1.0",
  "id": "01JKZ...",
  "name": "Sales CRM",
  "schema": {
    "deal":    { "fields": { "name": {"type":"text"}, "stage": {"type":"status"}, "value": {"type":"currency"} } },
    "contact": { "fields": { "name": {"type":"text"}, "email": {"type":"email"} } }
  },
  "views":   { /* table, kanban, dashboard */ },
  "actions": { "mark_won": { "effect":"workflow_trigger", "topic":"deal.won" } }
}`);
  const [generating, setGenerating] = React.useState(false);

  const templates = [
    { id: "crm",       name: "Sales CRM",          desc: "Deals, contacts, accounts pipeline", icon: "money",    color: "var(--color--orange-400)" },
    { id: "support",   name: "Customer Support",   desc: "Tickets, SLAs, CSAT trends",         icon: "users",    color: "var(--color--blue-500)" },
    { id: "inventory", name: "Warehouse Inventory",desc: "SKUs, restocks, shipments",          icon: "database", color: "var(--color--purple-600)" },
    { id: "finance",   name: "FP&A Workspace",     desc: "Budget vs actuals, invoices",        icon: "graph",    color: "var(--color--green-700)" },
    { id: "tasks",     name: "Task Tracker",       desc: "Issues, sprints, assignees",         icon: "kanban",   color: "var(--color--neutral-700)" },
    { id: "blank",     name: "Blank dashboard",    desc: "Start with an empty workspace",      icon: "draft",    color: "var(--color--text--tint-1)" },
  ];

  const tabs = [
    { id: "prompt",   icon: "sparkles", label: "From prompt" },
    { id: "json",     icon: "code",     label: "From JSON"  },
    { id: "template", icon: "templates",label: "Template"   },
  ];

  function handleCreate(opts) {
    if (tab === "prompt") {
      setGenerating(true);
      setTimeout(() => { setGenerating(false); onCreate({ from: "prompt", prompt }); }, 1200);
    } else {
      onCreate(opts);
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 760 }} onClick={e => e.stopPropagation()}>
        <div className="modal__header">
          <span style={{ width: 32, height: 32, borderRadius: 8, background: "var(--color--orange-400)", color: "white", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
            <Icon name="dashboards" size={16} />
          </span>
          <div className="col" style={{ gap: 0 }}>
            <span className="modal__title">New dashboard</span>
            <span className="caption">Describe your dashboard, paste A2Dash JSON, or start from a template.</span>
          </div>
          <button className="modal__close" onClick={onClose}><Icon name="x" /></button>
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", gap: 0, padding: "0 var(--spacing--lg)", borderBottom: "1px solid var(--color--foreground)" }}>
          {tabs.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{
              padding: "10px 14px", fontSize: "var(--font-size--xs)", fontWeight: 500,
              color: tab === t.id ? "var(--color--text--shade-1)" : "var(--color--text)",
              borderBottom: tab === t.id ? "2px solid var(--color--orange-400)" : "2px solid transparent",
              marginBottom: -1,
              display: "inline-flex", alignItems: "center", gap: 6,
            }}>
              <Icon name={t.icon} size={14} /> {t.label}
            </button>
          ))}
        </div>

        <div className="modal__body" style={{ minHeight: 360 }}>
          {tab === "prompt" && (
            <div className="col" style={{ gap: 14 }}>
              <div>
                <label className="label">Describe what you want</label>
                <textarea className="textarea" rows={5} value={prompt} onChange={e => setPrompt(e.target.value)} style={{ fontFamily: "var(--font-family)" }} />
                <div className="help">A built-in agent will emit an A2Dash workspace conforming to <code>workspace.schema.json</code>.</div>
              </div>
              <div className="card" style={{ padding: "var(--spacing--sm) var(--spacing--md)", background: "var(--color--purple-50, var(--color--background--light-2))", borderColor: "var(--color--foreground--tint-1)" }}>
                <div className="row" style={{ gap: 8, marginBottom: 6 }}>
                  <Icon name="sparkles" size={14} style={{ color: "var(--color--purple-600)" }} />
                  <span style={{ fontSize: "var(--font-size--xs)", fontWeight: 600 }}>Tips</span>
                </div>
                <ul style={{ margin: 0, paddingLeft: 18, color: "var(--color--text)", fontSize: "var(--font-size--xs)", lineHeight: 1.65 }}>
                  <li>Mention entities (e.g. <em>deals, contacts, companies</em>) and which views you want.</li>
                  <li>Describe actions and which workflow they should fire.</li>
                  <li>The agent can pull schema hints from your existing credentials.</li>
                </ul>
              </div>
              <div className="row" style={{ gap: 6 }}>
                <span className="caption">Suggestions:</span>
                {["Sales CRM", "Support tickets", "Inventory tracker"].map(s => (
                  <button key={s} className="chip" onClick={() => setPrompt("A " + s.toLowerCase() + " dashboard with pipeline view, KPI overview and workflow-trigger actions per record.")}>{s}</button>
                ))}
              </div>
            </div>
          )}

          {tab === "json" && (
            <div className="col" style={{ gap: 12 }}>
              <div className="row" style={{ gap: 8 }}>
                <span className="chip"><Icon name="check" size={11} style={{ color: "var(--color--green-700)" }} />Valid against v1.0</span>
                <span className="chip"><Icon name="database" size={11} />2 objects · 3 views</span>
                <div style={{ flex: 1 }} />
                <button className="btn btn--ghost btn--xs"><Icon name="external" size={12} />Open in editor</button>
              </div>
              <textarea
                className="textarea mono"
                rows={14}
                value={json}
                onChange={e => setJson(e.target.value)}
                style={{ fontSize: "var(--font-size--xs)", lineHeight: 1.5, background: "var(--color--neutral-50)" }}
              />
              <div className="help">Validated with <code>validateWorkspace()</code> from <code>@a2dash/core</code>.</div>
            </div>
          )}

          {tab === "template" && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 10 }}>
              {templates.map(t => (
                <button
                  key={t.id}
                  onClick={() => handleCreate({ from: "template", template: t.id })}
                  className="card"
                  style={{ padding: 14, textAlign: "left", display: "flex", alignItems: "flex-start", gap: 12, cursor: "pointer" }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--color--orange-400)"; e.currentTarget.style.background = "var(--color--orange-50)"; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--color--foreground)"; e.currentTarget.style.background = "var(--color--background--light-3)"; }}
                >
                  <span style={{ width: 36, height: 36, borderRadius: 8, background: t.color, color: "white", display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <Icon name={t.icon} size={16} />
                  </span>
                  <div className="col" style={{ gap: 2 }}>
                    <span style={{ fontWeight: 600 }}>{t.name}</span>
                    <span className="caption">{t.desc}</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="modal__footer">
          <button className="btn btn--secondary btn--sm" onClick={onClose}>Cancel</button>
          {tab === "prompt" && (
            <button className="btn btn--primary btn--sm" disabled={generating} onClick={() => handleCreate({})}>
              {generating ? <React.Fragment><Spinner /> Generating…</React.Fragment> : <React.Fragment><Icon name="sparkles" size={14} />Generate dashboard</React.Fragment>}
            </button>
          )}
          {tab === "json" && (
            <button className="btn btn--primary btn--sm" onClick={() => handleCreate({ from: "json", json })}>
              <Icon name="check" size={14} />Create dashboard
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function Spinner() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{ animation: "spin 0.8s linear infinite" }}>
      <path d="M21 12a9 9 0 1 1-6.2-8.5" />
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </svg>
  );
}

/* ─────────────────────────────────────────────────────────
 *  ConfigureScreen — entity binding + action→workflow mapping
 * ───────────────────────────────────────────────────────── */
function ConfigureScreen({ dashboardId, onBack, onOpen }) {
  const d = byId(SEED.DASHBOARDS, dashboardId);
  const [tab, setTab] = React.useState("data"); // data | actions | general | sharing

  const tabs = [
    { id: "data",    icon: "database",    label: "Data sources" },
    { id: "actions", icon: "lightning",   label: "Actions" },
    { id: "general", icon: "settings",    label: "General" },
    { id: "sharing", icon: "users",       label: "Sharing" },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div className="row" style={{ padding: "var(--spacing--md) var(--spacing--lg)", borderBottom: "1px solid var(--color--foreground)", background: "var(--color--background--light-3)" }}>
        <button className="btn btn--ghost btn--sm" onClick={onBack}><Icon name="chevron-left" size={14} />Back</button>
        <div className="col" style={{ gap: 0, marginLeft: 8 }}>
          <span className="caption">Configure dashboard</span>
          <h2 style={{ margin: 0, fontSize: "var(--font-size--xl)" }}>{d?.name}</h2>
        </div>
        <div style={{ flex: 1 }} />
        <button className="btn btn--secondary btn--sm">Discard</button>
        <button className="btn btn--primary btn--sm"><Icon name="check" size={14} />Save & open</button>
      </div>

      <div className="row" style={{ padding: "0 var(--spacing--lg)", gap: 0, borderBottom: "1px solid var(--color--foreground)", background: "var(--color--background--light-3)" }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            padding: "10px 14px", fontSize: "var(--font-size--xs)", fontWeight: 500,
            color: tab === t.id ? "var(--color--text--shade-1)" : "var(--color--text)",
            borderBottom: tab === t.id ? "2px solid var(--color--orange-400)" : "2px solid transparent",
            marginBottom: -1,
            display: "inline-flex", alignItems: "center", gap: 6,
          }}>
            <Icon name={t.icon} size={14} /> {t.label}
          </button>
        ))}
      </div>

      <div className="scroll">
        {tab === "data"    && <ConfigureData onOpen={onOpen} />}
        {tab === "actions" && <ConfigureActions />}
        {tab === "general" && <ConfigureGeneral />}
        {tab === "sharing" && <ConfigureSharing />}
      </div>
    </div>
  );
}

function ConfigureData({ onOpen }) {
  const objects = [
    { id: "deal",    label: "Deal",    fields: 12, mode: "credential", source: "Postgres · production · public.deals" },
    { id: "contact", label: "Contact", fields: 8,  mode: "credential", source: "Postgres · production · public.contacts" },
    { id: "company", label: "Company", fields: 6,  mode: "workflow",   source: "wf_company_lookup · custom enrichment" },
    { id: "activity",label: "Activity",fields: 5,  mode: "credential", source: "Airtable · CRM base · Activities" },
  ];
  return (
    <div style={{ padding: "var(--spacing--lg)", display: "grid", gridTemplateColumns: "260px 1fr", gap: "var(--spacing--lg)", maxWidth: 1400 }}>
      <aside className="col" style={{ gap: 4 }}>
        <span style={{ fontSize: "var(--font-size--xs)", textTransform: "uppercase", letterSpacing: 0.04, color: "var(--color--text--tint-1)", fontWeight: 600, padding: "0 8px 6px" }}>
          Objects
        </span>
        {objects.map((o, i) => (
          <button key={o.id} className="row" style={{
            justifyContent: "flex-start", padding: "8px 10px", borderRadius: 6,
            background: i === 0 ? "var(--color--background--shade-1)" : "transparent",
            border: i === 0 ? "1px solid var(--color--foreground)" : "1px solid transparent",
            fontSize: "var(--font-size--xs)",
          }}>
            <Icon name="database" size={14} />
            <span style={{ flex: 1, textAlign: "left", color: "var(--color--text--shade-1)", fontWeight: i === 0 ? 600 : 500 }}>{o.label}</span>
            <span className="caption">{o.fields}</span>
          </button>
        ))}
        <button className="btn btn--ghost btn--xs" style={{ justifyContent: "flex-start", color: "var(--color--text--tint-1)" }}>
          <Icon name="plus" size={12} />Add object
        </button>
      </aside>

      <main className="col" style={{ gap: "var(--spacing--md)", minWidth: 0 }}>
        <div className="card" style={{ padding: "var(--spacing--md)", display: "flex", flexDirection: "column", gap: 14 }}>
          <div className="row">
            <div className="col" style={{ gap: 2 }}>
              <h3 style={{ margin: 0 }}>Deal · data binding</h3>
              <span className="caption">How n8n fetches and mutates this object</span>
            </div>
          </div>

          <div className="col" style={{ gap: 10 }}>
            <span className="label">Adapter pattern</span>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <button className="card" style={{ padding: 14, textAlign: "left", borderColor: "var(--color--orange-400)", outline: "2px solid var(--color--orange-100)", cursor: "pointer" }}>
                <div className="row" style={{ gap: 8 }}>
                  <Icon name="database" size={16} style={{ color: "var(--color--orange-600)" }} />
                  <span style={{ fontWeight: 600 }}>Direct credential</span>
                  <span className="pill pill--completed" style={{ marginLeft: "auto", padding: "1px 6px" }}><span className="pill__dot" />Selected</span>
                </div>
                <span className="caption" style={{ display: "block", marginTop: 4 }}>Read/write directly using a credential. Fastest.</span>
              </button>
              <button className="card" style={{ padding: 14, textAlign: "left", cursor: "pointer" }}>
                <div className="row" style={{ gap: 8 }}>
                  <Icon name="workflows" size={16} style={{ color: "var(--color--text--tint-1)" }} />
                  <span style={{ fontWeight: 600 }}>Workflow-as-adapter</span>
                </div>
                <span className="caption" style={{ display: "block", marginTop: 4 }}>Each verb is a workflow. Max flexibility, slower.</span>
              </button>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <span className="label">Credential</span>
              <button className="input row" style={{ justifyContent: "flex-start", paddingLeft: 10, cursor: "pointer" }}>
                <span style={{ width: 18, height: 18, borderRadius: 4, background: "var(--color--blue-500)", color: "white", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 700, flexShrink: 0 }}>P</span>
                <span style={{ flex: 1, textAlign: "left" }}>Postgres · production</span>
                <Icon name="chevron-down" size={14} />
              </button>
            </div>
            <div>
              <span className="label">Table</span>
              <button className="input row mono" style={{ justifyContent: "flex-start", paddingLeft: 10, cursor: "pointer" }}>
                <span style={{ flex: 1, textAlign: "left" }}>public.deals</span>
                <Icon name="chevron-down" size={14} />
              </button>
            </div>
          </div>

          <div>
            <span className="label">Field mapping <span className="caption" style={{ fontWeight: 400 }}>· A2Dash field type ← table column</span></span>
            <div className="card" style={{ marginTop: 6, padding: 0, overflow: "hidden", borderRadius: 6 }}>
              <table style={{ width: "100%", fontSize: "var(--font-size--xs)", borderCollapse: "collapse" }}>
                <thead style={{ background: "var(--color--background--light-2)" }}>
                  <tr>
                    {["Field","Type","Column","Required",""].map((h,i) => (
                      <th key={i} style={{ textAlign: "left", padding: "8px 10px", fontWeight: 500, fontSize: 10, textTransform: "uppercase", color: "var(--color--text--tint-1)" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[
                    { f: "name",          t: "text",       c: "name",            req: true,  m: "✓" },
                    { f: "stage",         t: "status",     c: "pipeline_stage",  req: true,  m: "✓ status.kind inferred" },
                    { f: "value",         t: "currency",   c: "deal_value_usd",  req: false, m: "USD · 2dp" },
                    { f: "company",       t: "relation",   c: "company_id",      req: true,  m: "→ company" },
                    { f: "owner",         t: "user",       c: "owner_user_id",   req: false, m: "→ user" },
                    { f: "expectedClose", t: "date",       c: "expected_close",  req: false, m: "ISO 8601" },
                    { f: "probability",   t: "percent",    c: "win_probability", req: false, m: "0–100" },
                    { f: "nextStep",      t: "longtext",   c: "next_step_note",  req: false, m: "—" },
                  ].map((row, i) => (
                    <tr key={i} style={{ borderTop: "1px solid var(--color--foreground--tint-1)" }}>
                      <td style={{ padding: "7px 10px", color: "var(--color--text--shade-1)", fontWeight: 500 }} className="mono">{row.f}</td>
                      <td style={{ padding: "7px 10px" }}><span className="chip">{row.t}</span></td>
                      <td style={{ padding: "7px 10px" }} className="mono">{row.c}</td>
                      <td style={{ padding: "7px 10px" }}>{row.req ? <Icon name="check" size={12} style={{ color: "var(--color--green-700)" }} /> : <span className="caption">—</span>}</td>
                      <td style={{ padding: "7px 10px" }} className="caption">{row.m}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="card" style={{ padding: "var(--spacing--md)" }}>
          <div className="row">
            <Icon name="info" size={14} style={{ color: "var(--color--blue-500)" }} />
            <span style={{ fontSize: "var(--font-size--xs)", color: "var(--color--text--shade-1)", marginLeft: 6 }}>
              Each verb (<code>list</code>, <code>get</code>, <code>mutate</code>, <code>aggregate</code>) maps to a SQL operation on <code>public.deals</code>.
            </span>
            <button className="btn btn--ghost btn--xs" style={{ marginLeft: "auto" }}>Preview SQL <Icon name="chevron-right" size={12} /></button>
          </div>
        </div>
      </main>
    </div>
  );
}

function ConfigureActions() {
  const [rows, setRows] = React.useState([
    { id: "mark_won",  label: "Mark won",                  effect: "workflow_trigger", topic: "deal.won",     wf: "wf_won",     enabled: true },
    { id: "mark_lost", label: "Mark lost",                 effect: "workflow_trigger", topic: "deal.lost",    wf: "wf_lost",    enabled: true },
    { id: "handoff",   label: "Handoff to onboarding",     effect: "workflow_trigger", topic: "deal.handoff", wf: "wf_handoff", enabled: true },
    { id: "invoice",   label: "Send invoice",              effect: "workflow_trigger", topic: "deal.invoice", wf: "wf_invoice", enabled: true },
    { id: "slack",     label: "Post to #wins",             effect: "webhook",          topic: "—",            wf: "—",          enabled: true },
    { id: "stage",     label: "Move to next stage",        effect: "mutate",           topic: "—",            wf: "—",          enabled: false },
  ]);

  return (
    <div style={{ padding: "var(--spacing--lg)", maxWidth: 1100 }}>
      <div className="row" style={{ marginBottom: 12 }}>
        <div className="col" style={{ gap: 2 }}>
          <h3 style={{ margin: 0 }}>Actions on records</h3>
          <span className="caption">Map each A2Dash action to an effect. <code>workflow_trigger</code> resolves to an n8n workflow.</span>
        </div>
        <div style={{ flex: 1 }} />
        <button className="btn btn--primary btn--sm"><Icon name="plus" size={14} />New action</button>
      </div>

      <div className="card" style={{ overflow: "hidden", padding: 0 }}>
        <table style={{ width: "100%", borderCollapse: "separate", borderSpacing: 0, fontSize: "var(--font-size--xs)" }}>
          <thead style={{ background: "var(--color--background--light-2)" }}>
            <tr>
              {["Action label", "Effect", "Topic", "Workflow", "Enabled", ""].map((h,i) => (
                <th key={i} style={{ textAlign: "left", padding: "10px 12px", fontWeight: 500, fontSize: 10, textTransform: "uppercase", color: "var(--color--text--tint-1)", borderBottom: "1px solid var(--color--foreground)" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={r.id} style={{ borderBottom: "1px solid var(--color--foreground--tint-1)", opacity: r.enabled ? 1 : 0.55 }}>
                <td style={{ padding: "10px 12px", color: "var(--color--text--shade-1)", fontWeight: 500 }}>
                  <span className="row" style={{ gap: 8 }}>
                    <span style={{ width: 22, height: 22, borderRadius: 4, background: r.effect === "workflow_trigger" ? "var(--color--orange-100)" : r.effect === "webhook" ? "var(--color--blue-100)" : "var(--color--background--shade-1)", color: r.effect === "workflow_trigger" ? "var(--color--orange-700)" : r.effect === "webhook" ? "var(--color--blue-800)" : "var(--color--text--tint-1)", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
                      <Icon name={r.effect === "workflow_trigger" ? "lightning" : r.effect === "webhook" ? "globe" : "edit"} size={12} />
                    </span>
                    {r.label}
                  </span>
                </td>
                <td style={{ padding: "10px 12px" }}>
                  <span className="chip mono">{r.effect}</span>
                </td>
                <td style={{ padding: "10px 12px" }} className="mono caption">{r.topic}</td>
                <td style={{ padding: "10px 12px" }}>
                  {r.effect === "workflow_trigger" ? (
                    <button className="row" style={{ gap: 6, fontSize: "var(--font-size--xs)" }}>
                      <Icon name="workflows" size={12} style={{ color: "var(--color--orange-600)" }} />
                      <span className="mono" style={{ color: "var(--color--text--shade-1)", fontWeight: 500 }}>{r.wf}</span>
                      <Icon name="chevron-down" size={10} />
                    </button>
                  ) : <span className="caption">—</span>}
                </td>
                <td style={{ padding: "10px 12px" }}>
                  <button
                    onClick={() => setRows(rs => rs.map((x,j) => j === i ? { ...x, enabled: !x.enabled } : x))}
                    style={{
                      width: 32, height: 18, borderRadius: 9,
                      background: r.enabled ? "var(--color--green-600)" : "var(--color--neutral-300)",
                      position: "relative", transition: "background var(--duration--snappy)",
                    }}>
                    <span style={{
                      position: "absolute", top: 2, left: r.enabled ? 16 : 2,
                      width: 14, height: 14, borderRadius: "50%", background: "white",
                      transition: "left var(--duration--snappy)",
                    }} />
                  </button>
                </td>
                <td style={{ padding: "6px 10px", textAlign: "right" }}>
                  <button className="btn btn--ghost btn--xs"><Icon name="more" size={14} /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="card" style={{ marginTop: 18, padding: "var(--spacing--md)", background: "var(--color--orange-50)", borderColor: "var(--color--orange-150)" }}>
        <div className="row" style={{ gap: 8 }}>
          <Icon name="lightning" size={14} style={{ color: "var(--color--orange-600)" }} />
          <div className="col" style={{ gap: 2, flex: 1 }}>
            <span style={{ fontWeight: 600, fontSize: "var(--font-size--xs)" }}>Workflow triggers receive the full record + action context</span>
            <span className="caption">Each <code>workflow_trigger</code> calls <code>Execute Workflow</code> with input <code>{`{ record, action, user, dashboard }`}</code>. The workflow can write back, post to Slack, or chain into another flow.</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function ConfigureGeneral() {
  return (
    <div style={{ padding: "var(--spacing--lg)", maxWidth: 700, display: "flex", flexDirection: "column", gap: "var(--spacing--md)" }}>
      <div className="card" style={{ padding: "var(--spacing--md)", display: "flex", flexDirection: "column", gap: 12 }}>
        <h3 style={{ margin: 0 }}>General</h3>
        <div><label className="label">Name</label><input className="input" defaultValue="Sales CRM" /></div>
        <div><label className="label">Description</label><textarea className="textarea" rows={2} defaultValue="Deals, contacts and accounts pipeline" /></div>
        <div><label className="label">A2Dash version <span className="caption">· enforced on import</span></label>
          <select className="input"><option>1.0 (hard-fail on mismatch)</option><option>1.0 (warn on mismatch)</option></select>
        </div>
      </div>
      <div className="card" style={{ padding: "var(--spacing--md)" }}>
        <h3 style={{ margin: 0, marginBottom: 8 }}>Multi-tenancy</h3>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
          {["Per-user","Per-workspace","Org-shared"].map((m,i) => (
            <button key={m} className="card" style={{ padding: 12, textAlign: "left", borderColor: i === 1 ? "var(--color--orange-400)" : "var(--color--foreground)" }}>
              <span style={{ fontWeight: 600 }}>{m}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function ConfigureSharing() {
  return (
    <div style={{ padding: "var(--spacing--lg)", maxWidth: 700, display: "flex", flexDirection: "column", gap: "var(--spacing--md)" }}>
      <div className="card" style={{ padding: "var(--spacing--md)" }}>
        <h3 style={{ margin: 0, marginBottom: 12 }}>Members</h3>
        {SEED.OWNERS.map(o => (
          <div key={o.id} className="row" style={{ padding: "8px 0", borderTop: "1px solid var(--color--foreground--tint-1)" }}>
            <span className="row" style={{ gap: 8 }}>
              <span className="avatar" style={{ background: o.color }}>{o.initials}</span>
              <div className="col" style={{ gap: 0 }}>
                <span style={{ fontSize: "var(--font-size--xs)", fontWeight: 500 }}>{o.name}</span>
                <span className="caption">{o.id}@n8n.io</span>
              </div>
            </span>
            <div style={{ flex: 1 }} />
            <select className="input" style={{ width: 130 }}><option>Editor</option><option>Viewer</option></select>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────
 *  Action feedback variants — Toast / Panel / Trace
 * ───────────────────────────────────────────────────────── */
function ToastStack({ toasts, onDismiss }) {
  return (
    <div className="toast-stack">
      {toasts.map(t => (
        <div key={t.id} className={"toast toast--" + (t.tone || "success")}>
          <span className="toast__icon"><Icon name="lightning" size={14} /></span>
          <div className="col" style={{ gap: 2, flex: 1 }}>
            <span className="toast__title">{t.title}</span>
            <span className="toast__body">{t.body}</span>
          </div>
          <a className="toast__link" href="#" onClick={e => e.preventDefault()}>View run</a>
          <button className="toast__close" onClick={() => onDismiss(t.id)}><Icon name="x" size={12} /></button>
        </div>
      ))}
    </div>
  );
}

function RunPanel({ run, onClose }) {
  if (!run) return null;
  const steps = [
    { name: "Trigger", node: "When clicked from dashboard", status: "ok",       ms: 4 },
    { name: "Set",     node: "Build payload",               status: "ok",       ms: 12 },
    { name: "Postgres",node: "UPDATE deals SET stage…",     status: "ok",       ms: 86 },
    { name: "Slack",   node: "Post to #wins",               status: "ok",       ms: 240 },
    { name: "HTTP",    node: "Stripe — Create invoice",     status: "running",  ms: null },
  ];
  return (
    <aside style={{
      position: "fixed", top: 0, right: 0, bottom: 0, width: 420, zIndex: 8800,
      background: "var(--color--neutral-950)", color: "var(--color--neutral-200)",
      display: "flex", flexDirection: "column",
      boxShadow: "-8px 0 24px var(--color--black-alpha-300)",
      animation: "drawer-in 0.25s var(--easing--ease-out)",
    }}>
      <div className="row" style={{ padding: "12px 16px", borderBottom: "1px solid var(--color--neutral-850)" }}>
        <span style={{ width: 26, height: 26, borderRadius: 6, background: "var(--color--orange-400)", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
          <Icon name="lightning" size={14} />
        </span>
        <div className="col" style={{ gap: 0, marginLeft: 8 }}>
          <span style={{ fontWeight: 600, color: "white", fontSize: "var(--font-size--xs)" }}>Workflow running</span>
          <span style={{ fontSize: 10, color: "var(--color--neutral-400)" }} className="mono">{run.wf} · {run.topic}</span>
        </div>
        <div style={{ flex: 1 }} />
        <button className="btn btn--ghost btn--xs" onClick={onClose} style={{ color: "var(--color--neutral-300)" }}><Icon name="x" size={14} /></button>
      </div>

      <div className="scroll" style={{ padding: 16, display: "flex", flexDirection: "column", gap: 8 }}>
        {steps.map((s, i) => (
          <div key={i} className="row" style={{
            padding: 10, background: "var(--color--neutral-900)", borderRadius: 6,
            border: "1px solid " + (s.status === "running" ? "var(--color--orange-400)" : "var(--color--neutral-850)"),
            gap: 10
          }}>
            <span style={{
              width: 22, height: 22, borderRadius: 5,
              background: s.status === "ok" ? "var(--color--green-600)" : "var(--color--orange-400)",
              display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
            }}>
              {s.status === "ok" ? <Icon name="check" size={12} /> : <Spinner />}
            </span>
            <div className="col" style={{ gap: 0, flex: 1, minWidth: 0 }}>
              <span style={{ fontSize: "var(--font-size--xs)", color: "white", fontWeight: 500 }}>{s.name}</span>
              <span style={{ fontSize: 10, color: "var(--color--neutral-400)" }}>{s.node}</span>
            </div>
            <span className="mono" style={{ fontSize: 10, color: s.status === "running" ? "var(--color--orange-300)" : "var(--color--neutral-500)" }}>
              {s.ms ? s.ms + "ms" : "…"}
            </span>
          </div>
        ))}
        <div className="row" style={{
          padding: 10, marginTop: 6, background: "transparent", border: "1px dashed var(--color--neutral-850)",
          borderRadius: 6, color: "var(--color--neutral-500)", fontSize: "var(--font-size--xs)"
        }}>
          <Icon name="info" size={12} />
          <span style={{ marginLeft: 6 }}>Run id <span className="mono">exec_8a91…</span> · started {run.startedAt}</span>
        </div>
      </div>
    </aside>
  );
}

function TraceOverlay({ trace, onDone }) {
  React.useEffect(() => {
    if (!trace) return;
    const t = setTimeout(onDone, 2400);
    return () => clearTimeout(t);
  }, [trace, onDone]);
  if (!trace) return null;
  const { startX, startY } = trace;
  // Animate dotted line from (startX, startY) → bottom-left "Workflows" sidebar item area
  // We don't know exactly where but assume sidebar item is at around x=40, y=window.innerHeight-...
  // Easier: animate to a fixed target near top-left of viewport (sidebar workflows icon area)
  const targetX = 40;  // sidebar workflows icon
  const targetY = 200; // approximate
  const dx = targetX - startX;
  const dy = targetY - startY;
  return (
    <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 9800 }}>
      <svg width="100%" height="100%" style={{ position: "absolute", inset: 0 }}>
        <defs>
          <marker id="arrowhead" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto">
            <path d="M0 0 L8 4 L0 8 Z" fill="var(--color--orange-500)" />
          </marker>
        </defs>
        <path
          d={`M ${startX} ${startY} C ${startX - 60} ${startY + 30}, ${targetX + 120} ${targetY - 20}, ${targetX} ${targetY}`}
          fill="none"
          stroke="var(--color--orange-500)"
          strokeWidth="2"
          strokeDasharray="6 6"
          markerEnd="url(#arrowhead)"
          style={{
            strokeDashoffset: 200,
            animation: "trace-dash 1.4s var(--easing--ease-out) forwards",
          }}
        />
        <circle cx={targetX} cy={targetY} r="0" fill="var(--color--orange-400)" style={{
          animation: "trace-pulse 1.4s var(--easing--ease-out) forwards",
          animationDelay: "0.8s",
        }} />
      </svg>
      <div style={{
        position: "absolute", left: targetX - 90, top: targetY - 50,
        background: "var(--color--neutral-950)", color: "white",
        padding: "8px 12px", borderRadius: 8, boxShadow: "var(--shadow--dark)",
        display: "flex", alignItems: "center", gap: 8, fontSize: "var(--font-size--xs)",
        animation: "fadein 0.4s var(--easing--ease-out) 0.6s both",
      }}>
        <Icon name="lightning" size={12} style={{ color: "var(--color--orange-400)" }} />
        <span className="mono">{trace.wf}</span>
        <span>queued</span>
      </div>
      <style>{`
        @keyframes trace-dash  { to { stroke-dashoffset: 0; } }
        @keyframes trace-pulse { 0% { r: 0; opacity: 1; } 60% { r: 28; opacity: 0.4; } 100% { r: 40; opacity: 0; } }
      `}</style>
    </div>
  );
}

Object.assign(window, {
  DashboardsList, NewDashboardModal, ConfigureScreen,
  ToastStack, RunPanel, TraceOverlay,
});
