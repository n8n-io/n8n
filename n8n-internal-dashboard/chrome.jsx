// n8n chrome — left sidebar + top breadcrumb bar.
const { Icon } = window;

function Sidebar({ active, onNav }) {
  const items = [
    { id: "workflows",   icon: "workflows",   label: "Workflows" },
    { id: "credentials", icon: "credentials", label: "Credentials" },
    { id: "executions",  icon: "executions",  label: "Executions" },
    { id: "templates",   icon: "templates",   label: "Templates" },
    { id: "variables",   icon: "variables",   label: "Variables" },
    { id: "dashboards",  icon: "dashboards",  label: "Dashboards", isNew: true },
  ];
  return (
    <aside className="sidebar">
      <div className="sidebar__brand">
        <img src="assets/n8n-logo-icon.svg" alt="n8n" />
        <span style={{ fontSize: 18, fontWeight: 600, letterSpacing: -0.4 }}>n8n</span>
        <small>local</small>
      </div>

      <button className="sidebar__project">
        <span className="sidebar__project__avatar">M</span>
        <span style={{ flex: 1, textAlign: "left" }}>Makina&apos;s workspace</span>
        <Icon name="chevron-down" size={14} />
      </button>

      <div className="sidebar__section">
        {items.map(it => (
          <button
            key={it.id}
            className={"sidebar__item" + (active === it.id ? " is-active" : "") + (it.isNew ? " is-new" : "")}
            onClick={() => onNav(it.id)}
          >
            <span className="sidebar__item__icon"><Icon name={it.icon} size={16} /></span>
            <span>{it.label}</span>
          </button>
        ))}
      </div>

      <div className="sidebar__footer">
        <button className="sidebar__item"><span className="sidebar__item__icon"><Icon name="help" /></span>Help</button>
        <button className="sidebar__item"><span className="sidebar__item__icon"><Icon name="settings" /></span>Settings</button>
        <div className="sidebar__user">
          <span className="sidebar__user__avatar">MV</span>
          <div style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
            <span className="sidebar__user__name">Marina V.</span>
            <span className="sidebar__user__email">marina@n8n.io</span>
          </div>
        </div>
      </div>
    </aside>
  );
}

function Topbar({ crumbs = [], right = null }) {
  return (
    <header className="topbar">
      <div className="topbar__breadcrumbs">
        {crumbs.map((c, i) => (
          <React.Fragment key={i}>
            {i > 0 && <span className="topbar__breadcrumbs__sep"><Icon name="chevron-right" size={14} /></span>}
            {i === crumbs.length - 1
              ? <strong>{c.label}</strong>
              : <button onClick={c.onClick} style={{ color: "inherit" }}>{c.label}</button>}
          </React.Fragment>
        ))}
      </div>
      <div className="topbar__spacer" />
      <button className="topbar__action"><Icon name="search" />Search</button>
      <button className="topbar__action"><Icon name="bell" /></button>
      {right}
    </header>
  );
}

window.Sidebar = Sidebar;
window.Topbar = Topbar;
