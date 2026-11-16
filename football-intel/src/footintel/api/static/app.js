/* Football Intelligence dashboard. Plain JS, hash routing, data from /api/dash/*.
   Rules: every chart states its period and sample size; uncertainty is drawn when the
   sample is small; unavailable data is shown as such, never as zero. */

const API = "/api/dash";
/* Chart colours come from the CSS theme, so charts follow light and dark mode. */
const css = (v) => getComputedStyle(document.documentElement).getPropertyValue(v).trim();
const C = {};
function readColors() {
  Object.assign(C, { accent: css("--home"), accentSoft: css("--accent-faint"), ref: css("--muted"),
    up: css("--up"), down: css("--down"), grid: css("--line"), na: css("--na"), away: css("--away"),
    draw: css("--draw"), text: css("--text") });
  if (window.Chart) {
    Chart.defaults.font.family = css("--font") || "system-ui";
    Chart.defaults.color = C.ref;
    Chart.defaults.borderColor = C.grid;
  }
}
const COMP_FR = { "ENG-PL": "Premier League", "ESP-LL": "Liga", "ITA-SA": "Serie A", "GER-BL": "Bundesliga",
  "FRA-L1": "Ligue 1", "GER-DFB": "Coupe d'Allemagne", "UEFA-CL": "Ligue des champions", "UEFA-EL": "Ligue Europa",
  "UEFA-ECL": "Ligue Conférence", "ENG-FAC": "FA Cup", "ENG-EFL": "Coupe de la Ligue anglaise",
  "ESP-CDR": "Coupe du Roi", "ITA-CI": "Coupe d'Italie", "FRA-CDF": "Coupe de France",
  /* National teams (D82). */
  "INT-WC": "Coupe du monde", "INT-WCQ": "Éliminatoires Coupe du monde",
  "INT-EURO": "Euro", "INT-EUROQ": "Éliminatoires Euro", "INT-UNL": "Ligue des nations", "INT-AFCON": "CAN",
  "INT-AFCONQ": "Éliminatoires CAN", "INT-COPA": "Copa América", "INT-ASIA": "Coupe d'Asie", "INT-GOLD": "Gold Cup",
  "INT-FRI": "Matchs amicaux" };
/* Tab order on the match list: leagues, European cups, national cups, then national teams. */
const COMP_ORDER = ["ENG-PL", "ESP-LL", "ITA-SA", "GER-BL", "FRA-L1", "UEFA-CL", "UEFA-EL", "UEFA-ECL",
  "ENG-FAC", "ENG-EFL", "ESP-CDR", "ITA-CI", "GER-DFB", "FRA-CDF",
  "INT-WC", "INT-EURO", "INT-AFCON", "INT-COPA", "INT-UNL", "INT-WCQ", "INT-EUROQ", "INT-AFCONQ", "INT-ASIA",
  "INT-GOLD", "INT-FRI"];
const compRank = (c) => { const i = COMP_ORDER.indexOf(c); return i < 0 ? COMP_ORDER.length : i; };
const compName = (code, name) => COMP_FR[code] || name || code;
/* A collapsible panel for side information: closed unless `open`; `inner` sits inside a card. */
const fold = (title, body, { open = false, note = "", inner = false } = {}) =>
  `<details class="fold${inner ? " inner" : ""}"${open ? " open" : ""}><summary>${title}${note ? ` <span class="sum-note">${note}</span>` : ""}</summary><div class="fold-body">${body}</div></details>`;
const roundFr = (r) => String(r || "").replace(/^League,\s*/i, "").replace(/Matchday/i, "Journée").replace(/^Round of 16$/i, "Huitièmes de finale")
  .replace(/^Quarter-finals?$/i, "Quarts de finale").replace(/^Semi-finals?$/i, "Demi-finales").replace(/^Final$/i, "Finale");
/* Relative luminance of an "rgb(r,g,b)" string, to pick white or ink text on it. */
function luminance(rgbStr) {
  const [r, g, b] = rgbStr.match(/\d+/g).map((v) => { const c = v / 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
/* Solid blend of two hex colours: `share` of the first over the second. */
function mix(a, b, share) {
  const rgb = (h) => h.replace("#", "").match(/../g).map((x) => parseInt(x, 16));
  const [x, y] = [rgb(a), rgb(b)];
  return `rgb(${x.map((v, i) => Math.round(v * share + y[i] * (1 - share))).join(",")})`;
}
const FACTOR_FR = { elo_home: "Force Elo, domicile", elo_away: "Force Elo, extérieur", elo_diff: "Écart Elo (avantage domicile inclus)",
  form5_ppg_h: "Points par match, 5 derniers (domicile)", form5_ppg_a: "Points par match, 5 derniers (extérieur)",
  rest_days_h: "Jours de repos (domicile)", rest_days_a: "Jours de repos (extérieur)",
  games_14d_h: "Matchs joués en 14 jours (domicile)", games_14d_a: "Matchs joués en 14 jours (extérieur)",
  comp_over25_rate: "Plus de 2,5 buts dans la compétition", comp_draw_rate: "Matchs nuls dans la compétition",
  comp_goals_mean: "Buts par match dans la compétition" };
const STATUS = {
  rising: "en hausse", falling: "en baisse", emerging: "émergente", stable: "stable",
  disappeared: "disparue", unconfirmed: "non confirmée", insufficient_data: "données insuffisantes",
  validated_out_of_sample: "validé hors échantillon", robust: "robuste, à valider",
  robust_not_confirmed: "non confirmé hors échantillon", hypothesis: "hypothèse",
};
const METRIC_FR = {
  home_win: "Victoire domicile", draw: "Match nul", away_win: "Victoire extérieur",
  over_1_5: "Plus de 1,5 but", over_2_5: "Plus de 2,5 buts", over_3_5: "Plus de 3,5 buts",
  over_0_5: "Plus de 0,5 but", over_4_5: "Plus de 4,5 buts", btts: "Les deux marquent",
  goals: "Buts par match", nil_nil: "0-0", first_half_goals: "Buts en 1re mi-temps",
  second_half_goals: "Buts en 2e mi-temps", ht_leader_wins: "Leader à la pause gagne",
  ht_leader_loses: "Leader à la pause perd", shots: "Tirs", shots_on_target: "Tirs cadrés",
  corners: "Corners", yellow_cards: "Cartons jaunes", red_cards: "Cartons rouges", fouls: "Fautes",
  points: "Points par match", goals_for: "Buts marqués", goals_against: "Buts encaissés",
  win: "Victoire", clean_sheet: "Sans encaisser", failed_to_score: "Sans marquer",
  score_minus_elo_expected: "Résultat − attente Elo", shots_for: "Tirs", shots_against: "Tirs concédés",
  sot_for: "Tirs cadrés", sot_against: "Tirs cadrés concédés", corners_for: "Corners obtenus",
  ht_lead_kept: "Avance à la pause conservée", ht_deficit_recovered: "Retard à la pause effacé",
  scored_first_half: "Marque en 1re mi-temps", favourite_won: "Le favori gagne",
  goal_difference_volatility: "Volatilité de l'écart de buts",
};
const RATE = new Set(["home_win", "draw", "away_win", "over_0_5", "over_1_5", "over_2_5", "over_3_5",
  "over_4_5", "btts", "nil_nil", "ht_leader_wins", "ht_leader_loses", "win", "clean_sheet",
  "failed_to_score", "ht_lead_kept", "ht_deficit_recovered", "scored_first_half", "favourite_won",
  "home_clean_sheet", "away_clean_sheet", "win_to_nil", "ht_draw", "ht_over_0_5", "ht_over_1_5",
  "second_half_more_goals", "ht_level_decided", "extra_time", "penalty_shootout", "draw"]);
const isRate = (m) => RATE.has(m) || m.startsWith("score_") || m.startsWith("total_goals_");

const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const pct = (v, d = 1) => (v == null ? "n/d" : `${(100 * v).toFixed(d)} %`);
const num = (v, d = 2) => (v == null ? "n/d" : Number(v).toFixed(d));
const val = (m, v) => (isRate(m) ? pct(v) : num(v));
const diff = (m, v) => (v == null ? "n/d" : isRate(m) ? `${v > 0 ? "+" : ""}${(100 * v).toFixed(1)} pts` : `${v > 0 ? "+" : ""}${Number(v).toFixed(2)}`);
const fdate = (d) => (d ? new Date(d).toLocaleDateString("fr-FR") : "n/d");
const EXTRA_FR = {
  home_clean_sheet: "Domicile sans encaisser", away_clean_sheet: "Extérieur sans encaisser",
  win_to_nil: "Victoire sans encaisser", ht_draw: "Égalité à la pause", ht_over_0_5: "But avant la pause",
  ht_over_1_5: "2 buts ou plus avant la pause", ht_level_decided: "Égalité à la pause puis vainqueur",
  second_half_more_goals: "Plus de buts en 2e mi-temps", extra_time: "Prolongation",
  penalty_shootout: "Tirs au but",
};
function mname(m) {
  if (METRIC_FR[m]) return METRIC_FR[m];
  if (EXTRA_FR[m]) return EXTRA_FR[m];
  let r = m.match(/^score_(\d)_(\d)$/); if (r) return `Score ${r[1]}-${r[2]}`;
  r = m.match(/^total_goals_(\d)(plus)?$/); if (r) return r[2] ? `${r[1]} buts ou plus` : `Exactement ${r[1]} but${r[1] > 1 ? "s" : ""}`;
  return m;
}
const POP_FR = { "": "toutes", home: "à domicile", away: "à l'extérieur", vs_stronger: "contre plus fort",
  vs_similar: "contre niveau égal", vs_weaker: "contre plus faible" };
const EVENT_FR = { "1X2:home": "victoire domicile", "1X2:draw": "match nul", "1X2:away": "victoire extérieur",
  "OU2.5:over": "plus de 2,5 buts", "BTTS:yes": "les deux marquent" };
const NC_FR = [
  [/15-minute/, "Buts par tranche de 15 minutes"], [/early and late/, "Buts précoces, tardifs, égalisations"],
  [/first goal/, "Premier but et son effet"], [/penalties/, "Penalties"], [/xG/, "xG / xGA et grosses occasions"],
  [/possession/, "Possession, passes, pressing, PPDA"], [/formations/, "Formations et rôles"],
  [/line-ups/, "Compositions, absences, suspensions"], [/coach/, "Changements d'entraîneur"],
];
const ncName = (k) => (NC_FR.find(([re]) => re.test(k)) || [null, k])[1];
const MARKET_FR = { ll_1x2: "1X2", exact_score_ll: "score exact", total_goals_rps: "total de buts (RPS)",
  ou15_ll: "plus/moins 1,5", ou25_ll: "plus/moins 2,5", ou35_ll: "plus/moins 3,5", btts_ll: "les deux marquent",
  ll_ou25: "plus/moins 2,5", ll_btts: "les deux marquent",
  ht_over05_ll: "but avant la pause", ht_over15_ll: "2+ buts avant la pause", ht_1x2_ll: "1X2 à la pause" };
const VARIANT_FR = { team_form_residual: "Sur/sous-performance vs Elo", team_scoring_profile: "Profil offensif/défensif des équipes",
  team_game_state: "État à la mi-temps", competition_score_profile: "Profil de scores de la compétition", all: "Toutes les tendances" };
// Different names for one event: keep the first one listed.
const SAME_EVENT = { total_goals_5plus: "over_4_5", total_goals_0: "nil_nil", score_0_0: "nil_nil" };
const season = (y) => `${y}-${String((y + 1) % 100).padStart(2, "0")}`;
const badge = (status) => `<span class="badge ${esc(status)}">${esc(STATUS[status] || status)}</span>`;
const na = (title, why) => `<div class="unavailable"><strong>${esc(title)}</strong> — non collecté.<br><span class="small">${esc(why)}</span></div>`;

async function get(path) {
  if (window.fiGet) return window.fiGet(path);  // private site: data from Supabase (web/site.js)
  const r = await fetch(API + path);
  if (!r.ok) throw new Error(`${r.status} ${path}`);
  return r.json();
}

/* Admin token: asked on screen, kept for the browser session only. */
function getToken() { try { return sessionStorage.getItem("fi_token") || ""; } catch { return ""; } }
function setToken(t) { try { sessionStorage.setItem("fi_token", t); } catch { /* storage blocked */ } }
async function send(method, url, body) {
  const r = await fetch(url, { method, headers: { "Content-Type": "application/json", "X-Admin-Token": getToken() },
    body: body ? JSON.stringify(body) : undefined });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(data.detail || `${r.status}`);
  return data;
}
function tokenBox() {
  return `<div class="card" style="margin-bottom:16px"><div class="controls" style="margin:0">
    <label style="flex:1 1 280px">Jeton d'administration (gardé pour cette session seulement)
      <input type="password" id="token" value="${esc(getToken())}" autocomplete="off"></label>
    <button class="btn ghost" id="token-save" type="button">Enregistrer le jeton</button>
    <span class="small muted" id="token-state">${getToken() ? "Jeton enregistré." : "Sans jeton, les boutons d'action sont refusés."}</span></div></div>`;
}
function bindToken() {
  const b = document.getElementById("token-save");
  if (b) b.onclick = () => { setToken(document.getElementById("token").value.trim()); document.getElementById("token-state").textContent = "Jeton enregistré."; };
}

const charts = [];
function chart(id, config) {
  const el = document.getElementById(id);
  if (!el || !window.Chart) return;
  config.options = Object.assign({ responsive: true, maintainAspectRatio: false, animation: false,
    plugins: { legend: { labels: { boxWidth: 12 } } } }, config.options || {});
  charts.push(new Chart(el, config));
}
function resetCharts() { while (charts.length) charts.pop().destroy(); }

function params() {
  const q = location.hash.split("?")[1] || "";
  return Object.fromEntries(new URLSearchParams(q));
}
function go(page, p = {}) {
  const q = new URLSearchParams(Object.fromEntries(Object.entries(p).filter(([, v]) => v !== undefined && v !== ""))).toString();
  location.hash = `#/${page}${q ? "?" + q : ""}`;
}

function drawer(title, html) {
  document.getElementById("drawer-title").textContent = title;
  document.getElementById("drawer-body").innerHTML = html;
  document.getElementById("drawer").classList.remove("hidden");
}
document.getElementById("drawer-close").onclick = () => document.getElementById("drawer").classList.add("hidden");
document.getElementById("drawer").onclick = (e) => { if (e.target.id === "drawer") e.target.classList.add("hidden"); };

function matchTable(rows) {
  if (!rows.length) return `<p class="muted">Aucun match.</p>`;
  return `<div class="table-wrap"><table><thead><tr><th>Date</th><th>Saison</th><th>Match</th><th class="num">Score</th><th class="num">Mi-temps</th></tr></thead><tbody>${
    rows.map((r) => `<tr class="clickable" data-go="match" data-id="${r.id}" tabindex="0"><td>${fdate(r.kickoff_date)}</td><td>${season(r.season)}</td><td>${esc(r.home)} – ${esc(r.away)}${r.round ? `<div class="small muted">${esc(r.round)}</div>` : ""}</td><td class="num">${r.home_goals}-${r.away_goals}${r.aet_home_goals != null ? " (a.p.)" : ""}</td><td class="num">${r.ht_home_goals ?? "n/d"}-${r.ht_away_goals ?? "n/d"}</td></tr>`).join("")
  }</tbody></table></div>`;
}

/* ---------------- 1. Overview ---------------- */
async function overview() {
  const d = await get("/overview");
  const c = d.counts;
  const comp = d.trend_counts.filter((t) => t.population_type === "competition");
  const cnt = (s) => (comp.find((t) => t.status === s) || {}).n || 0;
  const active = d.active_model || {};
  const cal = d.calibration.filter((x) => x.model_name === (active.name || "") && x.segment.startsWith("calibration:all:"));
  const calTxt = cal.map((x) => `${EVENT_FR[x.segment.split(":").slice(2).join(":")]} : ${num(x.value, 3)}`).join(" · ");
  const seen = new Set();
  const watch = d.watch.filter((t) => { const k = `${t.competition}|${SAME_EVENT[t.metric] || t.metric}`; if (seen.has(k)) return false; seen.add(k); return true; }).slice(0, 8);
  const worst = cal.reduce((a, b) => (b.value > (a?.value ?? -1) ? b : a), null);
  return `
  <div class="page-head"><div><h1>Tendances</h1>
  <p>Ce qui change dans les compétitions suivies, et si cela compte pour les prédictions.</p></div></div>
  <div class="grid kpis">
    <div class="card"><div class="kpi-label">Matchs analysés</div><div class="kpi-value">${c.matches.toLocaleString("fr-FR")}</div>
      <div class="kpi-note">${c.competitions} compétitions · ${fdate(c.first_date)} → ${fdate(c.last_result)}</div>
      <div class="meta"><span class="badge fact">fait</span> résultats réels</div></div>
    <div class="card clickable" data-go="competitions" tabindex="0"><div class="kpi-label">Tendances de compétition</div>
      <div class="kpi-value">${cnt("rising") + cnt("falling")}</div>
      <div class="kpi-note">${cnt("rising")} en hausse · ${cnt("falling")} en baisse · ${cnt("emerging")} émergentes · ${cnt("unconfirmed")} non confirmées</div>
      <div class="meta">Calcul n° ${d.trend_run} · fenêtre de 380 matchs contre les 1 900 précédents</div></div>
    <div class="card clickable" data-go="competitions" tabindex="0"><div class="kpi-label">Particularités validées</div>
      <div class="kpi-value">${d.validated_effects}</div>
      <div class="kpi-note">Écarts à un modèle qui ignore la compétition, significatifs sur 2006-2020 et confirmés sur 2021-2026</div></div>
    <div class="card clickable" data-go="performance" tabindex="0"><div class="kpi-label">Modèle actif</div>
      <div class="kpi-value" style="font-size:1.1rem">${esc(active.name)} v${active.version}</div>
      <div class="kpi-note">Promu le ${fdate(active.promoted_at)} · entraîné sur ${(active.n_train || 0).toLocaleString("fr-FR")} matchs</div>
      <div class="meta">Calibration la moins bonne : ${worst ? esc(EVENT_FR[worst.segment.split(":").slice(2).join(":")]) + " (ECE " + num(worst.value, 3) + ")" : "n/d"}</div></div>
  </div>
  <div class="grid two">
    <div class="card"><h2>Tendances à surveiller</h2>
      <p class="question">Quelles fréquences s'écartent de leur référence historique dans les compétitions cibles ?</p>
      <ul class="list">${watch.length ? watch.map((t) => `
        <li class="clickable" data-go="competitions" data-c="${esc(t.competition)}" tabindex="0">
          <div class="row-title">${esc(t.competition)} — ${esc(mname(t.metric))} ${badge(t.status)}</div>
          <div>${val(t.metric, t.observed)} contre ${val(t.metric, t.reference)} (${diff(t.metric, t.abs_diff)})</div>
          <div class="meta">n = ${t.n} · ${fdate(t.period_start)} → ${fdate(t.period_end)} · p ajusté ${num(t.adjusted_p_value, 3)} · confiance ${esc(t.confidence)}</div>
        </li>`).join("") : `<li class="muted">Aucune tendance significative après correction des tests multiples.</li>`}</ul></div>
    <div class="card"><h2>Particularités confirmées des compétitions</h2>
      <p class="question">Qu'est-ce qui distingue une compétition, au-delà du niveau des équipes engagées ?</p>
      <ul class="list">${d.validated_targets.map((p) => {
        const [, comp, , metric] = p.key.split("|");
        return `<li class="clickable" data-go="competitions" data-c="${esc(comp)}" tabindex="0">
          <div class="row-title">${esc(comp)} — ${esc(mname(metric))} <span class="badge fact">validé hors échantillon</span></div>
          <div>${diff(metric, p.effect)} sur 2006-2020 (n = ${p.n}), puis ${diff(metric, p.out_of_sample_effect)} sur 2021-2026 (n = ${p.out_of_sample_n})</div></li>`;
      }).join("")}</ul></div>
    <div class="card"><h2>Fiabilité des probabilités par marché</h2>
      <p class="question">Quand le modèle annonce x %, l'événement arrive-t-il x % du temps ?</p>
      <p>${esc(calTxt) || "n/d"}</p>
      <p class="meta">Erreur de calibration moyenne (ECE), backtest 2021-2026, 9 168 matchs. En dessous de 0,02 : bonne calibration. Détail dans <a href="#/performance">Performance</a>.</p>
      <p class="small"><span class="badge emerging">à surveiller</span> Coupes d'Europe : calibration nettement moins bonne qu'en championnat (pas de cotes, moins de matchs).</p></div>
    <div class="card"><h2>Qualité et couverture des données</h2>
      <p class="question">Quelles anomalies et quels manques limitent l'analyse ?</p>
      <ul class="list">${d.quality_issues.map((q) => `<li><span class="badge ${q.severity === "error" ? "falling" : "stable"}">${esc(q.severity)}</span> ${esc(q.code)} : ${q.n}</li>`).join("")}
      ${Object.keys(d.not_collected).map((k) => `<li><span class="badge na">non collecté</span> ${esc(ncName(k))}</li>`).join("")}</ul>
      <p class="meta">Aucune source autorisée ne fournit ces données ; elles ne sont ni estimées ni remplacées par zéro.</p>
      <p class="meta">${c.upcoming} match(s) à venir publiés par les sources.</p></div>
  </div>`;
}

/* ---------------- 2. Competitions ---------------- */
async function competitions() {
  const p = params();
  const list = await get("/competitions");
  const code = p.c || "ENG-PL";
  const q = new URLSearchParams();
  if (p.from) q.set("season_from", p.from);
  if (p.to) q.set("season_to", p.to);
  const d = await get(`/competition/${code}?${q}`);
  const options = list.map((x) => `<option value="${esc(x.code)}" ${x.code === code ? "selected" : ""}>${esc(x.name)}${x.is_target ? "" : " (contexte)"}${x.matches ? "" : " — non couverte"}</option>`).join("");
  let html = `<h1>Analyse des compétitions</h1>
  <div class="controls"><label>Compétition<select id="f-comp">${options}</select></label>`;
  if (!d.available) {
    return html + `</div><div class="card">${na(d.info?.name || code, d.reason)}</div>`;
  }
  const [lo, hi] = d.period;
  const years = []; for (let y = d.info.first_season; y <= d.info.last_season; y++) years.push(y);
  const yOpt = (sel) => years.map((y) => `<option value="${y}" ${y === sel ? "selected" : ""}>${season(y)}</option>`).join("");
  html += `<label>De<select id="f-from">${yOpt(lo)}</select></label><label>À<select id="f-to">${yOpt(hi)}</select></label>
    <label>Indicateur de la courbe<select id="f-metric">${["over_2_5", "btts", "draw", "home_win", "away_win", "over_1_5", "over_3_5", "goals"].map((m) => `<option value="${m}">${mname(m)}</option>`).join("")}</select></label></div>`;
  const nAll = d.seasons.reduce((a, s) => a + s.n, 0);
  html += `<p class="muted">${esc(d.info.name)} · ${season(lo)} à ${season(hi)} · ${nAll.toLocaleString("fr-FR")} matchs. Référence historique = toutes les saisons de la période choisie.</p>
  <div class="grid two">
    <div class="card"><h2>Évolution par saison</h2><p class="question">La fréquence augmente-t-elle, baisse-t-elle ou reste-t-elle stable ?</p>
      <div class="chart-box tall"><canvas id="ch-trend"></canvas></div>
      <p class="legend-note">Bande verte : intervalle de confiance à 95 % de chaque saison (Wilson). Ligne grise : moyenne de la période.</p></div>
    <div class="card"><h2>Saison récente contre référence</h2><p class="question">La dernière saison complète se distingue-t-elle de la référence ?</p>
      <div class="chart-box tall"><canvas id="ch-compare"></canvas></div>
      <p class="legend-note" id="compare-note"></p></div>
    <div class="card"><h2>Matrice des scores exacts</h2><p class="question">Quels scores sont les plus et les moins fréquents ? Cliquez une case pour voir les matchs.</p>
      <div class="table-wrap" id="heatmap"></div><p class="legend-note">90 minutes. 5 = 5 buts ou plus. Intensité proportionnelle à la fréquence.</p></div>
    <div class="card"><h2>Distribution du nombre de buts</h2><p class="question">Combien de buts par match ?</p>
      <div class="chart-box"><canvas id="ch-totals"></canvas></div></div>
    <div class="card"><h2>Première et deuxième mi-temps</h2><p class="question">Quand les buts sont-ils marqués ?</p>
      <div class="chart-box"><canvas id="ch-halves"></canvas></div>
      <div style="margin-top:12px">${na("Buts par tranche de 15 minutes (0-15 … 76-90+)", d.unavailable.goals_by_period)}</div></div>
    <div class="card"><h2>Indicateurs de jeu par saison</h2><p class="question">Volume de tirs, corners et discipline.</p>
      <div class="chart-box"><canvas id="ch-stats"></canvas></div>
      <p class="legend-note">${d.stats.length ? `n = ${d.stats.reduce((a, s) => a + s.n, 0).toLocaleString("fr-FR")} matchs avec statistiques.` : "Aucune statistique de match pour cette compétition."} ${esc(d.definition_warnings.yellow_cards)}</p>
      <div style="margin-top:12px">${na("xG, possession, pressing", d.unavailable.xg)}</div></div>
  </div>
  <div class="card" style="margin-top:16px"><h2>Tendances détectées (dernier calcul)</h2><p class="question">Quels indicateurs s'écartent de la référence, et avec quelle confiance ?</p>
    <p class="small"><label style="flex-direction:row;display:inline-flex;gap:6px"><input type="checkbox" id="show-stable" style="min-width:0"> afficher aussi les ${d.trends.filter((t) => t.window === "medium" && (t.status === "stable" || t.status === "insufficient_data")).length} indicateurs stables</label></p>
    <div class="table-wrap"><table class="hide-stable" id="trend-table"><thead><tr><th>Indicateur</th><th>Fenêtre</th><th class="num">n</th><th class="num">Observé</th><th class="num">Lissé</th><th class="num">Référence</th><th class="num">Écart</th><th class="num">p ajusté</th><th>Statut</th><th>Persistance passée</th></tr></thead><tbody>
    ${d.trends.filter((t) => t.window === "medium" || t.status !== "stable").map((t) => {
      const hide = t.status === "stable" || t.status === "insufficient_data";
      const o = t.out_of_sample || {};
      return `<tr class="${hide ? "row-stable" : ""}"><td>${esc(mname(t.metric))}<div class="small muted">${esc(t.definition)}</div></td><td>${t.window === "short" ? "60 m." : "380 m."}<div class="small muted">${fdate(t.period_start)}→${fdate(t.period_end)}</div></td><td class="num">${t.n}</td><td class="num">${val(t.metric, t.observed)}</td><td class="num">${val(t.metric, t.smoothed)}</td><td class="num">${val(t.metric, t.reference)}</td><td class="num">${diff(t.metric, t.abs_diff)}</td><td class="num">${num(t.adjusted_p_value, 3)}</td><td>${badge(t.status)}</td><td class="small">${o.persistence_slope != null ? `${num(o.persistence_slope)} [${num(o.slope_ci[0])} ; ${num(o.slope_ci[1])}]` : "n/d"}</td></tr>`;
    }).join("")}</tbody></table></div>
    <p class="legend-note">Persistance passée : part d'un écart qui s'est maintenue dans la fenêtre suivante, mesurée à de nombreuses dates depuis 2010 (0 = bruit, 1 = durable).</p></div>
  <div class="card" style="margin-top:16px"><h2>Particularités par rapport au niveau des équipes</h2><p class="question">L'écart vient-il de la compétition elle-même ou des équipes engagées ?</p>
    <div class="table-wrap"><table><thead><tr><th>Indicateur</th><th>Segment</th><th class="num">n 2006-2020</th><th class="num">Écart</th><th class="num">IC 95 %</th><th class="num">Écart 2021-2026</th><th>Statut</th></tr></thead><tbody>
    ${d.effects.map((e) => `<tr><td>${esc(mname(e.metric))}</td><td>${esc(e.segment)}</td><td class="num">${e.n}</td><td class="num">${diff(e.metric, e.effect)}</td><td class="num">[${diff(e.metric, e.ci_low)} ; ${diff(e.metric, e.ci_high)}]</td><td class="num">${diff(e.metric, e.out_of_sample_effect)} (n=${e.out_of_sample_n ?? "n/d"})</td><td>${badge(e.status)}</td></tr>`).join("") || `<tr><td colspan="7" class="muted">Aucun effet robuste.</td></tr>`}
    </tbody></table></div><p class="legend-note">Écart = taux observé − probabilité d'un modèle Elo-Poisson qui connaît la force des équipes mais pas la compétition.</p></div>`;

  setTimeout(() => {
    document.getElementById("show-stable").onchange = (e) => document.getElementById("trend-table").classList.toggle("hide-stable", !e.target.checked);
    const comp = document.getElementById("f-comp");
    comp.onchange = () => go("competitions", { c: comp.value });
    document.getElementById("f-from").onchange = (e) => go("competitions", { c: code, from: e.target.value, to: hi });
    document.getElementById("f-to").onchange = (e) => go("competitions", { c: code, from: lo, to: e.target.value });
    const drawTrend = (metric) => {
      charts.filter((x) => x.canvas.id === "ch-trend").forEach((x) => x.destroy());
      const s = d.seasons;
      const total = s.reduce((a, x) => a + x.n, 0);
      const mean = s.reduce((a, x) => a + x[metric] * x.n, 0) / total;
      const rate = isRate(metric);
      const k = rate ? 100 : 1;
      const ds = [{ label: mname(metric), data: s.map((x) => x[metric] * k), borderColor: C.accent, backgroundColor: C.accent, tension: 0.2, pointRadius: 3 },
        { label: "Moyenne de la période", data: s.map(() => mean * k), borderColor: C.ref, borderDash: [5, 4], pointRadius: 0 }];
      if (rate) {
        ds.unshift({ label: "IC 95 % haut", data: s.map((x) => x[`${metric}_ci`][1] * 100), borderWidth: 0, pointRadius: 0, backgroundColor: C.accentSoft, fill: "+1" },
          { label: "IC 95 % bas", data: s.map((x) => x[`${metric}_ci`][0] * 100), borderWidth: 0, pointRadius: 0, fill: false });
      }
      chart("ch-trend", { type: "line", data: { labels: s.map((x) => season(x.season)), datasets: ds },
        options: { plugins: { legend: { labels: { filter: (i) => !i.text.startsWith("IC") } },
          tooltip: { callbacks: { afterBody: (items) => `n = ${s[items[0].dataIndex].n} matchs` } } },
          scales: { y: { title: { display: true, text: rate ? "%" : "buts" } } } } });
    };
    const sel = document.getElementById("f-metric");
    sel.onchange = () => drawTrend(sel.value);
    drawTrend("over_2_5");

    const s = d.seasons; const complete = s.filter((x) => x.n >= 0.8 * Math.max(...s.map((y) => y.n)));
    const last = complete[complete.length - 1];
    const total = s.reduce((a, x) => a + x.n, 0);
    const keys = ["home_win", "draw", "away_win", "btts", "over_1_5", "over_2_5", "over_3_5"];
    const ref = keys.map((m) => (100 * s.reduce((a, x) => a + x[m] * x.n, 0)) / total);
    chart("ch-compare", { type: "bar", data: { labels: keys.map(mname), datasets: [
      { label: `${season(last.season)} (n=${last.n})`, data: keys.map((m) => 100 * last[m]), backgroundColor: C.accent },
      { label: `Référence ${season(lo)}–${season(hi)} (n=${total})`, data: ref, backgroundColor: C.ref }] },
      options: { scales: { y: { title: { display: true, text: "%" } } } } });
    document.getElementById("compare-note").textContent = `Dernière saison complète : ${season(last.season)}. Intervalle ±${(1.96 * Math.sqrt(0.25 / last.n) * 100).toFixed(1)} pts au plus sur un taux de saison.`;

    const grid = Array.from({ length: 6 }, () => Array(6).fill(0));
    d.scores.forEach((x) => { grid[x.h][x.a] = x.n; });
    const n = d.scores.reduce((a, x) => a + x.n, 0);
    const max = Math.max(...grid.flat());
    let hm = `<table class="heatmap"><tr><th>Dom. \\ Ext.</th>${[0, 1, 2, 3, 4, "5+"].map((g) => `<th>${g}</th>`).join("")}</tr>`;
    grid.forEach((row, h) => {
      hm += `<tr><th>${h === 5 ? "5+" : h}</th>${row.map((v, a) => {
        const share = max ? 0.08 + 0.85 * v / max : 0;
        const bg = mix(C.accent, css("--surface"), share);
        const dark = luminance(bg) < 0.21;
        return `<td style="background:${bg};color:${dark ? "#ffffff" : "#111111"}" title="${h}-${a} : ${v} matchs" data-h="${h}" data-a="${a}">${pct(v / n)}</td>`;
      }).join("")}</tr>`;
    });
    document.getElementById("heatmap").innerHTML = hm + `</table><p class="meta">n = ${n.toLocaleString("fr-FR")} matchs</p>`;
    document.querySelectorAll(".heatmap td").forEach((td) => td.onclick = async () => {
      const rows = await get(`/matches?competition=${code}&home_goals=${td.dataset.h}&away_goals=${td.dataset.a}&limit=200`);
      drawer(`${d.info.name} — score ${td.dataset.h}-${td.dataset.a}`, `<p class="muted">${rows.length} matchs les plus récents (200 au plus).</p>` + matchTable(rows.filter((r) => r.season >= lo && r.season <= hi)));
    });

    chart("ch-totals", { type: "bar", data: { labels: d.totals.map((x) => (x.goals === 6 ? "6+" : x.goals)),
      datasets: [{ label: `Part des matchs (n=${n})`, data: d.totals.map((x) => (100 * x.n) / n), backgroundColor: C.accent }] },
      options: { scales: { y: { title: { display: true, text: "%" } }, x: { title: { display: true, text: "buts dans le match" } } } } });
    chart("ch-halves", { type: "bar", data: { labels: s.map((x) => season(x.season)), datasets: [
      { label: "1re mi-temps", data: s.map((x) => x.first_half_goals), backgroundColor: C.accent },
      { label: "2e mi-temps", data: s.map((x) => x.second_half_goals), backgroundColor: C.ref }] },
      options: { scales: { x: { stacked: true }, y: { stacked: true, title: { display: true, text: "buts par match" } } } } });
    if (d.stats.length) {
      chart("ch-stats", { type: "line", data: { labels: d.stats.map((x) => season(x.season)), datasets: [
        { label: "Tirs", data: d.stats.map((x) => x.shots), borderColor: C.accent },
        { label: "Tirs cadrés", data: d.stats.map((x) => x.sot), borderColor: C.away },
        { label: "Corners", data: d.stats.map((x) => x.corners), borderColor: C.ref },
        { label: "Cartons jaunes", data: d.stats.map((x) => x.yellows), borderColor: C.down }] },
        options: { scales: { y: { title: { display: true, text: "par match (2 équipes)" } } } } });
    } else {
      document.getElementById("ch-stats").parentElement.innerHTML = na("Statistiques de match", "La source de cette compétition (openfootball) ne fournit que les scores.");
    }
  });
  return html;
}

/* ---------------- 3. Teams ---------------- */
async function teams() {
  const p = params();
  const compCode = p.c || "ENG-PL";
  const list = await get(`/teams?competition=${compCode}`);
  const comps = (await get("/competitions")).filter((x) => x.is_target && x.type === "league");
  const tid = Number(p.t || (list[0] || {}).id);
  let html = `<h1>Profil des équipes</h1><div class="controls">
    <label>Championnat<select id="f-tc">${comps.map((x) => `<option value="${x.code}" ${x.code === compCode ? "selected" : ""}>${esc(x.name)}</option>`).join("")}</select></label>
    <label>Équipe<select id="f-team">${list.map((t) => `<option value="${t.id}" ${t.id === tid ? "selected" : ""}>${esc(t.name)}</option>`).join("")}</select></label></div>`;
  if (!tid) return html + `<p class="muted">Aucune équipe.</p>`;
  const d = await get(`/team/${tid}`);
  const s = d.series;
  const avg = (arr, k) => { const v = arr.map((x) => x[k]).filter((x) => x != null); return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null; };
  const cnt = (arr, k) => arr.filter((x) => x[k] != null).length;
  const last6 = s.slice(-6), last19 = s.slice(-19), ref = s.slice(-95, -19);
  const curSeason = s.length ? s[s.length - 1].season : null;
  const seasonRows = s.filter((x) => x.season === curSeason);
  const kpi = (label, k) => `<div class="card"><div class="kpi-label">${label}</div><div class="kpi-value">${num(avg(last6, k))}</div>
    <div class="kpi-note">6 derniers matchs · saison ${curSeason ? season(curSeason) : ""} ${num(avg(seasonRows, k))} (n=${cnt(seasonRows, k)}) · référence ${num(avg(ref, k))} (n=${cnt(ref, k)})</div></div>`;
  html += `<p class="muted">${esc(d.info.name)} · ${s.length} derniers matchs en base, toutes compétitions suivies. Référence = les 76 matchs précédant les 19 derniers.</p>
  <div class="grid kpis">${kpi("Buts marqués / match", "gf")}${kpi("Buts encaissés / match", "ga")}${kpi("Tirs / match", "shots_for")}
    <div class="card"><div class="kpi-label">xG / match</div><div class="kpi-value" style="color:var(--na)">—</div><div class="kpi-note"><span class="badge na">non collecté</span> aucune source autorisée</div></div></div>
  <div class="grid two">
    <div class="card"><h2>Production offensive et solidité défensive</h2><p class="question">La tendance récente s'écarte-t-elle de la référence de l'équipe ?</p>
      <div class="chart-box tall"><canvas id="ch-team-goals"></canvas></div><p class="legend-note">Moyennes glissantes sur 6 matchs ; pointillés : référence (76 matchs précédents). Sur 6 matchs, l'incertitude est forte : un écart y persiste en moyenne à environ 35 % (test de persistance).</p></div>
    <div class="card"><h2>Volume de tirs</h2><p class="question">Le processus de jeu confirme-t-il les résultats ?</p>
      <div class="chart-box tall"><canvas id="ch-team-shots"></canvas></div><p class="legend-note">Les tirs persistent davantage que les buts (pente ≈ 0,52 contre 0,35) : ils renseignent mieux le niveau réel.</p></div>
  </div>
  <div class="grid two" style="margin-top:16px">
    <div class="card"><h2>Tendances mesurées</h2><p class="question">Quels changements sont significatifs après correction des tests multiples ?</p>
      ${d.trends.some((t) => t.window === "medium" && !["stable", "insufficient_data"].includes(t.status)) ? "" : `<p><span class="badge stable">aucun changement significatif</span> Sur 19 matchs, les écarts observés restent dans la marge du hasard après correction des tests multiples. C'est le cas le plus fréquent : un écart d'équipe ne persiste en moyenne qu'à environ un tiers.</p>`}
      <p class="small"><label style="flex-direction:row;display:inline-flex;gap:6px"><input type="checkbox" id="show-stable-team" style="min-width:0"> afficher le détail de tous les indicateurs</label></p>
      <div class="table-wrap"><table class="hide-stable" id="team-trend-table"><thead><tr><th>Population</th><th>Indicateur</th><th class="num">n</th><th class="num">Observé</th><th class="num">Réf.</th><th class="num">Écart</th><th>Statut</th></tr></thead><tbody>
      ${d.trends.filter((t) => t.window === "medium").map((t) => `<tr class="${t.status === "stable" || t.status === "insufficient_data" ? "row-stable" : ""}"><td>${esc(POP_FR[t.population.split("|")[1] || ""] || t.population.split("|")[1])}</td><td>${esc(mname(t.metric))}</td><td class="num">${t.n}</td><td class="num">${val(t.metric, t.observed)}</td><td class="num">${val(t.metric, t.reference)}</td><td class="num">${diff(t.metric, t.abs_diff)}</td><td>${badge(t.status)}</td></tr>`).join("")}
      </tbody></table></div><p class="legend-note">Fenêtre de 19 matchs contre les 76 précédents. « Contre plus fort » : adversaire avec un Elo supérieur de plus de 75 points.</p></div>
    <div class="card"><h2>Profil tactique</h2><p class="question">Formation, organisation et style de jeu.</p>
      ${na("Formations, compositions, possession, pressing, zones de tir", "Aucune source autorisée connectée (API-Football requise). Une formation affichée ne suffirait pas à décrire le style de jeu.")}
      <h3 style="margin-top:16px">Derniers matchs</h3>${matchList(s.slice(-10).reverse())}</div>
  </div>`;
  setTimeout(() => {
    document.getElementById("show-stable-team").onchange = (e) => document.getElementById("team-trend-table").classList.toggle("hide-stable", !e.target.checked);
    document.getElementById("f-tc").onchange = (e) => go("teams", { c: e.target.value });
    document.getElementById("f-team").onchange = (e) => go("teams", { c: compCode, t: e.target.value });
    const roll = (k) => s.map((_, i) => { const w = s.slice(Math.max(0, i - 5), i + 1).map((x) => x[k]).filter((x) => x != null); return w.length >= 3 ? w.reduce((a, b) => a + b, 0) / w.length : null; });
    const labels = s.map((x) => fdate(x.kickoff_date));
    const refLine = (k) => s.map(() => avg(ref, k));
    chart("ch-team-goals", { type: "line", data: { labels, datasets: [
      { label: "Buts marqués (6 m.)", data: roll("gf"), borderColor: C.accent, pointRadius: 0, tension: 0.2 },
      { label: "Buts encaissés (6 m.)", data: roll("ga"), borderColor: C.down, pointRadius: 0, tension: 0.2 },
      { label: "Référence marqués", data: refLine("gf"), borderColor: C.accent, borderDash: [4, 4], pointRadius: 0 },
      { label: "Référence encaissés", data: refLine("ga"), borderColor: C.down, borderDash: [4, 4], pointRadius: 0 }] },
      options: { scales: { x: { ticks: { maxTicksLimit: 8 } } } } });
    chart("ch-team-shots", { type: "line", data: { labels, datasets: [
      { label: "Tirs (6 m.)", data: roll("shots_for"), borderColor: C.accent, pointRadius: 0, tension: 0.2 },
      { label: "Tirs concédés (6 m.)", data: roll("shots_against"), borderColor: C.down, pointRadius: 0, tension: 0.2 },
      { label: "Tirs cadrés (6 m.)", data: roll("sot_for"), borderColor: C.away, pointRadius: 0, tension: 0.2 }] },
      options: { spanGaps: false, scales: { x: { ticks: { maxTicksLimit: 8 } } } } });
  });
  return html;
}
function matchList(rows) {
  return `<div class="table-wrap"><table><tbody>${rows.map((r) => `<tr class="clickable" data-go="match" data-id="${r.id}" tabindex="0"><td>${fdate(r.kickoff_date)}</td><td>${esc(r.competition)}</td><td>${r.at_home ? "dom." : "ext."} ${esc(r.opponent)}</td><td class="num">${r.gf}-${r.ga}</td></tr>`).join("")}</tbody></table></div>`;
}

/* ---------------- 4. Pre-match ---------------- */
/* A crest drawn from the team's initials: no club artwork is stored. */
function crest(name, side) {
  const words = String(name).replace(/\(.*?\)/g, "").replace(/\b(FC|AC|SC|CF|AS|RC|SK|FK|NK|PFC)\b/g, "").trim().split(/\s+/);
  const init = (words.length > 1 ? words[0][0] + words[1][0] : words[0].slice(0, 2)).toUpperCase();
  return `<span class="crest ${side}" aria-hidden="true">${esc(init)}</span>`;
}
const RES_CLS = { V: "w", N: "d", D: "l" };
const formDots = (rows) => rows.length
  ? `<span class="form">${rows.map((r) => `<span class="res ${RES_CLS[r.result]}" title="${esc(fdate(r.date))} · ${r.at_home ? "dom." : "ext."} ${esc(r.opponent)} ${r.gf}-${r.ga}">${r.result}</span>`).join("")}</span>`
  : `<span class="muted small">Aucun match</span>`;

// Four sections in view; the detailed ones stay one step away.
const TABS = [["synthese", "Synthèse"], ["marches", "Paris"], ["moments", "Moments du match"], ["joueurs", "Joueurs"]];
const MORE_TABS = [["avant", "Forme et confrontations"], ["tactique", "Tactique"], ["compos", "Compositions"],
  ["classement", "Classement"], ["journees", "Journées"], ["analyse", "Analyse du modèle"]];

async function matchPage() {
  const p = params();
  if (!p.id) return home();
  const tab = [...TABS, ...MORE_TABS].some(([k]) => k === p.t) ? p.t : "synthese";
  const [d, x, pl] = await Promise.all([get(`/match/${p.id}`), get(`/match/${p.id}/insights`).catch(() => null),
    tab === "joueurs" ? get(`/match/${p.id}/players`).catch(() => null) : null]);
  const m = d.match;
  const pr = d.prediction;
  const H = x?.teams?.home, A = x?.teams?.away;
  const when = m.kickoff_utc ? new Date(m.kickoff_utc).toLocaleString("fr-FR", { weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" }) : fdate(m.kickoff_date);
  const played = m.home_goals != null;
  let html = `<p class="small"><a href="#/matchs">Retour aux matchs</a></p>
    <div class="match-top">
      <div class="team-side">${crest(m.home, "h")}<span class="team-name">${esc(m.home)}</span>${H ? formDots(H.form_all.slice(0, 5)) : ""}</div>
      <div class="match-mid"><h1>${esc(m.home)} ${played ? `${m.home_goals} – ${m.away_goals}` : "–"} ${esc(m.away)}</h1>
        <p>${esc(compName(m.competition, m.competition_name))}${m.round ? `, ${esc(roundFr(m.round))}` : ""}<br>${esc(when)}${m.neutral_venue ? ", terrain neutre" : ""}</p></div>
      <div class="team-side a">${crest(m.away, "a")}<span class="team-name">${esc(m.away)}</span>${A ? formDots(A.form_all.slice(0, 5)) : ""}</div>
    </div>`;

  html += `<div class="tabs" role="tablist" aria-label="Sections du match">${TABS.map(([k, label]) =>
    `<a role="tab" href="#/match?id=${m.id}&t=${k}" aria-selected="${k === tab}" class="tab${k === tab ? " on" : ""}">${label}</a>`).join("")}
    <label class="tab-more${MORE_TABS.some(([k]) => k === tab) ? " on" : ""}"><span class="sr-only">Autres sections</span>
      <select id="f-more" aria-label="Autres sections"><option value="">Plus…</option>${MORE_TABS.map(([k, label]) =>
        `<option value="${k}" ${k === tab ? "selected" : ""}>${label}</option>`).join("")}</select></label></div>`;
  setTimeout(() => { const sel = document.getElementById("f-more"); if (sel) sel.onchange = () => { if (sel.value) location.hash = `#/match?id=${m.id}&t=${sel.value}`; }; }, 0);
  const noData = `<div class="unavailable"><strong>Données indisponibles</strong><br><span class="small">L'analyse détaillée n'a pas pu être calculée pour ce match.</span></div>`;
  html += `<div role="tabpanel">${!x && tab !== "analyse" ? noData : {
    synthese: () => tabSummary(m, d, x, pr), avant: () => tabBefore(m, x, H, A), marches: () => tabMarkets(m, d), moments: () => tabMoments(m, x, H, A), tactique: () => tabTactics(m, x, H, A), joueurs: () => tabPlayers(m, pl),
    compos: () => tabLineups(m, H, A),
    classement: () => tabTable(m, x), journees: () => tabRounds(x), analyse: () => tabAnalysis(m, d, pr),
  }[tab]()}</div>`;
  return html;
}

function tabBefore(m, x, H, A) {
  const p = params();
  const scope = p.f === "comp" ? "comp" : "all";
  const formRow = (T) => (scope === "comp" ? T.form_comp : T.form_all);
  const streak = (s) => {
    const out = [];
    if (s.unbeaten >= 2) out.push(`${s.unbeaten} matchs sans défaite`);
    if (s.wins >= 2) out.push(`${s.wins} victoires de suite`);
    if (s.winless >= 2) out.push(`${s.winless} matchs sans victoire`);
    if (s.scored >= 3) out.push(`a marqué dans ses ${s.scored} derniers matchs`);
    if (s.clean_sheets >= 2) out.push(`${s.clean_sheets} matchs sans encaisser`);
    return out.length ? out.join(", ") : "aucune série en cours";
  };
  const goals = (T) => {
    const f = T.profile.figures;
    return f.goals_for != null ? `${num(f.goals_for, 1)} marqués, ${num(f.goals_against, 1)} encaissés par match` : "—";
  };
  const formList = (T) => `<table class="tight"><tbody>${formRow(T).map((r) => `<tr><td><span class="res ${RES_CLS[r.result]}">${r.result}</span></td>
    <td>${r.at_home ? "Dom." : "Ext."} ${esc(r.opponent)}<div class="small muted">${esc(fdate(r.date))}, ${esc(compName(r.competition))}</div></td>
    <td class="num">${r.gf}-${r.ga}</td></tr>`).join("") || `<tr><td class="muted">Aucun match dans ce périmètre.</td></tr>`}</tbody></table>`;
  const scorers = (T) => T.scorers.length
    ? `<table class="tight"><tbody>${T.scorers.map((s) => `<tr><td>${esc(s.name)}</td><td class="num">${s.goals}<span class="muted small"> but${s.goals > 1 ? "s" : ""}${s.penalties ? `, ${s.penalties} pen.` : ""}</span></td></tr>`).join("")}</tbody></table>`
    : `<p class="muted small">Pas de buteurs connus : les détails de buts ne couvrent que les quatre grands championnats.</p>`;
  return `<div class="controls" style="margin-top:var(--space-4)"><div class="seg" role="group" aria-label="Périmètre de la forme">
      <a class="seg-btn${scope === "all" ? " on" : ""}" href="#/match?id=${m.id}&t=avant&f=all">Toutes compétitions</a>
      <a class="seg-btn${scope === "comp" ? " on" : ""}" href="#/match?id=${m.id}&t=avant&f=comp">${esc(compName(m.competition))}</a></div></div>
    <div class="grid two">
      ${[H, A].map((T) => `<div class="card"><h2>Forme de ${esc(T.name)}</h2>
        <p class="question">${esc(streak(T.streaks))}. ${goals(T)} cette saison.</p>${formList(T)}</div>`).join("")}
      ${[H, A].map((T) => `<div class="card"><h2>Meilleurs buteurs de ${esc(T.name)}</h2><p class="question">Saison ${season(x.season)}, championnat.</p>${scorers(T)}</div>`).join("")}
    </div>
    ${fold("Confrontations directes", x.h2h?.length ? `<table class="tight"><tbody>${x.h2h.map((r) => `<tr><td>${esc(fdate(r.date))}<div class="small muted">${esc(compName(r.competition))}</div></td><td>${esc(r.home)} – ${esc(r.away)}</td><td class="num">${r.score}</td></tr>`).join("")}</tbody></table>`
        : `<p class="muted">Aucune confrontation entre ces deux équipes dans les 8 dernières saisons en base.</p>`, { note: x.h2h?.length ? `${x.h2h.length} match${x.h2h.length > 1 ? "s" : ""}` : "aucune" })}`;
}

function tabTactics(m, x, H, A) {
  const fig = (f, k, fmt) => (f[k] == null ? "—" : fmt(f[k]));
  const card = (T) => {
    const f = T.profile.figures;
    if (!T.profile.labels.length) {
      return `<div class="card"><h2>${esc(T.name)}</h2><p class="muted">Pas assez de matchs mesurés cette saison pour décrire son style (${T.profile.matches} match${T.profile.matches > 1 ? "s" : ""}, il en faut 4 avec statistiques).</p></div>`;
    }
    return `<div class="card"><h2>${esc(T.name)}</h2>
      <p class="question">${f.formation ? `Système habituel <b>${esc(f.formation)}</b> (${pct(f.formation_share, 0)} des matchs)` : "Système non mesuré"}, ${T.profile.matches} matchs de championnat cette saison.</p>
      <ul class="styles">${T.profile.labels.map((l) => `<li><b>${esc(l.text)}</b><p>${esc(x.glossary[l.key] || "")}</p></li>`).join("")}</ul>
      ${fold("Voir les chiffres", `<table class="tight"><tbody>
        <tr><td>Possession moyenne</td><td class="num">${fig(f, "possession", (v) => `${v.toFixed(0)} %`)}</td></tr>
        <tr><td>Tirs par match (pour / contre)</td><td class="num">${fig(f, "shots_for", (v) => v.toFixed(1))} / ${fig(f, "shots_against", (v) => v.toFixed(1))}<span class="muted small"> moy. ${fig(f, "comp_shots", (v) => v.toFixed(1))}</span></td></tr>
        <tr><td>Buts par tir cadré</td><td class="num">${fig(f, "conversion", (v) => pct(v, 0))}<span class="muted small"> moy. ${fig(f, "comp_conversion", (v) => pct(v, 0))}</span></td></tr>
        <tr><td>Buts marqués après la pause</td><td class="num">${fig(f, "second_half_share", (v) => pct(v, 0))}</td></tr>
        <tr><td>Ouvre le score</td><td class="num">${fig(f, "scored_first", (v) => pct(v, 0))}<span class="muted small"> sur ${f.first_goal_matches ?? 0} matchs avec but</span></td></tr>
        <tr><td>Gagne quand il ouvre le score</td><td class="num">${fig(f, "win_when_first", (v) => pct(v, 0))}<span class="muted small"> sur ${f.n_first ?? 0}</span></td></tr>
      </tbody></table>`, { inner: true })}</div>`;
  };
  return `<div class="card read" style="margin-top:var(--space-4)"><h2>Le match en quelques phrases</h2>
      ${x.matchup.length ? `<ul class="reading">${x.matchup.map((s) => `<li>${esc(s)}</li>`).join("")}</ul>` : `<p class="muted">Pas assez de données mesurées pour comparer les deux styles.</p>`}
      <p class="meta">Lecture des statistiques de la saison, comparées à la moyenne de la compétition. Ces profils ne modifient pas les probabilités du modèle.</p></div>
    <div class="grid two" style="margin-top:var(--space-4)">${card(H)}${card(A)}</div>`;
}

const LINE_FR = { defence: "Défense", midfield: "Milieu", attack: "Attaque" };
const lastName = (n) => String(n).split(" ").slice(-1)[0];
function tabPlayers(m, pl) {
  const side = params().s === "away" ? "away" : "home";
  const P = pl?.[side];
  const name = side === "home" ? m.home : m.away;
  const seg = `<div class="controls" style="margin-top:var(--space-4)"><div class="seg" role="group" aria-label="Équipe">
    <a class="seg-btn${side === "home" ? " on" : ""}" href="#/match?id=${m.id}&t=joueurs&s=home">${esc(m.home)}</a>
    <a class="seg-btn${side === "away" ? " on" : ""}" href="#/match?id=${m.id}&t=joueurs&s=away">${esc(m.away)}</a></div></div>`;
  if (!P) return seg + `<div class="card"><p class="muted">Aucune composition en base pour ${esc(name)} cette saison : l'analyse par joueur ne couvre que les quatre grands championnats.</p></div>`;
  const clean = P.timeline.filter((r) => r.ga === 0).length;
  const cracks = P.timeline.filter((r) => r.ga >= 2).length;
  const fmt = (v, d = 1) => (v == null ? "—" : Number(v).toFixed(d));
  const pairs = P.cb_pairs.length ? `<table class="tight"><thead><tr><th>Charnière</th><th class="num">Matchs</th><th class="num">Encaissés / match</th><th class="num">Sans encaisser</th><th class="num">2 buts ou plus</th><th class="num">1er but encaissé</th><th class="num">Tirs concédés</th></tr></thead><tbody>
      ${P.cb_pairs.map((c) => `<tr><td>${c.players.map((n) => esc(n)).join(" et ")}</td><td class="num">${c.n}</td><td class="num">${fmt(c.ga)}</td><td class="num">${c.clean_sheets}</td><td class="num">${c.cracks}</td><td class="num">${c.conceded_first ?? "—"}</td><td class="num">${fmt(c.shots_against)}</td></tr>`).join("")}</tbody></table>`
    : `<p class="muted small">Pas de charnière identifiable : la formation n'est pas connue pour ces matchs.</p>`;
  const lines = ["defence", "midfield", "attack"].map((ln) => {
    const rows = P.players.filter((x) => x.line === ln);
    if (!rows.length) return "";
    const key = ln === "attack" ? "gf" : "ga";
    const label = ln === "attack" ? "marqués" : "encaissés";
    return fold(`${LINE_FR[ln]}`, `<div class="table-wrap"><table class="tight"><thead><tr><th>Joueur</th><th class="num">Titulaire</th><th class="num">Buts / passes</th><th class="num">Buts ${label} avec lui</th><th class="num">Sans lui</th><th>Lecture</th></tr></thead><tbody>
      ${rows.map((x) => { const w = x.split.with, o = x.split.without;
        return `<tr><td>${esc(x.name)}<div class="small muted">${esc(x.role_fr)}</div></td><td class="num">${x.starts}</td><td class="num">${x.goals} / ${x.assists}</td>
          <td class="num">${w ? fmt(w[key]) : "—"}<span class="muted small"> ${w ? `(${w.n})` : ""}</span></td>
          <td class="num">${o ? fmt(o[key]) : "—"}<span class="muted small"> ${o ? `(${o.n})` : ""}</span></td>
          <td class="small">${x.verdict ? esc(x.verdict) : `<span class="muted">${o ? "pas assez de matchs pour comparer" : "a joué tous les matchs"}</span>`}</td></tr>`; }).join("")}
      </tbody></table></div>`, { inner: true, open: ln === "defence", note: `${rows.length} joueur${rows.length > 1 ? "s" : ""}` });
  }).join("");
  const timeline = `<div class="table-wrap"><table class="tight"><thead><tr><th>Match</th><th class="num">Score</th><th>Système</th><th>Défense alignée</th><th class="num">Tirs concédés</th><th>Lecture</th></tr></thead><tbody>
    ${P.timeline.map((r) => `<tr><td>${r.at_home ? "Dom." : "Ext."} ${esc(r.opponent)}<div class="small muted">${esc(fdate(r.date))}</div></td>
      <td class="num">${r.gf}-${r.ga}</td><td>${esc(r.formation || "—")}</td>
      <td class="small">${r.defence.map((n) => esc(lastName(n))).join(", ")}</td><td class="num">${r.shots_against ?? "—"}</td>
      <td>${r.ga === 0 ? '<span class="badge fact">solide</span>' : r.ga >= 2 ? '<span class="badge falling">a craqué</span>' : ""}${r.conceded_first ? ' <span class="badge">1er but encaissé</span>' : ""}</td></tr>`).join("")}</tbody></table></div>`;
  const units = P.units?.length ? `<div class="table-wrap"><table class="tight"><thead><tr><th>Duo</th><th class="num">Ensemble</th><th class="num">Buts / match</th><th class="num">Sans eux</th><th class="num">Tirs (cadrés)</th><th class="num">Sans eux</th><th>Lecture</th></tr></thead><tbody>
      ${P.units.map((u) => `<tr><td>${u.players.map((n) => esc(n)).join(" et ")}<div class="small muted">${esc(u.lines.split("-").map((l) => LINE_FR[l] || l).join(" + "))}</div></td>
        <td class="num">${u.with.n}</td><td class="num">${fmt(u.with.gf)}</td><td class="num">${fmt(u.without.gf)}<span class="muted small"> (${u.without.n})</span></td>
        <td class="num">${fmt(u.with.shots)} (${fmt(u.with.sot)})</td><td class="num">${fmt(u.without.shots)} (${fmt(u.without.sot)})</td><td class="small">${esc(u.verdict)}</td></tr>`).join("")}</tbody></table></div>`
    : `<p class="muted small">Pas assez de matchs avec et sans chaque duo (3 de chaque côté au minimum).</p>`;
  const duos = P.assist_duos?.length ? `<ul class="list">${P.assist_duos.map((d) => `<li>${esc(d.passer)} → ${esc(d.scorer)} : ${d.goals} buts</li>`).join("")}</ul>` : `<p class="muted small">Aucun duo passeur → buteur répété (2 buts au moins) cette saison.</p>`;
  return seg + `<div class="card"><h2>Défense de ${esc(name)} : quand ça tient, quand ça craque</h2>
      <p class="question">${P.matches} matchs de championnat cette saison : ${fmt(P.avg_ga)} but encaissé par match, ${clean} sans encaisser, ${cracks} à 2 buts encaissés ou plus.</p>${pairs}</div>
    <div class="card" style="margin-top:var(--space-4)"><h2>Impact des titulaires</h2>
      <p class="question">Résultats de l'équipe dans les matchs où le joueur était titulaire, contre ceux où il ne l'était pas. Entre parenthèses : le nombre de matchs.</p>${lines}
      <p class="meta">Une association sur peu de matchs, pas une preuve : la force des adversaires n'est pas prise en compte. Un écart n'est indiqué qu'avec au moins 3 matchs de chaque côté, et marqué « faible échantillon » sous 5.</p></div>
    <div class="card" style="margin-top:var(--space-4)"><h2>Milieu et attaque : les duos</h2>
      <p class="question">Production offensive de l'équipe quand deux joueurs du milieu ou de l'attaque sont titulaires ensemble, contre les autres matchs. Les passes clés et les tirs par joueur ne sont pas collectés : il faudrait Sofascore (D56).</p>${units}
      <h3>Duos passeur → buteur</h3>${duos}
      <p class="meta">Même règle que pour les joueurs seuls : 3 matchs au moins de chaque côté, « faible échantillon » sous 5, force des adversaires non ajustée.</p></div>
    ${fold("Match par match", `<p class="small muted">Du plus récent au plus ancien. « A craqué » : 2 buts encaissés ou plus.</p>${timeline}`, { note: `${clean} solide${clean > 1 ? "s" : ""}, ${cracks} fois craqué` })}`;
}

function tabLineups(m, H, A) {
  const pitch = (T, side) => {
    if (!T.lineup) return `<div class="card"><h2>${esc(T.name)}</h2><p class="muted">Aucune composition en base : les compositions ne couvrent que les quatre grands championnats.</p></div>`;
    const L = T.lineup;
    return `<div class="card"><h2>${esc(T.name)}${L.formation ? `, ${esc(L.formation)}` : ""}</h2>
      <p class="question">Dernière composition alignée, contre ${esc(L.opponent)} le ${esc(fdate(L.date))}. Ce n'est pas une composition officielle pour ce match.</p>
      <div class="pitch ${side}">${L.lines.map((line) => `<div class="pline">${line.map((n) => `<span class="pl"><i></i>${esc(n.split(" ").slice(-1)[0])}</span>`).join("")}</div>`).join("")}</div>
      ${T.regulars.length ? fold("Les plus titularisés cette saison", `<p class="small">${T.regulars.slice(0, 11).map((r) => `${esc(r.name)} <span class="muted">${r.starts}</span>`).join(", ")}</p>`, { inner: true }) : ""}</div>`;
  };
  return `<div class="grid two" style="margin-top:var(--space-4)">${pitch(H, "h")}${pitch(A, "a")}</div>`;
}

// "O1.5" -> "+1,5 buts", "U3.5" -> "−3,5 buts"; result keys stay as they are (1X, 12...).
const shortKey = (k) => (/^[OU]\d/.test(k) ? `${k[0] === "O" ? "+" : "−"}${k.slice(1).replace(".", ",")} buts` : k);
const odds2 = (v) => (v == null ? "—" : Number(v).toFixed(2).replace(".", ","));

/* The short reading: verdict, the safest markets with their fair odds, a few key facts. */
function tabSummary(m, d, x, pr) {
  if (!pr) return `<div class="unavailable" style="margin-top:var(--space-4)"><strong>Pas encore de probabilités</strong><br><span class="small">${m.status === "scheduled" ? "Elles seront calculées au prochain cycle du matin." : "Aucune prédiction n'a été enregistrée avant le coup d'envoi."}</span></div>`;
  if (!d.summary) return `<div class="unavailable" style="margin-top:var(--space-4)"><strong>Synthèse en préparation</strong><br><span class="small">Elle apparaîtra après le prochain cycle de calcul. En attendant, voir l'onglet Paris.</span></div>`;
  const S = d.summary;
  const fg = x?.first_goal;
  const top = pr.top_scores[0];
  const picks = (S.safe_picks || []).map((p) => `<div class="pick"><span class="pick-label">${esc(p.label.replace("domicile", m.home).replace("extérieur", m.away))}</span>
      <span class="pick-p">${pct(p.prob, 0)}</span><span class="pick-odds">cote juste <b>${odds2(p.fair_odds)}</b></span></div>`).join("")
    || `<p class="muted">Aucun marché vérifié n'atteint 60 % sur ce match : pas de pari « sûr » ici.</p>`;
  const facts = x?.key_facts?.length ? `<ul class="reading">${x.key_facts.map((f) => `<li>${esc(f)}</li>`).join("")}</ul>` : `<p class="muted">Rien de marquant au-delà des seuils fixés (séries, réaction au premier but, buteurs, confrontations).</p>`;
  return `<div class="card read" style="margin-top:var(--space-4)"><h2>En bref</h2><p class="verdict">${esc(S.verdict || "")}</p>
      <section class="essentials" aria-label="L'essentiel" style="margin-top:var(--space-4)">
        <div class="ess-block"><h2>Qui gagne</h2>${strip([pr.p_home, pr.p_draw, pr.p_away], pr.market.every((v) => v != null) ? pr.market : null, true)}</div>
        <div class="ess-block"><h2>Qui marque en premier</h2>${fg ? strip([fg.home, fg.none, fg.away], null, true) : `<p class="muted">Estimation indisponible.</p>`}</div>
        <div class="ess-facts">
          <div><span class="kpi-label">Score le plus probable</span><span class="kpi-value">${top ? top.score : "—"}</span><span class="kpi-note">${top ? pct(top.p) : ""}</span></div>
          <div><span class="kpi-label">Buts attendus</span><span class="kpi-value">${num(pr.exp_home_goals, 1)} – ${num(pr.exp_away_goals, 1)}</span><span class="kpi-note">${pr.sufficient_data ? "" : "historique court : prudence"}</span></div>
        </div></section></div>
    <div class="grid two" style="margin-top:var(--space-4)">
      <div class="card"><h2>Les paris les plus sûrs</h2>
        <p class="question">Les plus probables selon le modèle, parmi les marchés dont la fiabilité est vérifiée (résultat, double chance, buts).</p>
        <div class="picks">${picks}</div>
        <p class="meta"><b>Règle :</b> ne jouer que si la cote betPawa est <b>au-dessus</b> de la cote juste. En dessous, le pari perd de l'argent sur la durée, même s'il passe souvent. Le modèle est au niveau du marché, sans avantage démontré. <a href="value.html">Comparer avec vos cotes</a></p></div>
      <div class="card"><h2>Ce qu'il faut savoir</h2>${facts}
        <p class="meta">Détails : onglets Paris (tous les marchés), Moments du match, Joueurs.</p></div></div>`;
}

/* When a team scores and concedes, and what follows the first goal. */
function tabMoments(m, x, H, A) {
  const fmt = (v, d = 2) => (v == null ? "—" : Number(v).toFixed(d));
  const halves = (h, label) => (h ? `<tr><td>${label}<div class="small muted">${h.matches} matchs</div></td>
      <td class="num">${fmt(h.gf1)} – ${fmt(h.ga1)}</td><td class="num">${fmt(h.gf2)} – ${fmt(h.ga2)}</td>
      <td class="num">${pct(h.won1, 0)}</td><td class="num">${pct(h.won2, 0)}</td></tr>` : "");
  const after = (a) => (a ? `${pct(a.win, 0)} / ${pct(a.draw, 0)} / ${pct(a.loss, 0)}<span class="muted small"> (${a.n})</span>` : "—");
  const card = (T) => {
    const P = T.periods || {}, F = T.first_goal;
    const w = P.windows;
    const max = w ? Math.max(1, ...w.rows.map((r) => Math.max(r.for, r.against))) : 1;
    return `<div class="card"><h2>${esc(T.name)}</h2>
      <h3>Par mi-temps (buts marqués – encaissés par match)</h3>
      <table class="tight"><thead><tr><th></th><th class="num">1re mi-temps</th><th class="num">2e mi-temps</th><th class="num">Gagne la 1re</th><th class="num">Gagne la 2e</th></tr></thead><tbody>
        ${halves(P.halves_season, "Cette saison")}${halves(P.halves_all, `Depuis ${season(P.since)}`)}</tbody></table>
      <h3>Par tranche de 15 minutes, cette saison</h3>
      ${w ? `<table class="tight"><thead><tr><th>Minutes</th><th class="num">Marqués</th><th class="num">Encaissés</th></tr></thead><tbody>
        ${w.rows.map((r) => `<tr><td>${esc(r.window)}</td><td class="num"><span class="bar" style="width:${Math.round(60 * r.for / max)}px"></span> ${r.for}</td><td class="num">${r.against}</td></tr>`).join("")}
        <tr><td><b>30-60</b></td><td class="num"><b>${w.w30_60.for}</b></td><td class="num"><b>${w.w30_60.against}</b></td></tr></tbody></table>
        <p class="meta">${w.matches} matchs lus (minutes des buts OneFootball, quatre grands championnats).</p>`
        : `<p class="muted small">Minutes des buts inconnues : elles ne couvrent que les quatre grands championnats.</p>`}
      <h3>Après le premier but (victoire / nul / défaite)</h3>
      ${F ? `<table class="tight"><thead><tr><th></th><th class="num">${esc(T.name)}</th><th class="num">Moyenne du championnat</th></tr></thead><tbody>
        <tr><td>Ouvre le score</td><td class="num">${after(F.team.scored_first)}</td><td class="num">${after(F.league.scored_first)}</td></tr>
        <tr><td>Encaisse le premier but</td><td class="num">${after(F.team.conceded_first)}</td><td class="num">${after(F.league.conceded_first)}</td></tr>
        <tr><td>Mène de 2 buts à un moment</td><td class="num">${after(F.team.led_by_two)}</td><td class="num">${after(F.league.led_by_two)}</td></tr></tbody></table>
        <p class="meta">${F.matches} matchs de l'équipe, ${F.league_matches} matchs du championnat cette saison. La défense alignée quand l'équipe encaisse le premier but est dans l'onglet Joueurs.</p>`
        : `<p class="muted small">Ordre des buts inconnu pour cette équipe.</p>`}</div>`;
  };
  return `<div class="card read" style="margin-top:var(--space-4)"><p class="question">${esc((H.periods || {}).note || "")}</p></div>
    <div class="grid two" style="margin-top:var(--space-4)">${card(H)}${card(A)}</div>`;
}

/* Model probability and fair odds of each betting market (same list as the odds checker). */
const MARKET_GROUPS = { "1x2": "Résultat et double chance", goals: "Nombre de buts", btts: "Les deux équipes marquent",
  "1up": "1UP / 2UP", first: "Premier but" };
function tabMarkets(m, d) {
  const mk = d.markets;
  if (!mk || !mk.length) return `<div class="unavailable"><strong>Marchés indisponibles</strong><br><span class="small">Aucune prédiction enregistrée pour ce match.</span></div>`;
  const groups = [...new Set(mk.map((x) => x.note))];
  return `<p class="question">Cote juste = 1 / probabilité. Une cote du bookmaker au-dessus de la cote juste n'est intéressante que si la probabilité est fiable : voir la note de chaque groupe.</p>
    <div class="grid two">${groups.map((g) => `<div class="card"><h2>${esc(MARKET_GROUPS[g] || g)}</h2>
      <p class="meta">${esc((d.market_notes || {})[g] || "")}</p>
      <table><thead><tr><th>Marché</th><th class="num">Probabilité</th><th class="num">Cote juste</th></tr></thead><tbody>
      ${mk.filter((x) => x.note === g).map((x) => `<tr><td>${esc(x.label.replace("domicile", m.home).replace("extérieur", m.away))}</td><td class="num">${pct(x.prob, 0)}</td><td class="num">${x.prob > 0 ? num(1 / x.prob, 2) : "—"}</td></tr>`).join("")}
      </tbody></table></div>`).join("")}</div>`;
}

function tabTable(m, x) {
  const rows = x.standings || [];
  if (!rows.length) return `<div class="card" style="margin-top:var(--space-4)"><p class="muted">Pas de classement pour cette compétition cette saison.</p></div>`;
  return `<div class="card" style="margin-top:var(--space-4)"><h2>Classement, ${esc(compName(m.competition))}</h2>
    <p class="question">Calculé à partir des résultats en base, avant ce match.</p>
    <div class="table-wrap"><table class="standings"><thead><tr><th class="num">#</th><th>Équipe</th><th class="num">J</th><th class="num">G</th><th class="num">N</th><th class="num">P</th><th class="num">Diff.</th><th class="num">Pts</th><th>Forme</th></tr></thead><tbody>
    ${rows.map((r) => `<tr class="${r.team_id === m.home_team_id ? "me h" : r.team_id === m.away_team_id ? "me a" : ""}"><td class="num">${r.rank}</td><td>${esc(r.team)}</td><td class="num">${r.played}</td><td class="num">${r.won}</td><td class="num">${r.drawn}</td><td class="num">${r.lost}</td><td class="num">${r.gf - r.ga > 0 ? "+" : ""}${r.gf - r.ga}</td><td class="num"><b>${r.points}</b></td><td><span class="form">${r.form.map((f) => `<span class="res ${RES_CLS[f]}">${f}</span>`).join("")}</span></td></tr>`).join("")}
    </tbody></table></div></div>`;
}

function tabRounds(x) {
  const res = x.recent_results || [], next = x.next_fixtures || [];
  return `<div class="grid two" style="margin-top:var(--space-4)">
    <div class="card"><h2>Derniers résultats</h2>${res.length ? `<table class="tight"><tbody>${res.map((r) => `<tr><td>${esc(fdate(r.date))}</td><td>${esc(r.home)} – ${esc(r.away)}</td><td class="num">${r.score}</td></tr>`).join("")}</tbody></table>` : `<p class="muted">Aucun résultat.</p>`}</div>
    <div class="card"><h2>Prochains matchs</h2>${next.length ? `<table class="tight"><tbody>${next.map((r) => `<tr><td>${esc(fdate(r.kickoff_date))}</td><td>${esc(r.home)} – ${esc(r.away)}</td><td class="num">${r.kickoff_utc ? new Date(r.kickoff_utc).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }) : "—"}</td></tr>`).join("")}</tbody></table>` : `<p class="muted">Aucun match programmé.</p>`}</div></div>`;
}

function tabAnalysis(m, d, pr) {
  let html = "";
  if (pr) {
    const q = pr.data_quality || {};
    html += `<div class="grid two" style="margin-top:var(--space-4)"><div class="grid">
      <div class="card"><h2>Scores les plus probables</h2><p class="question">Classés par probabilité calculée. Aucun score n'est « le » score prévu.</p>
        <table class="tight"><tbody>${pr.top_scores.map((t) => `<tr><td>${t.score}</td><td class="num">${pct(t.p)}</td></tr>`).join("")}</tbody></table></div>
      <div class="card"><h2>Fiabilité</h2>
        <p>${pr.sufficient_data ? '<span class="badge fact">données suffisantes</span>' : '<span class="badge falling">données insuffisantes</span>'}</p>
        <ul class="list">${(q.warnings || []).map((w) => `<li>${esc(w)}</li>`).join("") || "<li>Aucun avertissement.</li>"}</ul>
        <p class="meta">${esc(pr.model)}, calculé le ${new Date(pr.predicted_at).toLocaleString("fr-FR")}.</p></div></div>
      <div class="card"><h2>Facteurs de la prévision</h2><p class="question">Sur quoi repose cette estimation ?</p>
        ${fold("Voir les facteurs", `<table><tbody>${Object.entries(pr.factors).map(([k, v]) => `<tr><td>${esc(FACTOR_FR[k] || k)}</td><td class="num">${v == null ? "n/d" : k.startsWith("comp_") && k !== "comp_goals_mean" ? pct(v) : num(v, k.startsWith("elo") || k.startsWith("rest") || k.startsWith("games") ? 0 : 2)}</td></tr>`).join("")}</tbody></table>`, { inner: true, open: true })}</div></div>`;
  }
  const kickoff = new Date(m.kickoff_utc || `${m.kickoff_date}T00:00:00Z`);
  if (m.status === "scheduled" && kickoff > new Date() && !window.FI_READ_ONLY) {
    html += `<div class="card" style="margin-top:var(--space-4)"><h2>Mon pronostic</h2>
      <p class="question">Enregistré avec l'heure, refusé après le coup d'envoi. Le dernier envoyé avant le match compte.</p>
      ${tokenBox()}
      <form id="pick-form" class="controls">
        <label>Choix 1X2<select name="pick" required><option value="H">1, ${esc(m.home)}</option><option value="D">X, nul</option><option value="A">2, ${esc(m.away)}</option></select></label>
        <label>Confiance (1-5)<select name="confidence">${[1, 2, 3, 4, 5].map((c) => `<option ${c === 3 ? "selected" : ""}>${c}</option>`).join("")}</select></label>
        <label>Score (facultatif)<span><input name="home_goals" type="number" min="0" max="20" style="min-width:0;width:64px" aria-label="Buts domicile"> - <input name="away_goals" type="number" min="0" max="20" style="min-width:0;width:64px" aria-label="Buts extérieur"></span></label>
        <label>Plus de 2,5 buts<select name="over_2_5"><option value="">non précisé</option><option value="true">oui</option><option value="false">non</option></select></label>
        <label>Les deux marquent<select name="btts"><option value="">non précisé</option><option value="true">oui</option><option value="false">non</option></select></label>
        <label style="flex:1 1 100%">Raisonnement<textarea name="reasoning" rows="3" maxlength="5000"></textarea></label>
        <button class="btn" type="submit">Enregistrer le pronostic</button><span id="pick-state" class="small"></span>
      </form></div>`;
    setTimeout(() => {
      bindToken();
      document.getElementById("pick-form").onsubmit = async (e) => {
        e.preventDefault();
        const f = new FormData(e.target);
        const body = { match_id: m.id, pick: f.get("pick"), confidence: Number(f.get("confidence")) };
        if (f.get("home_goals") !== "" && f.get("away_goals") !== "") { body.home_goals = Number(f.get("home_goals")); body.away_goals = Number(f.get("away_goals")); }
        if (f.get("over_2_5")) body.over_2_5 = f.get("over_2_5") === "true";
        if (f.get("btts")) body.btts = f.get("btts") === "true";
        if (f.get("reasoning")) body.reasoning = f.get("reasoning");
        const state = document.getElementById("pick-state");
        try { const r = await send("POST", "/api/user-predictions", body); state.innerHTML = `<span class="badge fact">Pronostic enregistré, n° ${r.id}</span>`; }
        catch (err) { state.innerHTML = `<span class="badge falling">Refusé</span> ${esc(err.message)}`; }
      };
    });
  }
  return html;
}

/* ---------------- 5. Performance ---------------- */
async function performance() {
  const d = await get("/performance");
  const p = params();
  const bt = d.backtest;
  const all = bt.filter((r) => r.segment === "all");
  const models = [...new Set(all.map((r) => r.model_name))];
  const pick = (m, metric, seg = "all") => (bt.find((r) => r.model_name === m && r.metric === metric && r.segment === seg) || {});
  const comps = [...new Set(bt.filter((r) => r.segment.startsWith("competition:")).map((r) => r.segment.split(":")[1]))];
  const cmp = bt.filter((r) => r.metric === "log_loss_diff");
  const calModels = [...new Set(d.calibration.map((r) => r.model_name))];
  const calModel = p.m || (calModels.includes("routed_competition") ? "routed_competition" : calModels[0]);
  const events = [...new Set(d.calibration.filter((r) => r.metric === "ece").map((r) => r.segment.split(":").slice(2).join(":")))];
  const ev = p.e || "1X2:home";
  const scope = p.s || "all";
  let html = `<h1>Performance et fiabilité du modèle</h1>
  <p class="muted">Backtest chronologique : chaque saison est prédite par des modèles entraînés sur les saisons antérieures. Run n° ${d.backtest_run?.id} du ${fdate(d.backtest_run?.started_at)}.</p>
  <div class="grid two">
    <div class="card"><h2>Log loss et Brier par modèle</h2><p class="question">Quel modèle prédit le mieux ? (plus bas = meilleur)</p>
      <div class="table-wrap"><table><thead><tr><th>Modèle</th><th class="num">n</th><th class="num">Log loss</th><th class="num">Brier</th><th class="num">ECE</th><th class="num">Plus/moins 2,5</th><th class="num">BTTS</th></tr></thead><tbody>
      ${models.map((m) => `<tr><td>${esc(m)}</td><td class="num">${pick(m, "log_loss").n ?? ""}</td><td class="num">${num(pick(m, "log_loss").value, 4)}</td><td class="num">${num(pick(m, "brier").value, 4)}</td><td class="num">${num(pick(m, "ece").value, 3)}</td><td class="num">${num(pick(m, "ou25_log_loss").value, 4)}</td><td class="num">${num(pick(m, "btts_log_loss").value, 4)}</td></tr>`).join("")}
      </tbody></table></div></div>
    <div class="card"><h2>Comparaisons appariées</h2><p class="question">L'écart avec la référence est-il plus grand que l'incertitude ?</p>
      <div class="chart-box tall"><canvas id="ch-forest"></canvas></div><p class="legend-note">Différence de log loss (négatif = meilleur que la référence), IC 95 % bootstrap, mêmes matchs.</p></div>
    <div class="card"><h2>Log loss par compétition</h2><p class="question">La qualité varie-t-elle selon la compétition ?</p>
      <div class="chart-box tall"><canvas id="ch-bycomp"></canvas></div></div>
    <div class="card"><h2>Courbe de calibration</h2><p class="question">Quand le modèle annonce x %, l'événement arrive-t-il x % du temps ?</p>
      <div class="controls"><label>Modèle<select id="f-cm">${calModels.map((m) => `<option ${m === calModel ? "selected" : ""}>${esc(m)}</option>`).join("")}</select></label>
        <label>Événement<select id="f-ce">${events.map((e) => `<option value="${esc(e)}" ${e === ev ? "selected" : ""}>${esc(EVENT_FR[e] || e)}</option>`).join("")}</select></label>
        <label>Périmètre<select id="f-cs">${["all", "domestic", "european"].map((x) => `<option ${x === scope ? "selected" : ""} value="${x}">${{ all: "tout", domestic: "championnats", european: "coupes d'Europe" }[x]}</option>`).join("")}</select></label></div>
      <div class="chart-box tall"><canvas id="ch-calib"></canvas></div><p class="legend-note" id="calib-note"></p></div>
  </div>
  <div class="card" style="margin-top:16px"><h2>Apport mesuré des niveaux et des tendances</h2><p class="question">Quelles informations améliorent réellement les prédictions sur des matchs futurs ?</p>
    <div class="controls">
      <label>Marché<select id="f-lm"><option value="">tous</option>${[...new Set(d.levels.map((r) => r.metric))].map((m) => `<option value="${esc(m)}">${esc(MARKET_FR[m] || m)}</option>`).join("")}</select></label>
      <label>Périmètre<select id="f-ls"><option value="all targets">toutes les compétitions cibles</option><option value="domestic leagues">championnats</option><option value="european cups">coupes d'Europe</option></select></label>
      <label>Verdict<select id="f-lv"><option value="shown">effet démontré seulement</option><option value="">tous</option></select></label></div>
    <div class="table-wrap"><table><thead><tr><th>Ajout</th><th>Marché</th><th class="num">n</th><th class="num">Écart</th><th class="num">IC 95 %</th><th>Verdict</th></tr></thead><tbody id="levels-body"></tbody></table></div>
    <p class="legend-note">Écart de score (log loss ou RPS ; négatif = meilleur) par rapport au niveau précédent ou au modèle actif, mêmes matchs 2021-22 à 2025-26. Une tendance n'est intégrée au modèle actif que si elle passe les seuils de promotion fixés à l'avance.</p></div>
  <div class="grid two" style="margin-top:16px">
    <div class="card"><h2>Historique des versions</h2><p class="question">Quand et pourquoi le modèle actif a-t-il changé ?</p>
      <div class="table-wrap"><table><thead><tr><th>Version</th><th>Statut</th><th>Créée</th><th>Promue</th><th>Décision</th></tr></thead><tbody>
      ${d.versions.map((v) => `<tr><td>${esc(v.name)} v${v.version}</td><td><span class="badge ${v.status === "active" ? "fact" : "stable"}">${esc(v.status)}</span></td><td>${fdate(v.created_at)}</td><td>${fdate(v.promoted_at)}</td><td class="small">${esc(v.decision_note)}</td></tr>`).join("")}
      </tbody></table></div></div>
    <div class="card"><h2>Résultats en conditions réelles</h2><p class="question">Les prédictions enregistrées avant les matchs tiennent-elles ?</p>
      ${d.live.length ? `<table><thead><tr><th>Prédicteur</th><th>Marché</th><th class="num">n</th><th class="num">Log loss</th><th class="num">Réussite</th></tr></thead><tbody>${d.live.map((r) => `<tr><td>${esc(r.predictor_kind)} ${esc(r.model_name)}</td><td>${esc(r.market)}</td><td class="num">${r.n}</td><td class="num">${num(r.log_loss, 3)}</td><td class="num">${pct(r.accuracy, 0)}</td></tr>`).join("")}</tbody></table>`
        : na("Évaluation en direct", "Aucune prédiction réelle n'a encore été évaluée : aucun match des compétitions suivies n'a été publié à l'avance depuis la mise en service.")}</div>
  </div>`;
  setTimeout(() => {
    const drawLevels = () => {
      const m = document.getElementById("f-lm").value, sc = document.getElementById("f-ls").value, v = document.getElementById("f-lv").value;
      const rows = d.levels.filter((r) => r.segment.endsWith(":" + sc) && (!m || r.metric === m) && (!v || r.ci_high < 0 || r.ci_low > 0))
        .sort((a, b) => a.value - b.value);
      document.getElementById("levels-body").innerHTML = rows.map((r) => {
        const verdict = r.ci_high < 0 ? ["rising", "améliore"] : r.ci_low > 0 ? ["falling", "dégrade"] : ["stable", "aucun effet démontré"];
        const LEVEL_FR = { general: "général (Elo)", competition: "tendances de compétition", phase: "phase, tour, manche", teams: "équipes", market: "cotes" };
        const name = VARIANT_FR[r.model_name] || r.model_name.replace(/^(outcome_logistic|goals_poisson):/, "").replace(/\d_/g, "")
          .split(" -> ").map((x) => LEVEL_FR[x] || x).join(" → ") + (r.model_name.startsWith("goals_poisson") ? " (modèle de buts)" : "");
        return `<tr><td>${esc(name)}</td><td>${esc(MARKET_FR[r.metric] || r.metric)}</td><td class="num">${r.n}</td><td class="num">${num(r.value, 4)}</td><td class="num">[${num(r.ci_low, 4)} ; ${num(r.ci_high, 4)}]</td><td><span class="badge ${verdict[0]}">${verdict[1]}</span></td></tr>`;
      }).join("") || `<tr><td colspan="6" class="muted">Aucune ligne pour ce filtre.</td></tr>`;
    };
    ["f-lm", "f-ls", "f-lv"].forEach((id) => (document.getElementById(id).onchange = drawLevels));
    drawLevels();
    const sel = () => go("performance", { m: document.getElementById("f-cm").value, e: document.getElementById("f-ce").value, s: document.getElementById("f-cs").value });
    ["f-cm", "f-ce", "f-cs"].forEach((id) => (document.getElementById(id).onchange = sel));
    chart("ch-forest", { type: "bar", data: { labels: cmp.map((r) => `${r.model_name} − ${r.segment.replace("vs:", "")}`),
      datasets: [{ label: "IC 95 %", data: cmp.map((r) => [r.ci_low, r.ci_high]), backgroundColor: cmp.map((r) => (r.ci_high < 0 ? C.accent : r.ci_low > 0 ? C.down : C.na)), barThickness: 10 }] },
      options: { indexAxis: "y", plugins: { legend: { display: false }, tooltip: { callbacks: { label: (c) => { const r = cmp[c.dataIndex]; return `moyenne ${r.value.toFixed(4)} [${r.ci_low.toFixed(4)} ; ${r.ci_high.toFixed(4)}] n=${r.n}`; } } } },
        scales: { x: { title: { display: true, text: "Δ log loss" } } } } });
    chart("ch-bycomp", { type: "bar", data: { labels: comps, datasets: models.map((m, i) => ({ label: m,
      data: comps.map((c) => pick(m, "log_loss", `competition:${c}`).value ?? null),
      backgroundColor: [C.accent, C.away, C.ref, C.down, C.draw, "#7fae95", "#9db7d4"][i % 7] })) },
      options: { scales: { y: { min: 0.85, title: { display: true, text: "log loss" } } } } });
    const pts = d.calibration.filter((r) => r.model_name === calModel && r.segment.startsWith(`calibration:${scope}:${ev}:`))
      .map((r) => ({ x: 100 * Number(r.metric), y: 100 * r.value, n: r.n, lo: 100 * r.ci_low, hi: 100 * r.ci_high }));
    const ece = d.calibration.find((r) => r.model_name === calModel && r.segment === `calibration:${scope}:${ev}` && r.metric === "ece");
    chart("ch-calib", { type: "scatter", data: { datasets: [
      { label: "Observé (IC 95 %)", data: pts, backgroundColor: C.accent, pointRadius: pts.map((q) => Math.max(3, Math.min(10, Math.sqrt(q.n) / 4))) },
      { label: "IC haut", data: pts.map((q) => ({ x: q.x, y: q.hi })), pointStyle: "line", pointRadius: 6, borderColor: C.accent, showLine: false },
      { label: "IC bas", data: pts.map((q) => ({ x: q.x, y: q.lo })), pointStyle: "line", pointRadius: 6, borderColor: C.accent, showLine: false },
      { label: "Calibration parfaite", data: [{ x: 0, y: 0 }, { x: 100, y: 100 }], type: "line", borderColor: C.ref, borderDash: [5, 4], pointRadius: 0 }] },
      options: { plugins: { legend: { labels: { filter: (i) => !i.text.startsWith("IC ") } }, tooltip: { callbacks: { label: (c) => { const q = c.raw; return q.n ? `annoncé ${q.x.toFixed(1)} % → observé ${q.y.toFixed(1)} % [${q.lo.toFixed(1)} ; ${q.hi.toFixed(1)}], n=${q.n}` : ""; } } } },
        scales: { x: { min: 0, max: 100, title: { display: true, text: "probabilité annoncée (%)" } }, y: { min: 0, max: 100, title: { display: true, text: "fréquence observée (%)" } } } } });
    document.getElementById("calib-note").textContent = ece ? `ECE ${ece.value.toFixed(3)} sur ${ece.n} matchs. Taille des points ∝ effectif de la tranche ; barres = IC 95 % (Wilson).` : "Pas de données pour cette combinaison.";
  });
  return html;
}

/* ---------------- 6. Personal predictions ---------------- */
async function picks() {
  const d = await (await fetch("/api/admin/user-predictions")).json();
  const pickTxt = { H: "1", D: "X", A: "2" };
  const done = d.rows.filter((r) => r.res_home != null);
  let html = `<h1>Mes pronostics</h1>
  <p class="muted">Pronostics horodatés et figés avant le coup d'envoi, comparés à la prédiction enregistrée du modèle et au résultat.</p>
  <div class="grid kpis">
    <div class="card"><div class="kpi-label">Pronostics enregistrés</div><div class="kpi-value">${d.rows.length}</div><div class="kpi-note">${done.length} matchs joués</div></div>
    ${d.summary.filter((s) => s.market === "1X2").map((s) => `<div class="card"><div class="kpi-label">${s.predictor_kind === "user" ? "Mes choix 1X2" : "Modèle 1X2 (mêmes matchs)"}</div><div class="kpi-value">${pct(s.accuracy, 0)}</div><div class="kpi-note">de choix justes · n = ${s.n}${s.n < 100 ? " · échantillon trop petit pour conclure" : ""}</div></div>`).join("")}
  </div>`;
  html += hybridCard(d.hybrid);
  if (!d.rows.length) {
    return html + `<div class="card"><p class="muted">Aucun pronostic pour l'instant. Ouvrez un match programmé dans <a href="#/match">Analyse pré-match</a> pour en saisir un.</p></div>`;
  }
  html += `<div class="card"><div class="table-wrap"><table><thead><tr><th>Match</th><th>Choix</th><th class="num">Confiance</th><th>Modèle avant match</th><th>Résultat</th><th>Raisonnement</th></tr></thead><tbody>
    ${d.rows.map((r) => `<tr class="clickable" data-go="match" data-id="${r.match_id}" tabindex="0"><td>${fdate(r.kickoff_date)} · ${esc(r.competition)}<div>${esc(r.home)} – ${esc(r.away)}</div><div class="small muted">saisi le ${new Date(r.submitted_at).toLocaleString("fr-FR")}</div></td>
      <td>${pickTxt[r.pick]}${r.home_goals != null ? ` (${r.home_goals}-${r.away_goals})` : ""}</td><td class="num">${r.confidence}/5</td>
      <td class="small">${r.model ? `1 ${pct(r.model.p_home, 0)} · X ${pct(r.model.p_draw, 0)} · 2 ${pct(r.model.p_away, 0)}` : '<span class="badge na">aucune prédiction</span>'}</td>
      <td>${r.res_home != null ? `${r.res_home}-${r.res_away} ${r.correct == null ? "" : r.correct ? '<span class="badge rising">juste</span>' : '<span class="badge falling">faux</span>'}` : '<span class="muted">à venir</span>'}</td>
      <td class="small">${esc(r.reasoning || "")}</td></tr>`).join("")}</tbody></table></div></div>`;
  return html;
}

function hybridCard(h) {
  const verdicts = {
    adopt: ["rising", "gain fiable : critères de promotion remplis"],
    too_few_test_picks: ["stable", "pas assez de pronostics hors échantillon pour conclure (minimum 300)"],
    no_reliable_gain: ["stable", "aucun gain fiable : le modèle seul reste la référence"],
  };
  let body;
  if (h.status === "evaluated") {
    const [cls, txt] = verdicts[h.verdict] || ["na", h.verdict];
    body = `<p><span class="badge ${cls}">${esc(txt)}</span></p>
      <table><tbody><tr><td>Log loss modèle seul</td><td class="num">${num(h.logloss_model, 4)}</td></tr>
      <tr><td>Log loss hybride (hors échantillon)</td><td class="num">${num(h.logloss_hybrid, 4)}</td></tr>
      <tr><td>Écart (négatif = l'hybride est meilleur)</td><td class="num">${num(h.diff, 4)} <span class="small muted">IC 95 % [${num(h.ci_low, 4)} ; ${num(h.ci_high, 4)}]</span></td></tr></tbody></table>
      <p class="small muted">n = ${h.n_test} pronostics testés sur ${h.n_picks} · calcul du ${fdate(h.computed_at)}</p>`;
  } else {
    const n = h.n_picks ?? 0;
    body = `<p><span class="badge na">données insuffisantes</span></p>
      <p class="small">${h.status === "not_run" ? "Pas encore calculé." : `${n} pronostics évalués sur ${h.min_picks} nécessaires.`} Avant ${h.min_picks} pronostics, toute mesure de l'apport de vos choix serait du bruit.</p>`;
  }
  return `<div class="card" style="margin-bottom:16px"><h2>Modèle hybride (vos choix + modèle)</h2>
    <p class="question">Vos choix et votre confiance améliorent-ils les probabilités du modèle ? Chaque bloc de pronostics est prédit par un ajustement sur les blocs précédents seulement.</p>${body}</div>`;
}

/* ---------------- 7. Administration ---------------- */
function cronFr(expr) {
  const [mi, h, , , dow] = String(expr).split(/\s+/);
  const DAYS = { mon: "le lundi", tue: "le mardi", wed: "le mercredi", thu: "le jeudi", fri: "le vendredi", sat: "le samedi", sun: "le dimanche" };
  if (!/^\d+$/.test(mi) || !/^\d+$/.test(h)) return expr;
  const time = `${h.padStart(2, "0")}:${mi.padStart(2, "0")}`;
  return dow === "*" ? `tous les jours à ${time}` : DAYS[dow] ? `${DAYS[dow]} à ${time}` : expr;
}
const CYCLE_FR = { morning: "Matin : matchs, cotes, compositions, prédictions", evening: "Soir : résultats et évaluation",
  nightly: "Nuit : tendances", weekly: "Lundi : réentraînement" };
async function admin() {
  const d = await (await fetch("/api/admin/overview")).json();
  const yes = (b) => (b ? '<span class="badge fact">configurée</span>' : '<span class="badge na">absente</span>');
  const html = `<h1>Administration</h1>
  <p class="muted">Aucun secret n'est affiché : seule leur présence est indiquée. Les actions demandent le jeton d'administration.</p>
  ${tokenBox()}
  <div class="grid two">
    <div class="card"><h2>Clés et configuration</h2>
      <table><tbody>${Object.entries(d.secrets).map(([k, v]) => `<tr><td>${esc(k)}</td><td>${yes(v)}</td></tr>`).join("")}
      <tr><td>Fuseau horaire</td><td>${esc(d.timezone)}</td></tr></tbody></table>
      ${d.secrets.API_FOOTBALL_KEY ? "" : '<p class="small muted">Sans API_FOOTBALL_KEY, les coupes nationales et les blessures restent indisponibles. Les compositions des championnats viennent de OneFootball.</p>'}</div>
    <div class="card"><h2>Planification</h2><p class="question">Heures de ${esc(d.timezone)}. Modifiables avec les variables SCHEDULE_* du serveur.</p>
      <table><tbody>${Object.entries(d.schedule).map(([k, v]) => `<tr><td>${esc(CYCLE_FR[k] || k)}</td><td class="small" title="${esc(v)}">${esc(cronFr(v))}</td>
        <td><button class="btn ghost" style="white-space:nowrap" data-run="${esc(k)}">Lancer maintenant</button></td><td class="small" id="run-${esc(k)}">${esc(d.running[k]?.status || "")}</td></tr>`).join("")}</tbody></table>
      <p class="small muted">Un cycle déjà en cours (manuel ou planifié) est refusé grâce aux verrous.</p></div>
    <div class="card"><h2>Modèles</h2>
      <table><tbody>${d.models.map((m) => `<tr><td>${esc(m.name)} v${m.version}</td><td><span class="badge ${m.status === "active" ? "fact" : "stable"}">${esc(m.status)}</span></td><td>${fdate(m.promoted_at)}</td></tr>`).join("")}</tbody></table>
      <p><button class="btn ghost" id="rollback">Revenir à la version précédente</button> <span class="small" id="rollback-state"></span></p>
      <p class="small muted">Critères de promotion (fixés avant évaluation) :</p>
      <ul class="small muted">${Object.entries(d.promotion).map(([k, v]) => `<li><code>${esc(k)}</code> = ${esc(String(v))}</li>`).join("")}</ul></div>
    <div class="card"><h2>Sources</h2>
      <ul class="list">${d.sources.map((s) => `<li><span class="row-title">${esc(s.name)}</span> <span class="badge ${s.enabled ? "fact" : "na"}">${s.enabled ? "active" : "inactive"}</span><div class="small muted">${esc(s.terms_note)}</div><div class="small"><a href="${esc(s.terms_url)}" target="_blank" rel="noopener">conditions d'utilisation</a></div></li>`).join("")}</ul></div>
  </div>
  <div class="card" style="margin-top:16px"><h2>Compétitions</h2><p class="question">Désactiver une compétition l'exclut des prochaines collectes et prédictions ; son historique est conservé.</p>
    <div class="table-wrap"><table><thead><tr><th>Code</th><th>Nom</th><th>Type</th><th>Rôle</th><th class="num">Matchs</th><th>Active</th></tr></thead><tbody>
    ${d.competitions.map((c) => `<tr><td>${esc(c.code)}</td><td>${esc(c.name)}</td><td>${esc(c.type)}</td><td>${c.is_target ? "cible" : "contexte"}</td><td class="num">${c.matches}</td>
      <td><input type="checkbox" data-comp="${esc(c.code)}" ${c.active ? "checked" : ""} style="min-width:0"></td></tr>`).join("")}</tbody></table></div></div>
  <div class="grid two" style="margin-top:16px">
    <div class="card"><h2>Journal des collectes</h2><div class="table-wrap"><table><thead><tr><th>Tâche</th><th>Statut</th><th>Début</th><th class="num">+</th><th class="num">~</th><th>Erreur</th></tr></thead><tbody>
      ${d.runs.map((r) => `<tr><td>${esc(r.job_name)}</td><td><span class="badge ${r.status === "success" ? "rising" : r.status === "running" ? "emerging" : "falling"}">${esc(r.status)}</span></td><td class="small">${new Date(r.started_at).toLocaleString("fr-FR")}</td><td class="num">${r.rows_inserted}</td><td class="num">${r.rows_updated}</td><td class="small">${esc(r.error || "")}</td></tr>`).join("")}</tbody></table></div></div>
    <div class="card"><h2>Anomalies de données récentes</h2><div class="table-wrap"><table><tbody>
      ${d.issues.map((i) => `<tr><td><span class="badge ${i.severity === "error" ? "falling" : "stable"}">${esc(i.severity)}</span></td><td>${esc(i.code)}</td><td class="small">${esc(i.message)}</td></tr>`).join("")}</tbody></table></div></div>
  </div>`;
  setTimeout(() => {
    bindToken();
    document.querySelectorAll("[data-run]").forEach((b) => (b.onclick = async () => {
      const cell = document.getElementById(`run-${b.dataset.run}`);
      try { await send("POST", `/api/admin/run/${b.dataset.run}`); cell.textContent = "lancé"; } catch (e) { cell.textContent = `refusé : ${e.message}`; }
    }));
    document.getElementById("rollback").onclick = async () => {
      if (!confirm("Revenir à la version de modèle précédente ?")) return;
      const st = document.getElementById("rollback-state");
      try { const r = await send("POST", "/api/admin/models/rollback"); st.textContent = `actif : ${r.active}`; } catch (e) { st.textContent = `refusé : ${e.message}`; }
    };
    document.querySelectorAll("[data-comp]").forEach((c) => (c.onchange = async () => {
      try { await send("PATCH", `/api/admin/competitions/${c.dataset.comp}`, { active: c.checked }); }
      catch (e) { c.checked = !c.checked; alert(`Refusé : ${e.message}`); }
    }));
  });
  return html;
}

/* ---------------- 0. Matches (start page) ---------------- */
function strip(p, market, big = false, names = null) {
  const [h, d, a] = p.map((x) => Math.max(0, x || 0));
  const w = (x) => `${(100 * x).toFixed(1)}%`;
  const mk = market ? `<div class="strip-market"><span>marché ${pct(market[0], 0)}</span><span>${pct(market[1], 0)}</span><span>${pct(market[2], 0)}</span></div>` : "";
  return `<div class="strip${big ? " big" : ""}" role="img" aria-label="Domicile ${pct(h, 0)}, nul ${pct(d, 0)}, extérieur ${pct(a, 0)}">
    <div class="strip-nums">${[h, d, a].map((x, i) => `<span${i === 0 ? ' class="h"' : i === 2 ? ' class="a"' : ""}>${names ? `<small>${esc(names[i])}</small>` : ""}<b>${Math.round(100 * x)}</b> %</span>`).join("")}</div>
    <div class="strip-bar"><span class="h" style="width:${w(h)}"></span><span class="d" style="width:${w(d)}"></span><span class="a" style="width:${w(a)}"></span></div>${mk}</div>`;
}

function marketGaps(m) {
  if (!m.market || m.p_home == null) return null;
  const gaps = [m.p_home - m.market[0], m.p_draw - m.market[1], m.p_away - m.market[2]];
  const i = gaps.reduce((b, g, k) => (Math.abs(g) > Math.abs(gaps[b]) ? k : b), 0);
  return { i, gap: gaps[i], side: [m.home, "le nul", m.away][i] };
}
const signedPts = (g) => `${g > 0 ? "+" : "−"}${Math.round(100 * Math.abs(g))} pts`;

/* The owner's teams and the market he plays in each league (memory: betting habits).
   "*" means every team of the league. */
const MY_TEAMS = {
  "ENG-PL": { teams: "*", market: "fg" },
  "GER-BL": { teams: "*", market: "btts" },
  "ITA-SA": { teams: ["Lazio", "Inter", "Milan", "Como", "Bologna"], market: "fg" },
  "ESP-LL": { teams: ["Barcelona", "Ath Madrid", "Real Madrid", "Villarreal", "Betis"], market: "fg" },
  "FRA-L1": { teams: ["Paris SG"], market: "fg" },
};
const myPref = (m) => MY_TEAMS[m.competition];
/* The owner's teams by name, learnt from their league matches, so Dortmund or Como count in
   the Champions League too. */
const MINE = new Set();
function learnMine(matches) {
  for (const m of matches) {
    const p = myPref(m);
    if (!p) continue;
    for (const t of [m.home, m.away]) if (p.teams === "*" || p.teams.includes(t)) MINE.add(t);
  }
}
/* National teams (D83, D84): every match with bookmaker prices, and every match of these teams. */
const NATIONAL_ALWAYS = new Set(["DR Congo", "France", "Spain", "Netherlands", "Italy", "Germany", "England",
  "Portugal", "Argentina", "Uruguay", "United States", "Brazil", "Norway", "Denmark", "Switzerland", "Morocco",
  "Egypt", "Senegal", "Nigeria", "Ivory Coast", "Algeria", "Japan", "Mexico", "Chile", "Greece"]);
const nationalMine = (m) => !!m.market || NATIONAL_ALWAYS.has(m.home) || NATIONAL_ALWAYS.has(m.away);
function isMine(m) {
  if (String(m.competition).startsWith("INT-")) return nationalMine(m);
  const p = myPref(m);
  return (!!p && (p.teams === "*" || p.teams.includes(m.home) || p.teams.includes(m.away)))
    || MINE.has(m.home) || MINE.has(m.away);
}
/* The side to read: the followed team, else the likelier first scorer. */
function mySide(m) {
  const p = myPref(m);
  if (p && p.teams !== "*") {
    if (p.teams.includes(m.home) && !p.teams.includes(m.away)) return 0;
    if (p.teams.includes(m.away) && !p.teams.includes(m.home)) return 2;
  }
  return m.fg && m.fg[2] > m.fg[0] ? 2 : 0;
}
function myFlag(m) {
  const p = myPref(m);
  const fair = (x) => `<br><span class="muted">intéressant si betPawa paie plus de <b>${odds2(1 / x)}</b></span>`;
  if (p && p.market === "btts" && m.p_btts != null) {
    return `<span class="flag safe"><span class="play">À surveiller</span> · <b>les 2 équipes marquent</b> ${pct(m.p_btts, 0)}${fair(m.p_btts)}<br><span class="muted small">source : modèle</span></span>`;
  }
  if (!m.fg) return "";
  const side = mySide(m);
  const team = side === 0 ? m.home : m.away;
  const i = side === 0 ? 0 : 1;
  // Bookmakers' figures first when known: betPawa's price is judged against them.
  const fg = m.fg_mkt ? m.fg_mkt[side] : m.fg[side];
  const up = m.up1_mkt ? m.up1_mkt[i] : m.up1[i];
  const src = m.fg_mkt ? "source : bookmakers" : "source : modèle";
  return `<span class="flag safe"><span class="play">À surveiller</span> · <b>${esc(team)} marque en 1er</b> ${pct(fg, 0)}${fair(fg)}<br><span class="muted">1UP ${esc(team)} ${pct(up, 0)}, plus de ${odds2(1 / up)}</span><br><span class="muted small">${src}</span></span>`;
}

/* Tickets du jour (D69): three combos of 10 or more per match day, with every alternative
   of each match. Prices marked "vérifiée" come from the owner's betPawa screenshots. */
function ticketsView(t) {
  if (!t || !t.days || !t.days.length) {
    return `<div class="empty"><p class="muted">Pas encore de tickets : ils sont calculés au cycle du matin pour les deux prochains jours de matchs.</p></div>`;
  }
  const time = (k) => (k ? new Date(k).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }) : "—");
  const price = (x) => `${odds2(x.price)}${x.known ? ' <span class="ok" title="cote vérifiée sur betPawa">✔</span>' : ' <span class="muted small">est.</span>'}`;
  const evTxt = (e) => `${e >= 0 ? "+" : "−"}${Math.abs(100 * e).toFixed(1).replace(".", ",")} %`;
  const altTable = (alts, chosen) => `<div class="table-wrap"><table class="tight alts"><thead><tr><th>Pronostic</th><th class="num">Proba</th>
      <th class="num">Juste</th><th class="num">betPawa</th><th class="num">Écart</th></tr></thead><tbody>${alts.map((a) =>
      `<tr${a.key === chosen ? ' class="me"' : ""}><td>${esc(a.label)}</td><td class="num">${pct(a.prob, 0)}</td><td class="num">${odds2(a.fair)}</td>
        <td class="num">${price(a)}</td><td class="num ${a.ev >= 0 ? "pos" : "neg"}">${evTxt(a.ev)}</td></tr>`).join("")}</tbody></table></div>`;
  return t.days.map((d) => {
    const byId = new Map(d.matches.map((m) => [m.match_id, m]));
    const label = new Date(`${d.date}T12:00:00`).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });
    const tickets = d.tickets.map((tk) => {
      const once = Math.round(1 / tk.prob);
      const legs = tk.legs.map((l) => fold(
        `<span class="leg"><span class="muted">${time(l.kickoff_utc)}</span> <b>${esc(l.match)}</b> · ${esc(l.label)}
          <span class="leg-odds">${pct(l.prob, 0)} · ${price(l)}</span></span>`,
        altTable(byId.get(l.match_id)?.alternatives || [], l.key), { inner: true, note: "autres choix" })).join("");
      return `<div class="card ticket"><h2>Ticket ${esc(tk.tag)} · ${esc(tk.name)}</h2>
        <p class="question">${tk.legs.length} sélections · cote ${odds2(tk.odds)} · passe environ 1 fois sur ${once} ·
          espérance avec le Bonus Gagnant ${evTxt(tk.ev)}</p>${legs}</div>`;
    }).join("");
    // D72: scenarios that moved the market price, in plain words.
    const notes = (m) => (m.scenarios || []).length
      ? `<div class="finding"><b>Ce que la machine a remarqué</b>${m.scenarios.map((n) => `<p>${esc(n.text)}</p>`).join("")}</div>` : "";
    const all = d.matches.map((m) => fold(`<span class="muted">${time(m.kickoff_utc)}</span> ${esc(m.match)}${m.followed ? "" : ' <span class="badge">autre</span>'}${(m.scenarios || []).length ? ' <span class="badge">scénario</span>' : ""}`,
      notes(m) + altTable(m.alternatives, null), { inner: true })).join("");
    return `<section><div class="day"><h2>${esc(label.charAt(0).toUpperCase() + label.slice(1))}</h2><span>${d.tickets.length} tickets</span></div>
      ${(d.missing || []).map((m) => `<p class="muted">Pas de ticket ${esc(m.tag)} : il faut au moins ${m.needs} matchs de vos équipes, il y en a ${d.n_followed}.</p>`).join("")}
      <div class="grid">${tickets}</div>
      <div class="card" style="margin-top:var(--space-4)"><h2>Toutes les alternatives du jour</h2>
        <p class="question">Chaque match avec tous ses pronostics, du plus sûr au moins sûr après la marge de betPawa.</p>${all}</div></section>`;
  }).join("") + `<p class="meta">Un ticket vise une cote d'au moins 10 avec la meilleure chance de passer. Ne prends une sélection que si betPawa affiche au moins la cote indiquée. ✔ = cote vérifiée sur betPawa ; « est. » = cote estimée, à vérifier. ${esc(t.note || "")}</p>`;
}

let homeFilter = (() => { try { return localStorage.getItem("fi_home_filter") || "mine"; } catch { return "mine"; } })();
let homeAll = false;
/* Matches still to play (kept 2 h after kick-off), whatever the date of the last export. */
function upcomingOnly(m) {
  return m.kickoff_utc ? new Date(m.kickoff_utc).getTime() > Date.now() - 2 * 36e5
    : String(m.kickoff_date) >= new Date().toLocaleDateString("en-CA");
}
/* A warning when the data was not refreshed by the daily cycle for more than 30 hours. */
function staleNote(last) {
  if (!last || Date.now() - new Date(last).getTime() < 30 * 36e5) return "";
  const when = new Date(last).toLocaleString("fr-FR", { weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" });
  return `<div class="finding warn"><p><b>Données du ${esc(when)}.</b> Le cycle quotidien n'a pas tourné depuis : les matchs déjà joués sont masqués, mais les probabilités et les cotes ne sont pas à jour.</p></div>`;
}
function fixtureRow(m) {
  const time = m.kickoff_utc ? new Date(m.kickoff_utc).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }) : "—";
  const has = m.p_home != null;
  const fav = has ? [m.p_home, m.p_draw, m.p_away].indexOf(Math.max(m.p_home, m.p_draw, m.p_away)) : -1;
  // One line per match: its safest checked market and the fair odds to beat.
  const sp = m.safe;
  const flag = has && isMine(m) ? myFlag(m) : !has || sp === undefined ? "" : sp
    ? `<span class="flag safe"><span class="play">Le plus sûr</span> · <b>${esc(shortKey(sp.key))}</b> ${pct(sp.prob, 0)}<br><span class="muted">intéressant si betPawa paie plus de <b>${odds2(sp.fair_odds)}</b></span></span>`
    : `<span class="flag">aucun pari assez sûr</span>`;
  const name = (n, i) => (fav === i ? `<b>${esc(n)}</b>` : esc(n));
  // Far fixtures without probabilities have no match page yet (export size).
  const tag = m.detail === false ? "div" : "a";
  const href = m.detail === false ? "" : ` href="#/match?id=${m.id}"`;
  return `<${tag} class="fixture"${href}>
    <span class="time">${time}</span>
    <span class="teams"><span class="match">${name(m.home, 0)} – ${name(m.away, 2)}</span>
      <span class="comp">${esc(compName(m.competition, m.competition_name))}</span></span>
    ${has ? strip([m.p_home, m.p_draw, m.p_away], null, false, [m.home, "Nul", m.away]) : `<span class="nopred">Probabilités au prochain cycle du matin</span>`}
    ${flag}</${tag}>`;
}

async function home() {
  const d = await get("/home");
  learnMine(d.matches);
  d.matches = d.matches.filter(upcomingOnly);
  const sub = document.getElementById("brand-sub");
  if (sub) sub.textContent = d.last_result ? `résultats jusqu'au ${fdate(d.last_result)}` : "";
  const comps = [...new Set(d.matches.map((m) => m.competition))].sort((a, b) => compRank(a) - compRank(b) || a.localeCompare(b));
  const inComp = d.matches.filter((m) => homeFilter === "all" || (homeFilter === "mine" ? isMine(m) : m.competition === homeFilter));
  const today = new Date().toISOString().slice(0, 10);
  const horizon = new Date(Date.now() + 7 * 864e5).toISOString().slice(0, 10);
  const shown = homeAll ? inComp : inComp.filter((m) => m.kickoff_date <= horizon);
  const hidden = inComp.length - shown.length;
  const withGap = inComp.map((m) => ({ m, g: marketGaps(m) })).filter((x) => x.g);
  const top = withGap.sort((a, b) => Math.abs(b.g.gap) - Math.abs(a.g.gap))[0];
  const head = `<div class="page-head"><div><h1>Matchs</h1>
    <p>${inComp.length} match${inComp.length > 1 ? "s" : ""} sur trois semaines. Chaque ligne donne les chances de chaque équipe et le pari à surveiller, avec la cote à partir de laquelle il devient intéressant.</p></div></div>`;
  if (!d.matches.length) {
    return head + `<div class="empty"><h2>Aucun match publié pour l'instant</h2>
      <p class="muted">Le cycle du matin récupère les prochains matchs dès que les sources les publient, puis calcule les probabilités. Vous pouvez le lancer tout de suite depuis l'<a href="#/admin">administration</a>.</p></div>`;
  }
  const finding = top
    ? `<div class="finding"><p>Plus gros écart avec le marché : <b>${esc(top.m.home)} – ${esc(top.m.away)}</b>, le modèle donne ${signedPts(top.g.gap)} sur ${esc(top.g.side)} (${pct([top.m.p_home, top.m.p_draw, top.m.p_away][top.g.i], 0)} contre ${pct(top.m.market[top.g.i], 0)}).</p>
        <a href="#/match?id=${top.m.id}">Ouvrir le match</a></div>`
    : "";
  // One tab per view, in a fixed order; a swipe on the list moves to the next or previous tab.
  const views = [["all", "Tous", d.matches.length], ["mine", "Mes équipes", d.matches.filter(isMine).length],
    ...comps.map((c) => [c, compName(c), d.matches.filter((m) => m.competition === c).length])];
  if (!views.some(([k]) => k === homeFilter)) homeFilter = "all";
  const tabsBar = `<div class="tabs comp-tabs" role="tablist" aria-label="Compétitions">${views.map(([k, label, n]) =>
    `<button type="button" role="tab" class="tab${k === homeFilter ? " on" : ""}" aria-selected="${k === homeFilter}" data-c="${esc(k)}">${esc(label)}${n == null ? "" : `<span class="tab-n">${n}</span>`}</button>`).join("")}</div>`;
  const byDay = new Map();
  shown.forEach((m) => { const k = m.kickoff_date; if (!byDay.has(k)) byDay.set(k, []); byDay.get(k).push(m); });
  const days = [...byDay.entries()].map(([day, rows]) => {
    const label = new Date(`${day}T12:00:00`).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });
    const title = day === today ? "Aujourd'hui" : label.charAt(0).toUpperCase() + label.slice(1);
    const count = (n) => `${n} match${n > 1 ? "s" : ""}`;
    const ready = rows.filter((m) => m.p_home != null);
    const waiting = rows.filter((m) => m.p_home == null);
    // Matches without probabilities yet are secondary: they stay folded under the day.
    const later = waiting.length
      ? fold(ready.length ? `${count(waiting.length)} sans probabilités` : title,
        `<div class="fixtures">${waiting.map(fixtureRow).join("")}</div>`,
        { note: ready.length ? "calcul au prochain cycle du matin" : `${count(waiting.length)}, probabilités au prochain cycle du matin` })
      : "";
    if (!ready.length) return `<section>${later}</section>`;
    return `<section><div class="day"><h2>${title}</h2><span>${count(rows.length)}</span></div>
      <div class="fixtures">${ready.map(fixtureRow).join("")}</div>${later}</section>`;
  }).join("");
  const more = hidden > 0 ? `<p class="more"><button class="btn ghost" id="show-all" type="button">Afficher les ${hidden} matchs des deux semaines suivantes</button></p>` : "";
  const status = `<div class="status-line" style="margin-top:var(--space-5)">
    <span>Modèle <b>${esc(d.model || "aucun")}</b></span>
    <span>Calcul le plus récent <b>${d.last_prediction ? new Date(d.last_prediction).toLocaleString("fr-FR", { day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" }) : "aucun"}</b></span>
    <span><a href="#/performance">Voir la fiabilité du modèle</a></span></div>`;
  setTimeout(() => {
    const keys = views.map(([k]) => k);
    const go = (k) => {
      homeFilter = k;
      try { localStorage.setItem("fi_home_filter", k); } catch { /* private mode */ }
      route();
    };
    const step = (dir) => {
      const i = keys.indexOf(homeFilter) + dir;
      if (i >= 0 && i < keys.length) go(keys[i]);
    };
    const bar = document.querySelector(".comp-tabs");
    if (bar) {
      bar.querySelectorAll(".tab").forEach((b) => (b.onclick = () => go(b.dataset.c)));
      bar.onkeydown = (e) => { if (e.key === "ArrowRight") step(1); if (e.key === "ArrowLeft") step(-1); };
      bar.querySelector(".tab.on")?.scrollIntoView({ block: "nearest", inline: "center" });
    }
    // Finger moves left: next tab (to the right), like turning a page.
    const pane = document.getElementById("home-pane");
    let x0 = null, y0 = null;
    if (pane) {
      pane.addEventListener("touchstart", (e) => { x0 = e.touches[0].clientX; y0 = e.touches[0].clientY; }, { passive: true });
      pane.addEventListener("touchend", (e) => {
        if (x0 === null) return;
        const dx = e.changedTouches[0].clientX - x0, dy = e.changedTouches[0].clientY - y0;
        x0 = null;
        if (Math.abs(dx) > 60 && Math.abs(dx) > 1.5 * Math.abs(dy)) step(dx < 0 ? 1 : -1);
      }, { passive: true });
    }
    const all = document.getElementById("show-all");
    if (all) all.onclick = () => { homeAll = true; route(); };
  });
  return head + staleNote(d.last_prediction) + tabsBar + `<div id="home-pane">` + finding + (days || `<div class="empty"><p class="muted">Aucun match dans les 7 prochains jours pour ce filtre.</p></div>`) + more + `</div>` + status;
}

/* Side cards folded on each page: the title stays visible, the content opens on click. */
const FOLDED = {
  performance: ["Apport mesuré des niveaux et des tendances", "Historique des versions", "Résultats en conditions réelles"],
  competitions: ["Tendances détectées (dernier calcul)", "Particularités par rapport au niveau des équipes"],
  tendances: ["Fiabilité des probabilités par marché", "Qualité et couverture des données"],
  teams: ["Tendances mesurées"],
  admin: ["Compétitions", "Sources", "Journal des collectes", "Anomalies de données récentes"],
};
function foldCards(page) {
  const titles = FOLDED[page] || [];
  document.querySelectorAll("#app .card > h2").forEach((h2) => {
    if (!titles.includes(h2.textContent.trim())) return;
    const card = h2.parentElement;
    const details = document.createElement("details");
    details.className = "fold";
    details.style.marginTop = card.style.marginTop;
    const summary = document.createElement("summary");
    summary.textContent = h2.textContent;
    const body = document.createElement("div");
    body.className = "fold-body";
    h2.remove();
    while (card.firstChild) body.appendChild(card.firstChild);
    details.append(summary, body);
    card.replaceWith(details);
  });
}

/* The big percentages count up from 0 once per page (600 ms), unless reduced motion is asked. */
function countUp(root) {
  if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
  const els = [...root.querySelectorAll(".strip.big .strip-nums b, .pick-p")];
  const targets = els.map((el) => { const m = el.textContent.match(/^(\d+)(.*)$/); return m ? [el, Number(m[1]), m[2]] : null; }).filter(Boolean);
  if (!targets.length) return;
  // The page function performance() hides window.performance: time comes from the frames.
  let start = null;
  const step = (now) => {
    start ??= now;
    const t = Math.min(1, (now - start) / 600), e = 1 - (1 - t) ** 3;
    for (const [el, v, rest] of targets) el.textContent = `${Math.round(v * e)}${rest}`;
    if (t < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}


/* ---------------- Aujourd'hui (home, 2026-11-04) ----------------
   The owner opens the site to know what to play today: his tickets first, then his teams'
   matches, then what the machine noticed. Every figure says what it is in words. */
const dayLabel = (iso) => { const l = new Date(`${iso}T12:00:00`).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" }); return l.charAt(0).toUpperCase() + l.slice(1); };
const hhmm = (k) => (k ? new Date(k).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }) : "—");
const localToday = () => new Date().toLocaleDateString("en-CA");

function ticketCard(tk) {
  const once = Math.round(1 / tk.prob);
  const legs = tk.legs.map((l) => `<li><span class="t">${hhmm(l.kickoff_utc)}</span>
    <span>${esc(l.match)}<br><span class="muted">${esc(l.label)} · ${pct(l.prob, 0)} de chances</span></span>
    <span class="o">${odds2(l.fair)}</span></li>`).join("");
  return `<div class="card ticket"><h2>Ticket ${esc(tk.tag)} · ${esc(tk.name)}</h2>
    <p class="question">Cote totale <b>${odds2(tk.odds)}</b> · passe environ 1 fois sur ${once}</p>
    <ul class="legs-plain">${legs}</ul>
    <p class="meta">À droite, la cote juste : ne prenez une sélection que si betPawa paie plus.</p></div>`;
}

async function today() {
  const [d, t, lec] = await Promise.all([get("/home"), get("/tickets").catch(() => null), get("/lecture").catch(() => null)]);
  learnMine(d.matches);
  const now = localToday();
  const tday = (t?.days || []).find((x) => x.date >= now);
  const mine = d.matches.filter(upcomingOnly).filter((m) => m.p_home != null && isMine(m));
  const firstDay = mine.map((m) => m.kickoff_date).sort()[0];
  const myDay = mine.filter((m) => m.kickoff_date === firstDay);
  const head = `<div class="page-head"><div><h1>Aujourd'hui</h1>
    <p>${esc(dayLabel(now))}. Vos tickets et les matchs de vos équipes.</p></div></div>`;

  let tickets;
  if (!tday) {
    tickets = `<div class="empty"><p class="muted">Pas de ticket pour l'instant : ils sont calculés chaque matin pour les deux prochains jours de matchs.</p></div>`;
  } else {
    const when = tday.date === now ? "" : ` pour ${dayLabel(tday.date).toLowerCase()}`;
    const missing = (tday.missing || []).map((m) => `<p class="muted">Pas de ticket ${esc(m.tag)} : il faut au moins ${m.needs} matchs de vos équipes, il y en a ${tday.n_followed}.</p>`).join("");
    tickets = `<p class="lead">Les combinaisons de vos équipes les plus susceptibles de passer, à une cote d'au moins 10${esc(when)}.</p>
      ${missing}<div class="grid">${tday.tickets.map(ticketCard).join("")}</div>
      <p class="more"><a class="btn ghost" href="#/tickets">Voir tous les choix possibles, match par match</a></p>`;
  }
  const noticed = (tday?.matches || []).filter((m) => m.followed && (m.scenarios || []).length);
  const notes = noticed.length ? `<section class="today-block"><h2>Ce que la machine a remarqué</h2>
      <p class="lead">Des situations déjà vues souvent par le passé, qui ont changé le pronostic de ces matchs.</p>
      <div class="card">${noticed.map((m) => `<p><b>${esc(m.match)}</b></p>${m.scenarios.map((n) => `<p class="muted">${esc(n.text)}</p>`).join("")}`).join("")}</div></section>` : "";
  const matches = myDay.length
    ? `<section class="today-block"><h2>${firstDay === now ? "Vos matchs aujourd'hui" : `Prochains matchs de vos équipes : ${esc(dayLabel(firstDay).toLowerCase())}`}</h2>
      <div class="fixtures">${myDay.map(fixtureRow).join("")}</div>
      <p class="more"><a href="#/matchs">Tous les matchs</a></p></section>`
    : `<section class="today-block"><h2>Vos matchs</h2><div class="empty"><p class="muted">Aucun match de vos équipes dans les trois prochaines semaines.</p></div></section>`;
  // D77/D78: one short text per competition, written by a language model from these figures only.
  const lecture = lec && (lec.groups || []).length && lec.date >= now
    ? `<section class="today-block"><h2>Lecture du jour</h2>
        <p class="lead">Un résumé par compétition, écrit par une IA à partir des seuls chiffres du site, puis vérifié : un texte avec un chiffre inventé est rejeté.</p>
        <div class="card">${lec.groups.map((g) => `<p><b>${esc(g.competition)}</b></p><p class="muted">${esc(g.text)}</p>`).join("")}</div></section>`
    : "";
  return head + staleNote(d.last_prediction) + `<section class="today-block"><h2>Vos tickets</h2>${tickets}</section>` + lecture + notes + matches;
}

async function ticketsPage() {
  const t = await get("/tickets").catch(() => null);
  if (t && t.days) t.days = t.days.filter((x) => x.date >= localToday());
  return `<div class="page-head"><div><h1>Tous les choix</h1><p>Chaque ticket avec ses autres choix possibles, et tous les pronostics de chaque match de vos équipes.</p></div></div>` + ticketsView(t);
}

/* ---------------- Bilan ---------------- */
async function bilan() {
  const b = await get("/bilan").catch(() => ({ tickets: [], matches: [] }));
  const mark = (w) => (w === 1 ? `<span class="state won">gagné</span>` : w === 0 ? `<span class="state lost">perdu</span>` : `<span class="state open">en attente</span>`);
  const stateCls = { "gagné": "won", "perdu": "lost", "en cours": "open" };
  const tk = b.tickets.length
    ? b.tickets.map((d) => `<h3>${esc(dayLabel(d.date))}</h3><div class="grid">${d.tickets.map((t) => `<div class="card">
        <h2>Ticket ${esc(t.tag)} · cote ${odds2(t.odds)} <span class="state ${stateCls[t.state]}">${esc(t.state)}</span></h2>
        <p class="question">${t.right} sélection${t.right > 1 ? "s" : ""} juste${t.right > 1 ? "s" : ""} sur ${t.legs.length}</p>
        <ul class="legs-plain">${t.legs.map((l) => `<li><span class="t">${esc(l.score || "—")}</span>
          <span>${esc(l.match)}<br><span class="muted">${esc(l.label)}</span></span><span>${mark(l.won)}</span></li>`).join("")}</ul></div>`).join("")}</div>`).join("")
    : `<div class="empty"><p class="muted">Les tickets sont archivés chaque matin depuis le 5 novembre 2026. Leur bilan s'affiche ici dès que leurs matchs sont joués.</p></div>`;
  const ms = b.matches || [];
  const both = ms.filter((m) => m.market);
  const n = (xs, k) => xs.filter((m) => m[k]).length;
  const side = (m, p) => { const i = p.indexOf(Math.max(...p)); return `${[m.home, "nul", m.away][i]} ${pct(p[i], 0)}`; };
  const summary = ms.length
    ? `<p class="lead">Sur les 7 derniers jours, le favori du modèle a eu raison <b>${n(ms, "model_right")} fois sur ${ms.length}</b>.
       ${both.length ? `Sur les ${both.length} matchs où l'on connaît aussi la cote des bookmakers : modèle ${n(both, "model_right")}, bookmakers ${n(both, "market_right")}.` : ""}</p>`
    : `<p class="lead">Aucun match joué ces 7 derniers jours.</p>`;
  const ok = (r) => (r ? `<span class="state won">juste</span>` : `<span class="state lost">raté</span>`);
  const byDate = [...new Set(ms.map((m) => m.date))];
  const list = byDate.map((dt) => `<h3>${esc(dayLabel(dt))}</h3><div class="card"><ul class="legs-plain results">${ms.filter((m) => m.date === dt).map((m) =>
    `<li><span class="t">${esc(m.score)}</span><span>${esc(m.home)} – ${esc(m.away)}<br>
      <span class="muted">Modèle : ${esc(side(m, m.model))} ${ok(m.model_right)}${m.market ? ` · Bookmakers : ${esc(side(m, m.market))} ${ok(m.market_right)}` : ""}</span></span><span></span></li>`).join("")}</ul></div>`).join("");
  return `<div class="page-head"><div><h1>Bilan</h1><p>Ce qu'ont donné vos tickets et les pronostics des derniers jours.</p></div></div>
    <section class="today-block"><h2>Vos tickets</h2>${tk}</section>
    <section class="today-block"><h2>Les pronostics</h2>${summary}
      ${list}</section>`;
}

/* ---------------- Router ---------------- */
const PAGES = { "": today, matchs: home, tickets: ticketsPage, bilan, tendances: overview, competitions, teams, match: matchPage, performance, picks, admin,
  ...(window.fiPages || {}) };
async function route() {
  resetCharts();
  const page = (location.hash.replace(/^#\/?/, "").split("?")[0]) || "";
  const navPage = page === "match" ? "matchs" : page === "tickets" ? "" : page;
  document.querySelectorAll("nav a[data-page]").forEach((a) => a.classList.toggle("active", a.dataset.page === navPage));
  const CRUMB = { "": "Aujourd'hui", matchs: "Matchs", tickets: "Tous les choix", bilan: "Bilan", match: "Matchs", picks: "Mes pronostics", competitions: "Compétitions", teams: "Équipes",
    performance: "Fiabilité du modèle", tendances: "Tendances", admin: "Administration", ...(window.fiCrumbs || {}) };
  document.getElementById("crumb").textContent = CRUMB[page] || "Football Intel";
  document.getElementById("sidebar").classList.remove("open");
  document.getElementById("menu-btn").setAttribute("aria-expanded", "false");
  readColors();
  const app = document.getElementById("app");
  app.innerHTML = `<p class="loading">Chargement…</p>`;
  try {
    app.innerHTML = await (PAGES[page] || overview)();
    countUp(app);
    foldCards(page);
  } catch (e) {
    app.innerHTML = `<div class="empty"><h2>Cette page n'a pas pu être chargée</h2><p class="muted">Le serveur a répondu : ${esc(e.message)}. Vérifiez que le service tourne, puis rechargez la page.</p></div>`;
  }
  window.scrollTo(0, 0);
}
window.addEventListener("hashchange", route);
// Navigation from rows and cards (data-go), without inline handlers: the site's CSP forbids them.
function goFrom(el) { const { go: page, ...p } = el.dataset; go(page, p); }
document.addEventListener("click", (e) => { const el = e.target.closest("[data-go]"); if (el) goFrom(el); });
document.addEventListener("keydown", (e) => {
  const el = e.key === "Enter" && e.target.closest && e.target.closest("[data-go]");
  if (el) goFrom(el);
});
const themeBtn = document.getElementById("theme-btn");
const themeLabel = () => { themeBtn.textContent = document.documentElement.dataset.theme === "light" ? "Mode sombre" : "Mode clair"; };
themeBtn.onclick = () => {
  const root = document.documentElement;
  root.dataset.theme = root.dataset.theme === "light" ? "dark" : "light";
  try { localStorage.setItem("fi_theme", root.dataset.theme); } catch { /* storage blocked */ }
  themeLabel();
  route();
};
themeLabel();
document.getElementById("menu-close").onclick = () => {
  document.getElementById("sidebar").classList.remove("open");
  document.getElementById("menu-btn").setAttribute("aria-expanded", "false");
};
document.getElementById("menu-btn").onclick = (e) => {
  const open = document.getElementById("sidebar").classList.toggle("open");
  e.currentTarget.setAttribute("aria-expanded", String(open));
};
(window.fiReady || Promise.resolve()).then(route);
