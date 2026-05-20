// Main app — routes between sidebar nav items, manages dashboard view state,
// and orchestrates modals/drawers + Tweaks panel.

const {
  Icon, SEED, byId,
  Sidebar, Topbar,
  DashboardsList, NewDashboardModal, ConfigureScreen,
  OverviewView, TableView, KanbanView, ContactsTable, DetailDrawer, RecordForm,
  ToastStack, RunPanel, TraceOverlay,
  TweaksPanel, useTweaks, TweakSection, TweakRadio, TweakToggle, TweakButton,
} = window;

const TWEAK_DEFAULS = /*EDITMODE-BEGIN*/{
  "actionFeedback": "toast",
  "emptyVariant":   "illustration",
  "showEmptyState": false
}/*EDITMODE-END*/;

/* ─────────────────────────────────────────────────────────
 *  Dashboard view — wraps the A2Dash views with a sub-tab bar
 * ───────────────────────────────────────────────────────── */
function DashboardView({ dashboardId, onConfigure, tweaks, fire }) {
  const d = byId(SEED.DASHBOARDS, dashboardId);
  const [view,    setView]    = React.useState("overview");
  const [openId,  setOpenId]  = React.useState(null);
  const [editId,  setEditId]  = React.useState(null);
  const [actionMenuFor, setActionMenuFor] = React.useState(null);

  const onOpen   = id => setOpenId(id);
  const onAction = (id) => setActionMenuFor(id);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
      {/* Dashboard header */}
      <div style={{
        padding: "var(--spacing--md) var(--spacing--lg) 0",
        background: "var(--color--background--light-3)",
        borderBottom: "1px solid var(--color--foreground)",
      }}>
        <div className="row" style={{ marginBottom: 12 }}>
          <span style={{ width: 36, height: 36, borderRadius: 8, background: "var(--color--orange-400)", color: "white", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
            <Icon name="dashboards" size={18} />
          </span>
          <div className="col" style={{ gap: 0 }}>
            <h1 style={{ margin: 0, fontSize: "var(--font-size--xl)" }}>{d?.name}</h1>
            <span className="caption">{d?.description} · {d?.entities} entities · last edited {d?.updated}</span>
          </div>
          <div style={{ flex: 1 }} />
          <div className="row" style={{ alignItems: "center" }}>
            {SEED.OWNERS.slice(0, 3).map((o, i) => (
              <span key={o.id} className="avatar" style={{ background: o.color, marginLeft: i ? -6 : 0, border: "2px solid var(--color--background--light-3)" }}>{o.initials}</span>
            ))}
          </div>
          <button className="btn btn--secondary btn--sm" onClick={onConfigure}><Icon name="settings" size={14} />Configure</button>
          <button className="btn btn--secondary btn--sm"><Icon name="external" size={14} />Share</button>
          <button className="btn btn--secondary btn--sm" style={{ width: 32, padding: 0, justifyContent: "center" }}><Icon name="more" size={14} /></button>
        </div>

        <div className="row" style={{ gap: 0 }}>
          {[
            { id: "overview", icon: "overview", label: "Overview" },
            { id: "pipeline", icon: "kanban",   label: "Pipeline" },
            { id: "deals",    icon: "table",    label: "Deals" },
            { id: "contacts", icon: "users",    label: "Contacts" },
          ].map(v => (
            <button key={v.id} onClick={() => setView(v.id)} style={{
              padding: "10px 14px", fontSize: "var(--font-size--xs)", fontWeight: 500,
              color: view === v.id ? "var(--color--text--shade-1)" : "var(--color--text)",
              borderBottom: view === v.id ? "2px solid var(--color--orange-400)" : "2px solid transparent",
              marginBottom: -1,
              display: "inline-flex", alignItems: "center", gap: 6,
            }}>
              <Icon name={v.icon} size={14} /> {v.label}
            </button>
          ))}
          <div style={{ flex: 1 }} />
          <span className="row" style={{ gap: 6, padding: "0 8px", fontSize: "var(--font-size--2xs)", color: "var(--color--text--tint-1)" }}>
            <span className="row" style={{ gap: 4 }}>
              <span style={{ width: 6, height: 6, borderRadius: 3, background: "var(--color--green-600)" }} />
              Live · Postgres · production
            </span>
          </span>
        </div>
      </div>

      {/* View body */}
      <div className="scroll" style={{ position: "relative" }}>
        {view === "overview" && <OverviewView onOpen={onOpen} />}
        {view === "pipeline" && <KanbanView onOpen={onOpen} onAction={onAction} />}
        {view === "deals"    && <TableView  onOpen={onOpen} onAction={onAction} />}
        {view === "contacts" && <ContactsTable onAction={onAction} />}
      </div>

      {/* Detail drawer */}
      {openId && (
        <DetailDrawer
          dealId={openId}
          onClose={() => setOpenId(null)}
          onEdit={() => { setEditId(openId); setOpenId(null); }}
          onFire={(deal, action) => fire(deal, action)}
        />
      )}

      {/* Form modal */}
      {editId && (
        <RecordForm
          dealId={editId}
          onClose={() => setEditId(null)}
          onSave={() => setEditId(null)}
        />
      )}

      {/* Quick action popover */}
      {actionMenuFor && (
        <QuickActionPopover
          dealId={actionMenuFor}
          onClose={() => setActionMenuFor(null)}
          onFire={(deal, action, evt) => {
            setActionMenuFor(null);
            const rect = evt?.target?.getBoundingClientRect?.();
            fire(deal, action, rect ? { startX: rect.left, startY: rect.top } : {});
          }}
        />
      )}
    </div>
  );
}

function QuickActionPopover({ dealId, onClose, onFire }) {
  const deal = byId(SEED.DEALS, dealId);
  if (!deal) return null;
  const actions = [
    { id: "won",     label: "Mark won",              icon: "check",     wf: "wf_won" },
    { id: "lost",    label: "Mark lost",             icon: "x",         wf: "wf_lost", danger: true },
    { id: "handoff", label: "Handoff to onboarding", icon: "users",     wf: "wf_handoff" },
    { id: "invoice", label: "Send invoice",          icon: "lightning", wf: "wf_invoice" },
  ];
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 8200, background: "transparent" }}>
      <div onClick={e => e.stopPropagation()} style={{
        position: "fixed", left: "50%", top: "50%", transform: "translate(-50%, -50%)",
        background: "var(--color--background--light-3)",
        borderRadius: 10, boxShadow: "var(--shadow--dark)",
        padding: 6, minWidth: 280,
        border: "1px solid var(--color--foreground)",
      }}>
        <div style={{ padding: "8px 10px 4px" }}>
          <span className="caption">Actions on</span>
          <div style={{ fontSize: "var(--font-size--xs)", fontWeight: 600 }}>{deal.name}</div>
        </div>
        {actions.map(a => (
          <button
            key={a.id}
            className="row"
            onClick={(e) => onFire(deal, a, e)}
            style={{
              width: "100%", padding: "8px 10px", borderRadius: 6, gap: 10,
              color: a.danger ? "var(--color--red-700)" : "var(--color--text--shade-1)",
            }}
            onMouseEnter={e => e.currentTarget.style.background = "var(--color--background--light-2)"}
            onMouseLeave={e => e.currentTarget.style.background = "transparent"}
          >
            <Icon name={a.icon} size={14} style={{ color: a.danger ? "var(--color--red-600)" : "var(--color--orange-600)" }} />
            <span style={{ flex: 1, textAlign: "left", fontSize: "var(--font-size--xs)" }}>{a.label}</span>
            <span className="mono caption">{a.wf}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────
 *  Placeholder screens — non-Dashboards sidebar items
 * ───────────────────────────────────────────────────────── */
function PlaceholderScreen({ which }) {
  const labelMap = { workflows: "Workflows", credentials: "Credentials", executions: "Executions", templates: "Templates", variables: "Variables" };
  const iconMap  = { workflows: "workflows", credentials: "credentials", executions: "executions", templates: "templates", variables: "variables" };
  return (
    <div style={{ padding: "var(--spacing--lg)", display: "flex", flexDirection: "column", gap: "var(--spacing--md)" }}>
      <h1 style={{ margin: 0, fontSize: "var(--font-size--2xl)" }}>{labelMap[which]}</h1>
      <div className="card" style={{
        padding: "var(--spacing--3xl)", textAlign: "center",
        color: "var(--color--text--tint-1)",
        background: "repeating-linear-gradient(135deg, var(--color--background--light-3) 0 10px, var(--color--background--light-2) 10px 20px)",
      }}>
        <Icon name={iconMap[which]} size={28} />
        <p style={{ margin: "12px 0 0", fontSize: "var(--font-size--sm)" }}>
          Existing n8n {labelMap[which]?.toLowerCase()} screen. Not the focus of this prototype.
        </p>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────
 *  App — single source of truth for tweak state + action feedback
 * ───────────────────────────────────────────────────────── */
function App() {
  const [navActive, setNavActive] = React.useState("dashboards");
  const [route, setRoute] = React.useState({ kind: "list" });
  const [modal, setModal] = React.useState(null);

  // Tweak state (single source of truth)
  const [tweaks, setTweak] = useTweaks(TWEAK_DEFAULS);

  // Action feedback state
  const [toasts, setToasts] = React.useState([]);
  const [run, setRun]       = React.useState(null);
  const [trace, setTrace]   = React.useState(null);

  function fire(deal, action, opts = {}) {
    const feedback = tweaks.actionFeedback;
    const wf  = action.wf || "wf_action";
    if (feedback === "toast") {
      const id = Math.random().toString(36).slice(2, 9);
      setToasts(prev => [...prev, {
        id,
        title: `Workflow fired · ${action.label}`,
        body: `${wf} · ${deal.name} · started just now`,
      }]);
      setTimeout(() => setToasts(prev => prev.filter(x => x.id !== id)), 5200);
    } else if (feedback === "panel") {
      setRun({ wf, topic: `deal.${action.id}`, dealId: deal.id, startedAt: "just now" });
    } else if (feedback === "trace") {
      const { startX = window.innerWidth - 300, startY = 200 } = opts;
      setTrace({ wf, topic: `deal.${action.id}`, startX, startY });
    }
  }

  function setNav(id) {
    setNavActive(id);
    if (id === "dashboards") setRoute({ kind: "list" });
  }

  const dashboardName = route.kind !== "list" && route.id ? byId(SEED.DASHBOARDS, route.id)?.name : null;
  const crumbs = [
    { label: "Dashboards", onClick: () => setRoute({ kind: "list" }) },
    ...(dashboardName ? [{ label: dashboardName, onClick: () => setRoute({ kind: "view", id: route.id }) }] : []),
    ...(route.kind === "configure" ? [{ label: "Configure" }] : []),
  ];

  let body;
  if (navActive !== "dashboards") {
    body = <div className="scroll"><PlaceholderScreen which={navActive} /></div>;
  } else if (route.kind === "list") {
    body = (
      <div className="scroll">
        <DashboardsList
          onOpen={(id) => setRoute({ kind: "view", id })}
          onNew={() => setModal("new")}
          onConfigure={(id) => setRoute({ kind: "configure", id })}
          emptyVariant={tweaks.emptyVariant}
          isEmpty={tweaks.showEmptyState}
        />
      </div>
    );
  } else if (route.kind === "view") {
    body = (
      <DashboardView
        dashboardId={route.id}
        onConfigure={() => setRoute({ kind: "configure", id: route.id })}
        tweaks={tweaks}
        fire={fire}
      />
    );
  } else if (route.kind === "configure") {
    body = <ConfigureScreen dashboardId={route.id} onBack={() => setRoute({ kind: "view", id: route.id })} onOpen={(id) => setRoute({ kind: "view", id })} />;
  }

  const topbarRight =
    route.kind === "list" && navActive === "dashboards"
      ? <button className="btn btn--primary btn--sm" onClick={() => setModal("new")}><Icon name="plus" size={14} />New dashboard</button>
      : null;

  return (
    <div className="app">
      <Sidebar active={navActive} onNav={setNav} />
      <main className="main">
        {navActive === "dashboards"
          ? <Topbar crumbs={crumbs.length ? crumbs : [{ label: "Dashboards" }]} right={topbarRight} />
          : <Topbar crumbs={[{ label: navActive[0].toUpperCase() + navActive.slice(1) }]} />}
        {body}
      </main>

      {modal === "new" && (
        <NewDashboardModal
          onClose={() => setModal(null)}
          onCreate={() => {
            setModal(null);
            setRoute({ kind: "view", id: "db_crm" });
          }}
        />
      )}

      {/* Action feedback overlays — shown anywhere */}
      {tweaks.actionFeedback === "toast" && <ToastStack toasts={toasts} onDismiss={id => setToasts(prev => prev.filter(x => x.id !== id))} />}
      {tweaks.actionFeedback === "panel" && <RunPanel run={run} onClose={() => setRun(null)} />}
      {tweaks.actionFeedback === "trace" && <TraceOverlay trace={trace} onDone={() => setTrace(null)} />}

      <TweaksPanel title="Tweaks">
        <TweakSection label="Action feedback">
          <TweakRadio
            value={tweaks.actionFeedback}
            onChange={v => setTweak("actionFeedback", v)}
            options={[
              { value: "toast", label: "Toast" },
              { value: "panel", label: "Panel" },
              { value: "trace", label: "Trace" },
            ]}
          />
          <TweakButton
            label="Fire sample workflow"
            onClick={() => {
              if (route.kind !== "view") setRoute({ kind: "view", id: "db_crm" });
              const sample = SEED.DEALS.find(d => d.stage === "negotiation") || SEED.DEALS[0];
              setTimeout(() => fire(sample, { id: "won", label: "Mark won", wf: "wf_won" }), 80);
            }}
          />
        </TweakSection>

        <TweakSection label="Empty state">
          <TweakToggle
            label="Preview empty state"
            value={!!tweaks.showEmptyState}
            onChange={v => setTweak("showEmptyState", v)}
          />
          <TweakRadio
            value={tweaks.emptyVariant}
            onChange={v => setTweak("emptyVariant", v)}
            options={[
              { value: "illustration", label: "Illustration" },
              { value: "cards",        label: "Cards" },
              { value: "minimal",      label: "Minimal" },
            ]}
          />
          <TweakButton
            label="Go to Dashboards list"
            secondary
            onClick={() => { setNavActive("dashboards"); setRoute({ kind: "list" }); }}
          />
        </TweakSection>
      </TweaksPanel>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
