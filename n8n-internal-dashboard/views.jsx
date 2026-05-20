// A2Dash view components — Overview / Table / Kanban / Detail drawer / Form
const { Icon, SEED, byId, stageById, ownerById, companyById, contactById, fmtMoney, fmtMoneyFull } = window;

/* ─────────────────────────────────────────────────────────
 *  Shared bits
 * ───────────────────────────────────────────────────────── */
function Avatar({ owner, size = 24 }) {
  if (!owner) return null;
  return (
    <span className="avatar" style={{ width: size, height: size, fontSize: size * 0.4, background: owner.color }}>
      {owner.initials}
    </span>
  );
}

function CompanyChip({ companyId }) {
  const c = companyById(companyId);
  if (!c) return null;
  return (
    <span className="row" style={{ gap: 8 }}>
      <span className="avatar" style={{ width: 22, height: 22, fontSize: 10, background: c.color, borderRadius: 4 }}>{c.domain}</span>
      <span>{c.name}</span>
    </span>
  );
}

function StagePill({ stageId }) {
  const s = stageById(stageId);
  if (!s) return null;
  return (
    <span className={"pill pill--" + s.pill}>
      <span className="pill__dot" />
      {s.label}
    </span>
  );
}

function ActionMenuBtn({ onClick }) {
  return (
    <button className="btn--ghost" onClick={onClick} style={{
      width: 28, height: 28, borderRadius: 4, display: "inline-flex",
      alignItems: "center", justifyContent: "center", color: "var(--color--text--tint-1)"
    }}>
      <Icon name="more" size={14} />
    </button>
  );
}

/* ─────────────────────────────────────────────────────────
 *  OverviewView — Dashboard view kind (KPIs + charts + lists)
 * ───────────────────────────────────────────────────────── */
function Sparkline({ points, color = "var(--color--orange-400)", height = 32, width = 90 }) {
  const max = Math.max(...points);
  const min = Math.min(...points);
  const range = max - min || 1;
  const step = width / (points.length - 1);
  const path = points.map((p, i) => {
    const x = i * step;
    const y = height - ((p - min) / range) * (height - 4) - 2;
    return (i === 0 ? "M" : "L") + x.toFixed(1) + " " + y.toFixed(1);
  }).join(" ");
  const area = path + ` L ${width} ${height} L 0 ${height} Z`;
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ overflow: "visible" }}>
      <path d={area} fill={color} opacity={0.12} />
      <path d={path} fill="none" stroke={color} strokeWidth="1.5" />
    </svg>
  );
}

function Kpi({ label, value, delta, deltaDir = "up", spark, sparkColor, icon }) {
  const dirColor = deltaDir === "up" ? "var(--color--green-700)" : "var(--color--red-700)";
  return (
    <div className="card" style={{ padding: "var(--spacing--sm) var(--spacing--md)", display: "flex", flexDirection: "column", gap: 6 }}>
      <div className="row" style={{ justifyContent: "space-between" }}>
        <div className="row" style={{ gap: 6, color: "var(--color--text--tint-1)", fontSize: "var(--font-size--xs)" }}>
          {icon && <Icon name={icon} size={14} />}
          <span>{label}</span>
        </div>
        {delta && (
          <span style={{ fontSize: "var(--font-size--2xs)", color: dirColor, fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 2 }}>
            <Icon name={deltaDir === "up" ? "trend-up" : "trend-down"} size={12} />
            {delta}
          </span>
        )}
      </div>
      <div style={{ fontSize: 26, fontWeight: 700, color: "var(--color--text--shade-1)", letterSpacing: -0.4, lineHeight: 1.1 }}>
        {value}
      </div>
      {spark && <Sparkline points={spark} color={sparkColor} />}
    </div>
  );
}

function StageFunnel({ deals }) {
  const counts = SEED.STAGES.map(s => ({
    stage: s,
    count: deals.filter(d => d.stage === s.id).length,
    value: deals.filter(d => d.stage === s.id).reduce((a, d) => a + d.value, 0),
  }));
  const max = Math.max(...counts.map(c => c.value), 1);
  return (
    <div className="card" style={{ padding: "var(--spacing--md)", display: "flex", flexDirection: "column", gap: 14 }}>
      <div className="row" style={{ justifyContent: "space-between" }}>
        <div className="col" style={{ gap: 2 }}>
          <span style={{ fontSize: "var(--font-size--sm)", fontWeight: 600 }}>Pipeline by stage</span>
          <span className="caption">Open + closed deals · this quarter</span>
        </div>
        <div className="chip">Value</div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {counts.map(({ stage, count, value }) => {
          const pct = (value / max) * 100;
          const colorMap = { unstarted: "var(--color--neutral-300)", started: "var(--color--blue-500)", "in-progress": "var(--color--gold-500)", completed: "var(--color--green-600)", canceled: "var(--color--neutral-300)" };
          const color = colorMap[stage.pill];
          return (
            <div key={stage.id} style={{ display: "grid", gridTemplateColumns: "110px 1fr 90px 40px", alignItems: "center", gap: 12 }}>
              <div className="row" style={{ gap: 6 }}>
                <span style={{ width: 8, height: 8, borderRadius: 2, background: color }} />
                <span style={{ fontSize: "var(--font-size--xs)", color: "var(--color--text--shade-1)" }}>{stage.label}</span>
              </div>
              <div style={{ height: 22, background: "var(--color--background--shade-1)", borderRadius: 4, overflow: "hidden" }}>
                <div style={{ width: pct + "%", height: "100%", background: color, opacity: 0.85, transition: "width 0.6s var(--easing--ease-out)" }} />
              </div>
              <span style={{ fontSize: "var(--font-size--xs)", fontFamily: "var(--font-family--monospace)", color: "var(--color--text--shade-1)", textAlign: "right" }}>
                {fmtMoney(value)}
              </span>
              <span className="caption" style={{ textAlign: "right" }}>{count}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function MonthlyWonChart() {
  // Synthetic 6-month series
  const months = ["Dec", "Jan", "Feb", "Mar", "Apr", "May"];
  const values = [120, 180, 95, 220, 310, 452]; // in $k
  const max = Math.max(...values);
  const W = 460, H = 170, P = 28;
  const innerW = W - P - 12;
  const innerH = H - P - 18;
  return (
    <div className="card" style={{ padding: "var(--spacing--md)", display: "flex", flexDirection: "column", gap: 12, gridColumn: "span 2" }}>
      <div className="row" style={{ justifyContent: "space-between" }}>
        <div className="col" style={{ gap: 2 }}>
          <span style={{ fontSize: "var(--font-size--sm)", fontWeight: 600 }}>Won revenue by month</span>
          <span className="caption">Last 6 months · USD</span>
        </div>
        <div className="row" style={{ gap: 6 }}>
          <span className="chip"><span style={{ width: 8, height: 8, borderRadius: 2, background: "var(--color--orange-400)" }} /> Won</span>
        </div>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ display: "block" }}>
        {[0, 0.25, 0.5, 0.75, 1].map((t, i) => (
          <line key={i} x1={P} x2={W - 12} y1={H - P + 6 - t * innerH} y2={H - P + 6 - t * innerH}
            stroke="var(--color--foreground--tint-1)" strokeWidth="1" strokeDasharray={i === 0 ? "0" : "3 4"} />
        ))}
        {[0, 0.5, 1].map((t, i) => (
          <text key={i} x={P - 6} y={H - P + 10 - t * innerH} textAnchor="end" fontSize="9"
            fill="var(--color--text--tint-1)" fontFamily="var(--font-family--monospace)">
            ${Math.round(t * max)}k
          </text>
        ))}
        {values.map((v, i) => {
          const x = P + 6 + (i + 0.5) * (innerW / values.length);
          const h = (v / max) * innerH;
          const y = H - P + 6 - h;
          const w = innerW / values.length - 18;
          const isLast = i === values.length - 1;
          return (
            <g key={i}>
              <rect x={x - w / 2} y={y} width={w} height={h} rx="3"
                fill={isLast ? "var(--color--orange-400)" : "var(--color--orange-200)"} />
              {isLast && (
                <text x={x} y={y - 6} textAnchor="middle" fontSize="10" fontWeight="600" fill="var(--color--orange-700)">
                  ${v}k
                </text>
              )}
              <text x={x} y={H - 6} textAnchor="middle" fontSize="10" fill="var(--color--text--tint-1)">{months[i]}</text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

function TopDealsList({ deals, onOpen }) {
  const top = [...deals].filter(d => d.stage !== "lost").sort((a, b) => b.value - a.value).slice(0, 5);
  return (
    <div className="card" style={{ padding: "var(--spacing--md)", display: "flex", flexDirection: "column", gap: 10 }}>
      <div className="row" style={{ justifyContent: "space-between" }}>
        <div className="col" style={{ gap: 2 }}>
          <span style={{ fontSize: "var(--font-size--sm)", fontWeight: 600 }}>Top open deals</span>
          <span className="caption">By value · click to inspect</span>
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column" }}>
        {top.map(d => (
          <button
            key={d.id}
            onClick={() => onOpen(d.id)}
            style={{
              display: "grid", gridTemplateColumns: "1fr auto auto", gap: 12, alignItems: "center",
              padding: "var(--spacing--2xs) 0",
              borderTop: "1px solid var(--color--foreground--tint-1)",
              textAlign: "left",
            }}
          >
            <div className="col" style={{ gap: 2, minWidth: 0 }}>
              <span style={{ fontSize: "var(--font-size--xs)", color: "var(--color--text--shade-1)", fontWeight: 500, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {d.name}
              </span>
              <span className="caption">{companyById(d.company)?.name}</span>
            </div>
            <StagePill stageId={d.stage} />
            <span className="mono" style={{ fontSize: "var(--font-size--xs)", color: "var(--color--text--shade-1)", fontWeight: 600 }}>
              {fmtMoney(d.value)}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

function ActivityFeed() {
  const items = [
    { icon: "lightning", color: "var(--color--orange-400)", title: "Workflow fired: Mark deal won",   sub: "Stark — Enterprise tier · 2m ago",      mono: "wf_won" },
    { icon: "mail",      color: "var(--color--blue-500)",   title: "Sent revised SOW draft",          sub: "Acme — Annual platform · 2h ago",       mono: "—" },
    { icon: "check",     color: "var(--color--green-600)",  title: "Deal moved to Won",               sub: "Dunder Mifflin — Renewal · today",       mono: "—" },
    { icon: "lightning", color: "var(--color--orange-400)", title: "Workflow fired: Send invoice",    sub: "Stark — Enterprise tier · 2m ago",      mono: "wf_invoice" },
    { icon: "phone",     color: "var(--color--purple-600)", title: "Logged: Discovery call",          sub: "Globe Tech — Workflow · yesterday",      mono: "—" },
  ];
  return (
    <div className="card" style={{ padding: "var(--spacing--md)", display: "flex", flexDirection: "column", gap: 10 }}>
      <div className="row" style={{ justifyContent: "space-between" }}>
        <div className="col" style={{ gap: 2 }}>
          <span style={{ fontSize: "var(--font-size--sm)", fontWeight: 600 }}>Recent activity</span>
          <span className="caption">Workflow runs + manual logs</span>
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {items.map((it, i) => (
          <div key={i} className="row" style={{ alignItems: "flex-start", gap: 10 }}>
            <span style={{
              width: 26, height: 26, borderRadius: 6, background: it.color, color: "white",
              display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0
            }}>
              <Icon name={it.icon} size={13} />
            </span>
            <div className="col" style={{ gap: 0, flex: 1, minWidth: 0 }}>
              <span style={{ fontSize: "var(--font-size--xs)", color: "var(--color--text--shade-1)" }}>{it.title}</span>
              <span className="caption">{it.sub}</span>
            </div>
            {it.mono !== "—" && <span className="mono caption">{it.mono}</span>}
          </div>
        ))}
      </div>
    </div>
  );
}

function OverviewView({ onOpen }) {
  const deals = SEED.DEALS;
  const open = deals.filter(d => d.stage !== "won" && d.stage !== "lost");
  const won = deals.filter(d => d.stage === "won");
  const lost = deals.filter(d => d.stage === "lost");
  const pipelineValue = open.reduce((a, d) => a + d.value, 0);
  const wonValue = won.reduce((a, d) => a + d.value, 0);
  const winRate = Math.round((won.length / (won.length + lost.length || 1)) * 100);
  const avgDeal = Math.round(deals.reduce((a, d) => a + d.value, 0) / deals.length);

  return (
    <div style={{ padding: "var(--spacing--lg)", display: "flex", flexDirection: "column", gap: "var(--spacing--md)" }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "var(--spacing--md)" }}>
        <Kpi label="Pipeline value"      value={fmtMoney(pipelineValue)} delta="+12.4%" deltaDir="up"   spark={[80, 92, 110, 102, 130, 145, 160, 158, 175]} sparkColor="var(--color--orange-400)" icon="money" />
        <Kpi label="Won this month"      value={fmtMoney(wonValue)}      delta="+38%"   deltaDir="up"   spark={[20, 28, 22, 35, 30, 48, 55, 62, 68]}        sparkColor="var(--color--green-600)" icon="trend-up" />
        <Kpi label="Win rate"            value={winRate + "%"}            delta="+6 pts" deltaDir="up"   spark={[50, 55, 60, 58, 64, 62, 68, 72, 75]}        sparkColor="var(--color--purple-600)" icon="target" />
        <Kpi label="Avg deal size"       value={fmtMoney(avgDeal)}        delta="-2.1%"  deltaDir="down" spark={[100, 110, 98, 105, 95, 92, 90, 88, 86]}     sparkColor="var(--color--neutral-500)" icon="graph" />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "var(--spacing--md)" }}>
        <MonthlyWonChart />
        <StageFunnel deals={deals} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--spacing--md)" }}>
        <TopDealsList deals={deals} onOpen={onOpen} />
        <ActivityFeed />
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────
 *  TableView — A2Dash table view kind
 * ───────────────────────────────────────────────────────── */
function TableView({ onOpen, onAction }) {
  const [sortKey, setSortKey] = React.useState("value");
  const [sortDir, setSortDir] = React.useState("desc");
  const [filter, setFilter] = React.useState("all"); // all | open | won | lost
  const [search, setSearch] = React.useState("");

  let rows = [...SEED.DEALS];
  if (filter === "open") rows = rows.filter(r => r.stage !== "won" && r.stage !== "lost");
  if (filter === "won")  rows = rows.filter(r => r.stage === "won");
  if (filter === "lost") rows = rows.filter(r => r.stage === "lost");
  if (search) rows = rows.filter(r => r.name.toLowerCase().includes(search.toLowerCase()));
  rows.sort((a, b) => {
    const av = a[sortKey]; const bv = b[sortKey];
    if (typeof av === "number") return sortDir === "asc" ? av - bv : bv - av;
    return sortDir === "asc" ? ("" + av).localeCompare(bv) : ("" + bv).localeCompare(av);
  });

  const Th = ({ k, children, align = "left", width }) => (
    <th
      onClick={() => { if (sortKey === k) setSortDir(sortDir === "asc" ? "desc" : "asc"); else { setSortKey(k); setSortDir("asc"); } }}
      style={{
        textAlign: align, padding: "10px 12px", fontWeight: 500, fontSize: "var(--font-size--2xs)",
        textTransform: "uppercase", letterSpacing: 0.04, color: "var(--color--text--tint-1)",
        borderBottom: "1px solid var(--color--foreground)", cursor: "pointer", userSelect: "none",
        whiteSpace: "nowrap", width
      }}
    >
      <span className="row" style={{ gap: 4, justifyContent: align === "right" ? "flex-end" : "flex-start" }}>
        {children}
        {sortKey === k && <Icon name="chevron-down" size={10} style={{ transform: sortDir === "asc" ? "rotate(180deg)" : "none" }} />}
      </span>
    </th>
  );

  return (
    <div style={{ padding: "var(--spacing--lg)", display: "flex", flexDirection: "column", gap: "var(--spacing--md)" }}>
      {/* Toolbar */}
      <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
        <div className="row" style={{ gap: 0, background: "var(--color--background--light-3)", border: "1px solid var(--color--foreground)", borderRadius: 4, padding: 2 }}>
          {[
            { id: "all",  label: "All",  n: SEED.DEALS.length },
            { id: "open", label: "Open", n: SEED.DEALS.filter(d => d.stage !== "won" && d.stage !== "lost").length },
            { id: "won",  label: "Won",  n: SEED.DEALS.filter(d => d.stage === "won").length },
            { id: "lost", label: "Lost", n: SEED.DEALS.filter(d => d.stage === "lost").length },
          ].map(t => (
            <button key={t.id} onClick={() => setFilter(t.id)} style={{
              padding: "5px 10px", borderRadius: 3, fontSize: "var(--font-size--xs)",
              background: filter === t.id ? "var(--color--background--shade-1)" : "transparent",
              color: filter === t.id ? "var(--color--text--shade-1)" : "var(--color--text)",
              fontWeight: filter === t.id ? 600 : 500,
            }}>
              {t.label} <span className="caption" style={{ marginLeft: 4 }}>{t.n}</span>
            </button>
          ))}
        </div>

        <div style={{ position: "relative" }}>
          <Icon name="search" size={14} style={{ position: "absolute", left: 10, top: 9, color: "var(--color--text--tint-1)" }} />
          <input className="input" placeholder="Search deals…" value={search} onChange={e => setSearch(e.target.value)}
            style={{ paddingLeft: 30, width: 240, height: 32 }} />
        </div>

        <button className="btn btn--secondary btn--sm"><Icon name="filter" size={14} />Filter</button>
        <button className="btn btn--secondary btn--sm"><Icon name="sort"   size={14} />Sort</button>
        <div style={{ flex: 1 }} />
        <button className="btn btn--secondary btn--sm"><Icon name="external" size={14} />Export</button>
        <button className="btn btn--primary btn--sm"><Icon name="plus" size={14} />New deal</button>
      </div>

      <div className="card" style={{ overflow: "hidden", padding: 0 }}>
        <table style={{ width: "100%", borderCollapse: "separate", borderSpacing: 0, fontSize: "var(--font-size--xs)" }}>
          <thead style={{ background: "var(--color--background--light-2)", position: "sticky", top: 0, zIndex: 1 }}>
            <tr>
              <Th k="name">Deal</Th>
              <Th k="stage" width={130}>Stage</Th>
              <Th k="company" width={180}>Company</Th>
              <Th k="owner" width={120}>Owner</Th>
              <Th k="value" align="right" width={110}>Value</Th>
              <Th k="probability" align="right" width={70}>Prob</Th>
              <Th k="expectedClose" width={130}>Close</Th>
              <th style={{ width: 44 }}></th>
            </tr>
          </thead>
          <tbody>
            {rows.map(d => (
              <tr key={d.id} onClick={() => onOpen(d.id)} style={{ cursor: "pointer", borderBottom: "1px solid var(--color--foreground--tint-1)" }}
                onMouseEnter={e => e.currentTarget.style.background = "var(--color--background--light-2)"}
                onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                <td style={{ padding: "10px 12px", color: "var(--color--text--shade-1)", fontWeight: 500 }}>
                  <span style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                    <span>{d.name}</span>
                    <span className="caption">{d.nextStep}</span>
                  </span>
                </td>
                <td style={{ padding: "10px 12px" }}><StagePill stageId={d.stage} /></td>
                <td style={{ padding: "10px 12px" }}><CompanyChip companyId={d.company} /></td>
                <td style={{ padding: "10px 12px" }}>
                  <span className="row" style={{ gap: 8 }}>
                    <Avatar owner={ownerById(d.owner)} size={22} />
                    <span style={{ color: "var(--color--text)" }}>{ownerById(d.owner)?.name}</span>
                  </span>
                </td>
                <td style={{ padding: "10px 12px", textAlign: "right", fontFamily: "var(--font-family--monospace)", color: "var(--color--text--shade-1)", fontWeight: 600 }}>
                  {fmtMoneyFull(d.value)}
                </td>
                <td style={{ padding: "10px 12px", textAlign: "right", color: "var(--color--text)" }}>
                  <span className="mono">{d.probability}%</span>
                </td>
                <td style={{ padding: "10px 12px", color: "var(--color--text)" }}>
                  {new Date(d.expectedClose).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                </td>
                <td style={{ padding: "6px 8px", textAlign: "right" }} onClick={e => e.stopPropagation()}>
                  <ActionMenuBtn onClick={() => onAction(d.id, "menu")} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="row" style={{ padding: "10px 14px", borderTop: "1px solid var(--color--foreground--tint-1)", justifyContent: "space-between" }}>
          <span className="caption">{rows.length} of {SEED.DEALS.length} deals · {fmtMoney(rows.reduce((a,d)=>a+d.value,0))} total</span>
          <div className="row" style={{ gap: 4 }}>
            <button className="btn btn--ghost btn--xs" disabled><Icon name="chevron-left" size={14} /></button>
            <span className="caption" style={{ padding: "0 8px" }}>1 / 1</span>
            <button className="btn btn--ghost btn--xs" disabled><Icon name="chevron-right" size={14} /></button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────
 *  KanbanView — status-aware kanban over deals
 * ───────────────────────────────────────────────────────── */
function KanbanCard({ deal, onOpen, onAction }) {
  const company = companyById(deal.company);
  const owner   = ownerById(deal.owner);
  return (
    <div className="card" onClick={() => onOpen(deal.id)} style={{
      padding: 12, cursor: "pointer", display: "flex", flexDirection: "column", gap: 10,
      borderColor: "var(--color--foreground--tint-1)",
      transition: "all var(--duration--snappy)",
    }}
      onMouseEnter={e => { e.currentTarget.style.boxShadow = "var(--shadow--card-hover)"; e.currentTarget.style.borderColor = "var(--color--foreground)"; }}
      onMouseLeave={e => { e.currentTarget.style.boxShadow = "none"; e.currentTarget.style.borderColor = "var(--color--foreground--tint-1)"; }}
    >
      <div className="row" style={{ gap: 8, alignItems: "flex-start" }}>
        <span style={{ fontSize: "var(--font-size--xs)", color: "var(--color--text--shade-1)", fontWeight: 500, flex: 1, lineHeight: 1.35 }}>
          {deal.name}
        </span>
      </div>

      <div className="row" style={{ gap: 6 }}>
        <CompanyChip companyId={deal.company} />
      </div>

      <div className="row" style={{ justifyContent: "space-between", marginTop: 2 }}>
        <span className="mono" style={{ fontSize: "var(--font-size--sm)", color: "var(--color--text--shade-1)", fontWeight: 600 }}>
          {fmtMoney(deal.value)}
        </span>
        <span className="row" style={{ gap: 6 }}>
          {deal.priority === "High" && <span className="chip" style={{ background: "var(--color--red-50)", color: "var(--color--red-700)", border: "1px solid var(--color--red-200)" }}>P1</span>}
          <Avatar owner={owner} size={22} />
        </span>
      </div>

      <div className="row" style={{ gap: 4, paddingTop: 6, borderTop: "1px solid var(--color--foreground--tint-1)" }}>
        <span className="caption" style={{ flex: 1 }}>
          {new Date(deal.expectedClose).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
          {" · "}{deal.probability}%
        </span>
        <button
          className="btn--ghost"
          onClick={e => { e.stopPropagation(); onAction(deal.id, "menu"); }}
          style={{ width: 22, height: 22, borderRadius: 4, color: "var(--color--text--tint-1)" }}
        >
          <Icon name="more" size={14} />
        </button>
      </div>
    </div>
  );
}

function KanbanView({ onOpen, onAction }) {
  const cols = SEED.STAGES.filter(s => s.id !== "lost"); // hide lost from the main pipeline
  return (
    <div style={{ padding: "var(--spacing--lg) var(--spacing--md)", display: "flex", flexDirection: "column", gap: "var(--spacing--sm)", overflow: "hidden" }}>
      <div className="row" style={{ padding: "0 var(--spacing--2xs)", gap: 8 }}>
        <span className="row" style={{ gap: 6 }}>
          <span className="caption">Group by</span>
          <button className="btn btn--secondary btn--sm">Stage <Icon name="chevron-down" size={12} /></button>
        </span>
        <div style={{ flex: 1 }} />
        <button className="btn btn--secondary btn--sm"><Icon name="filter" size={14} />Filter</button>
        <button className="btn btn--primary btn--sm"><Icon name="plus" size={14} />New deal</button>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: `repeat(${cols.length}, minmax(260px, 1fr))`, gap: 12, alignItems: "start" }}>
        {cols.map(stage => {
          const stageDeals = SEED.DEALS.filter(d => d.stage === stage.id);
          const total = stageDeals.reduce((a, d) => a + d.value, 0);
          return (
            <div key={stage.id} style={{
              background: "var(--color--background--light-2)",
              borderRadius: 6, padding: 10,
              display: "flex", flexDirection: "column", gap: 10,
            }}>
              <div className="row" style={{ justifyContent: "space-between", padding: "0 4px 6px", borderBottom: "1px solid var(--color--foreground--tint-1)" }}>
                <span className="row" style={{ gap: 8 }}>
                  <StagePill stageId={stage.id} />
                  <span className="caption">{stageDeals.length}</span>
                </span>
                <span className="caption mono">{fmtMoney(total)}</span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8, minHeight: 60 }}>
                {stageDeals.map(d => <KanbanCard key={d.id} deal={d} onOpen={onOpen} onAction={onAction} />)}
                <button className="btn btn--ghost btn--xs" style={{ justifyContent: "flex-start", color: "var(--color--text--tint-1)" }}>
                  <Icon name="plus" size={12} />Add deal
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────
 *  ContactsTable — minimal table for contacts entity
 * ───────────────────────────────────────────────────────── */
function ContactsTable({ onAction }) {
  return (
    <div style={{ padding: "var(--spacing--lg)", display: "flex", flexDirection: "column", gap: "var(--spacing--md)" }}>
      <div className="row">
        <span className="caption">{SEED.CONTACTS.length} contacts · across {SEED.COMPANIES.length} companies</span>
        <div style={{ flex: 1 }} />
        <button className="btn btn--secondary btn--sm"><Icon name="filter" size={14} />Filter</button>
        <button className="btn btn--primary btn--sm"><Icon name="plus" size={14} />New contact</button>
      </div>
      <div className="card" style={{ overflow: "hidden", padding: 0 }}>
        <table style={{ width: "100%", borderCollapse: "separate", borderSpacing: 0, fontSize: "var(--font-size--xs)" }}>
          <thead style={{ background: "var(--color--background--light-2)" }}>
            <tr>
              {["Name", "Title", "Company", "Email", "Phone", ""].map((h, i) => (
                <th key={i} style={{
                  textAlign: "left", padding: "10px 12px", fontWeight: 500, fontSize: "var(--font-size--2xs)",
                  textTransform: "uppercase", color: "var(--color--text--tint-1)",
                  borderBottom: "1px solid var(--color--foreground)"
                }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {SEED.CONTACTS.map(c => {
              const company = companyById(c.company);
              return (
                <tr key={c.id} style={{ borderBottom: "1px solid var(--color--foreground--tint-1)" }}>
                  <td style={{ padding: "10px 12px" }}>
                    <span className="row" style={{ gap: 8 }}>
                      <span className="avatar" style={{ width: 26, height: 26, fontSize: 10, background: company?.color || "#888" }}>
                        {c.name.split(" ").map(w => w[0]).slice(0,2).join("")}
                      </span>
                      <span style={{ color: "var(--color--text--shade-1)", fontWeight: 500 }}>{c.name}</span>
                    </span>
                  </td>
                  <td style={{ padding: "10px 12px", color: "var(--color--text)" }}>{c.title}</td>
                  <td style={{ padding: "10px 12px" }}><CompanyChip companyId={c.company} /></td>
                  <td style={{ padding: "10px 12px", color: "var(--color--text)" }} className="mono">{c.email}</td>
                  <td style={{ padding: "10px 12px", color: "var(--color--text)" }} className="mono">{c.phone}</td>
                  <td style={{ padding: "6px 8px", textAlign: "right" }}>
                    <ActionMenuBtn onClick={() => onAction(c.id, "menu")} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────
 *  DetailDrawer — A2Dash detail view kind
 *  Includes the actions panel — workflow_trigger lives here.
 * ───────────────────────────────────────────────────────── */
function Field({ label, children }) {
  return (
    <div className="col" style={{ gap: 2 }}>
      <span className="caption" style={{ textTransform: "uppercase", letterSpacing: 0.04, fontSize: 10 }}>{label}</span>
      <span style={{ fontSize: "var(--font-size--sm)", color: "var(--color--text--shade-1)" }}>{children}</span>
    </div>
  );
}

function DetailDrawer({ dealId, onClose, onFire, onEdit }) {
  const d = byId(SEED.DEALS, dealId);
  if (!d) return null;
  const company = companyById(d.company);
  const contact = contactById(d.contact);
  const owner = ownerById(d.owner);

  const actions = [
    { id: "won",     label: "Mark won",        icon: "check",     primary: true,                 wf: "wf_won" },
    { id: "lost",    label: "Mark lost",       icon: "x",         tone: "danger",                wf: "wf_lost" },
    { id: "handoff", label: "Handoff to onboarding", icon: "users",                           wf: "wf_handoff" },
    { id: "invoice", label: "Send invoice",    icon: "lightning",                              wf: "wf_invoice" },
  ];

  return (
    <React.Fragment>
      <div className="drawer-backdrop" onClick={onClose} />
      <aside className="drawer">
        <div style={{ padding: "var(--spacing--md) var(--spacing--lg)", borderBottom: "1px solid var(--color--foreground)", display: "flex", flexDirection: "column", gap: 8 }}>
          <div className="row">
            <span className="caption">Deal · {d.id}</span>
            <div style={{ flex: 1 }} />
            <button className="btn btn--ghost btn--xs" onClick={onEdit}><Icon name="edit" size={14} />Edit</button>
            <button className="btn btn--ghost btn--xs"><Icon name="copy" size={14} /></button>
            <button className="btn btn--ghost btn--xs" onClick={onClose}><Icon name="x" size={14} /></button>
          </div>
          <h2 style={{ margin: 0, fontSize: "var(--font-size--xl)", lineHeight: 1.2 }}>{d.name}</h2>
          <div className="row" style={{ gap: 10 }}>
            <StagePill stageId={d.stage} />
            <span className="mono" style={{ fontSize: "var(--font-size--md)", fontWeight: 700, color: "var(--color--text--shade-1)" }}>
              {fmtMoneyFull(d.value)}
            </span>
            <span className="caption">·</span>
            <span className="caption">{d.probability}% probability</span>
          </div>
        </div>

        <div className="scroll" style={{ padding: "var(--spacing--lg)", display: "flex", flexDirection: "column", gap: "var(--spacing--lg)" }}>
          {/* Action panel — the workflow trigger surface */}
          <div className="card" style={{
            padding: "var(--spacing--md)",
            background: "linear-gradient(180deg, var(--color--orange-50) 0%, var(--color--background--light-3) 100%)",
            borderColor: "var(--color--orange-150)",
          }}>
            <div className="row" style={{ marginBottom: 8 }}>
              <span className="row" style={{ gap: 6, fontSize: "var(--font-size--xs)", color: "var(--color--text--shade-1)", fontWeight: 600 }}>
                <Icon name="lightning" size={14} style={{ color: "var(--color--orange-600)" }} />
                Actions
              </span>
              <span className="caption" style={{ marginLeft: "auto" }}>each fires a workflow</span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              {actions.map(a => (
                <button
                  key={a.id}
                  className={"btn " + (a.primary ? "btn--primary" : "btn--secondary") + " btn--sm"}
                  onClick={() => onFire(d, a)}
                  title={"workflow_trigger · topic: deal." + a.id}
                  style={{
                    justifyContent: "flex-start",
                    ...(a.tone === "danger" && !a.primary ? { color: "var(--color--red-700)", borderColor: "var(--color--red-200)" } : {}),
                  }}
                >
                  <Icon name={a.icon} size={14} />
                  <span style={{ flex: 1, textAlign: "left" }}>{a.label}</span>
                  <span className="mono" style={{ fontSize: 10, opacity: a.primary ? 0.85 : 0.55 }}>{a.wf}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Fields grid */}
          <div className="col" style={{ gap: "var(--spacing--sm)" }}>
            <span style={{ fontSize: "var(--font-size--xs)", textTransform: "uppercase", letterSpacing: 0.04, color: "var(--color--text--tint-1)", fontWeight: 600 }}>
              Details
            </span>
            <div className="card" style={{ padding: "var(--spacing--md)", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--spacing--sm) var(--spacing--md)" }}>
              <Field label="Company"><CompanyChip companyId={d.company} /></Field>
              <Field label="Primary contact">{contact?.name} <span className="caption">· {contact?.title}</span></Field>
              <Field label="Owner"><span className="row" style={{gap:6}}><Avatar owner={owner} size={20} />{owner?.name}</span></Field>
              <Field label="Source">{d.source}</Field>
              <Field label="Priority"><span className="chip" style={{ background: d.priority === "High" ? "var(--color--red-50)" : "var(--color--background--light-2)", color: d.priority === "High" ? "var(--color--red-700)" : "var(--color--text)" }}>{d.priority}</span></Field>
              <Field label="Expected close">{new Date(d.expectedClose).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</Field>
              <Field label="Created">{new Date(d.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</Field>
              <Field label="Probability">
                <div className="row" style={{ gap: 8 }}>
                  <div style={{ flex: 1, height: 6, borderRadius: 3, background: "var(--color--background--shade-1)", overflow: "hidden" }}>
                    <div style={{ width: d.probability + "%", height: "100%", background: "var(--color--orange-400)" }} />
                  </div>
                  <span className="mono caption">{d.probability}%</span>
                </div>
              </Field>
            </div>
          </div>

          {/* Next step */}
          <div className="col" style={{ gap: "var(--spacing--sm)" }}>
            <span style={{ fontSize: "var(--font-size--xs)", textTransform: "uppercase", letterSpacing: 0.04, color: "var(--color--text--tint-1)", fontWeight: 600 }}>
              Next step
            </span>
            <div className="card" style={{ padding: "var(--spacing--md)", display: "flex", alignItems: "flex-start", gap: 10 }}>
              <span style={{ width: 18, height: 18, borderRadius: 4, border: "1.5px solid var(--color--neutral-300)", flexShrink: 0, marginTop: 1 }} />
              <span style={{ fontSize: "var(--font-size--sm)" }}>{d.nextStep}</span>
              <span className="caption" style={{ marginLeft: "auto" }}>{owner?.initials}</span>
            </div>
          </div>

          {/* Activity */}
          <div className="col" style={{ gap: "var(--spacing--sm)" }}>
            <span style={{ fontSize: "var(--font-size--xs)", textTransform: "uppercase", letterSpacing: 0.04, color: "var(--color--text--tint-1)", fontWeight: 600 }}>
              Activity
            </span>
            <div className="card" style={{ padding: "var(--spacing--md)", display: "flex", flexDirection: "column", gap: 12 }}>
              {SEED.ACTIVITIES.map(a => {
                const o = ownerById(a.who);
                const iconMap = { Email: "mail", Call: "phone", Meeting: "users", Note: "edit" };
                return (
                  <div key={a.id} className="row" style={{ alignItems: "flex-start", gap: 10 }}>
                    <span style={{
                      width: 24, height: 24, borderRadius: 6,
                      background: "var(--color--background--shade-1)", color: "var(--color--text--shade-1)",
                      display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0
                    }}>
                      <Icon name={iconMap[a.type] || "info"} size={12} />
                    </span>
                    <div className="col" style={{ gap: 0, flex: 1 }}>
                      <span style={{ fontSize: "var(--font-size--xs)", color: "var(--color--text--shade-1)" }}>{a.title}</span>
                      <span className="caption">{o?.name} · {a.when}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </aside>
    </React.Fragment>
  );
}

/* ─────────────────────────────────────────────────────────
 *  RecordForm — A2Dash form view kind (edit a record)
 * ───────────────────────────────────────────────────────── */
function RecordForm({ dealId, onClose, onSave }) {
  const original = byId(SEED.DEALS, dealId);
  const [d, setD] = React.useState({ ...original });
  const set = (k, v) => setD(prev => ({ ...prev, [k]: v }));

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 640 }} onClick={e => e.stopPropagation()}>
        <div className="modal__header">
          <span className="caption">Edit deal · {d.id}</span>
          <button className="modal__close" onClick={onClose}><Icon name="x" /></button>
        </div>
        <div className="modal__body">
          <div className="col" style={{ gap: "var(--spacing--md)" }}>
            <div>
              <label className="label">Deal name</label>
              <input className="input" value={d.name} onChange={e => set("name", e.target.value)} />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--spacing--md)" }}>
              <div>
                <label className="label">Stage <span className="caption">· status</span></label>
                <select className="input" value={d.stage} onChange={e => set("stage", e.target.value)}>
                  {SEED.STAGES.map(s => <option key={s.id} value={s.id}>{s.label} ({s.kind})</option>)}
                </select>
              </div>
              <div>
                <label className="label">Value <span className="caption">· currency</span></label>
                <input className="input mono" value={d.value} onChange={e => set("value", Number(e.target.value) || 0)} />
              </div>
              <div>
                <label className="label">Company <span className="caption">· relation</span></label>
                <select className="input" value={d.company} onChange={e => set("company", e.target.value)}>
                  {SEED.COMPANIES.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Owner <span className="caption">· user</span></label>
                <select className="input" value={d.owner} onChange={e => set("owner", e.target.value)}>
                  {SEED.OWNERS.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Expected close <span className="caption">· date</span></label>
                <input className="input" type="date" value={d.expectedClose} onChange={e => set("expectedClose", e.target.value)} />
              </div>
              <div>
                <label className="label">Probability <span className="caption">· percent</span></label>
                <input className="input mono" value={d.probability} onChange={e => set("probability", Number(e.target.value) || 0)} />
              </div>
            </div>
            <div>
              <label className="label">Next step</label>
              <textarea className="textarea" rows={3} value={d.nextStep} onChange={e => set("nextStep", e.target.value)} />
              <div className="help">When saved, triggers <code>workflow_trigger</code> · topic <code>deal.updated</code></div>
            </div>
          </div>
        </div>
        <div className="modal__footer">
          <button className="btn btn--secondary btn--sm" onClick={onClose}>Cancel</button>
          <button className="btn btn--primary btn--sm" onClick={() => onSave(d)}>Save changes</button>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { OverviewView, TableView, KanbanView, ContactsTable, DetailDrawer, RecordForm, StagePill, CompanyChip, Avatar });
