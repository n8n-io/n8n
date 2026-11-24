"""Trend report, filterable by date, competition, team and category.

Labels:
[Fait]           a measured value from stored rows;
[Interprétation] a reading of measured values (persistence tests, comparisons);
[Hypothèse]      a signal that has not passed the confirmation rules.
"""

from datetime import date

import pandas as pd
from sqlalchemy import Engine, text

from footintel.analysis.events import DEFINITION_WARNINGS, NOT_COLLECTED
from footintel.config import Settings
from footintel.reports.daily import Report, _write

RATE_HINT = ("rate", "win", "draw", "btts", "over", "score_", "total_goals_", "clean", "nil",
             "failed", "kept", "recovered", "ht_", "scored_first", "extra_time", "penalty")


def _is_rate(metric: str) -> bool:
    return metric.startswith(RATE_HINT) or metric in ("home_win", "away_win", "win_to_nil",
                                                       "second_half_more_goals")


def _v(metric: str, v) -> str:
    if v is None or pd.isna(v):
        return "n/d"
    return f"{100 * v:.1f} %" if _is_rate(metric) else f"{v:.2f}"


def _d(metric: str, v) -> str:
    if v is None or pd.isna(v):
        return "n/d"
    return f"{100 * v:+.1f} pts" if _is_rate(metric) else f"{v:+.2f}"


def _run_for(conn, on: date | None) -> int | None:
    if on is None:
        return conn.execute(text("SELECT max(training_run_id) FROM trends")).scalar()
    return conn.execute(text(
        "SELECT max(t.training_run_id) FROM trends t JOIN training_runs r ON r.id = t.training_run_id "
        "WHERE r.started_at::date <= :d"), {"d": on}).scalar()


def _line(r) -> str:
    where = r.population if r.population_type == "team" else r.competition
    return (f"{where} — **{r.metric}** ({r.window}, n={r.n}, {r.period_start:%d/%m/%Y}→"
            f"{r.period_end:%d/%m/%Y}) : {_v(r.metric, r.observed)} contre {_v(r.metric, r.reference)}"
            f" ({_d(r.metric, r.abs_diff)}, IC de la valeur observée [{_v(r.metric, r.ci_low)} ;"
            f" {_v(r.metric, r.ci_high)}],"
            f" p ajusté {r.adjusted_p_value:.3f}, confiance {r.confidence})")


def trends_report(engine: Engine, settings: Settings, *, on: date | None = None,
                  competition: str | None = None, team: str | None = None,
                  category: str | None = None) -> Report:
    with engine.connect() as conn:
        run_id = _run_for(conn, on)
        if run_id is None:
            raise ValueError("No trend run. Run `footintel trends run` first.")
        prev_id = conn.execute(text("SELECT max(training_run_id) FROM trends WHERE training_run_id < :r"),
                               {"r": run_id}).scalar()
        rows = pd.read_sql(text("SELECT * FROM trends WHERE training_run_id = :r"), conn,
                           params={"r": run_id})
        prev = pd.read_sql(text("SELECT trend_key, \"window\", status, abs_diff FROM trends "
                                "WHERE training_run_id = :r"), conn, params={"r": prev_id}) \
            if prev_id else pd.DataFrame(columns=["trend_key", "window", "status", "abs_diff"])
        run = conn.execute(text("SELECT started_at, config FROM training_runs WHERE id = :r"),
                           {"r": run_id}).mappings().one()
        contrib = pd.read_sql(text(
            "SELECT model_name, segment, metric, value, n, ci_low, ci_high FROM model_metrics "
            "WHERE training_run_id = (SELECT max(id) FROM training_runs WHERE kind = 'trend_ablation')"), conn)
        if competition:
            comp_teams = set(conn.execute(text(
                "SELECT DISTINCT t.name FROM matches m JOIN competitions c ON c.id = m.competition_id "
                "JOIN seasons s ON s.id = m.season_id JOIN teams t ON t.id IN (m.home_team_id, m.away_team_id) "
                "WHERE c.code = :c AND s.start_year = (SELECT max(start_year) FROM seasons s2 "
                "WHERE s2.competition_id = c.id)"), {"c": competition}).scalars())
    if competition:
        rows = rows[(rows["competition"] == competition)
                    | rows["population"].str.split("|").str[0].isin(comp_teams)]
    if team:
        rows = rows[rows["population"].str.split("|").str[0].str.lower() == team.lower()]
    if category:
        rows = rows[rows["category"] == category]
    med = rows[rows["window"] == "medium"]
    p = prev[prev["window"] == "medium"].set_index("trend_key")
    med = med.assign(prev_status=med["trend_key"].map(p["status"]) if len(p) else None,
                     prev_diff=pd.to_numeric(med["trend_key"].map(p["abs_diff"]), errors="coerce")
                     if len(p) else float("nan"))
    med["abs_diff"] = pd.to_numeric(med["abs_diff"], errors="coerce")
    filt = " · ".join(x for x in [competition and f"compétition {competition}",
                                  team and f"équipe {team}", category and f"catégorie {category}"] if x)
    lines = [f"# Tendances statistiques — calcul n° {run_id} du {run['started_at']:%d/%m/%Y}",
             "", f"Filtre : {filt or 'aucun'}. {len(med)} tendances suivies (fenêtre moyenne), "
             f"{len(rows)} lignes au total. Calcul précédent : {prev_id or 'aucun'}.", "",
             "Fenêtres : compétition 60 / 380 matchs, référence = 1 900 matchs précédents ; équipe "
             "6 / 19 matchs, référence = 76 précédents. Valeurs lissées vers la référence ; tests "
             "corrigés par Benjamini-Hochberg sur tout le calcul.", ""]

    short = rows[rows["window"] == "short"].set_index("trend_key")

    def section(title, df, label=None, use_short=False):
        lines.extend([f"## {title}", ""])
        if df.empty:
            lines.append("- Aucune.")
        if use_short:  # an emerging trend is triggered by its short window: show that one
            df = short.loc[short.index.intersection(df["trend_key"])].reset_index()
        for r in df.sort_values("adjusted_p_value").head(25).itertuples():
            tag = label or ("[Fait]" if r.confidence == "high" else "[Hypothèse]")
            lines.append(f"- {tag} {_line(r)}")
        lines.append("")

    new = med[(med["status"] == "emerging") & (med["prev_status"] != "emerging")]
    rising = med[med["status"].isin(["rising", "falling"])]
    stronger = rising[rising["prev_diff"].notna() & (rising["abs_diff"].abs() > rising["prev_diff"].abs())]
    weaker = med[(med["status"] == "disappeared") | (
        med["prev_diff"].notna() & med["status"].isin(["rising", "falling"])
        & (med["abs_diff"].abs() < med["prev_diff"].abs()))]
    moving = ["rising", "falling", "disappeared"]
    section("Tendances nouvellement détectées (émergentes, fenêtre courte)", new, "[Hypothèse]",
            use_short=True)
    section("Tendances confirmées en hausse ou en baisse (confiance haute)",
            rising[rising["confidence"] == "high"])
    section("Tendances qui se renforcent (écart plus grand qu'au calcul précédent)", stronger)
    section("Tendances qui s'affaiblissent ou disparaissent", weaker)
    section("Tendances non confirmées (émergentes au calcul précédent, revenues à la normale)",
            med[med["status"] == "unconfirmed"], "[Fait]")
    section("Changements de comportement des équipes (fenêtre de 19 matchs)",
            med[(med["population_type"] == "team") & med["status"].isin(moving)])
    section("Évolutions statistiques des scores",
            med[(med["category"] == "score") & med["status"].isin(moving)])
    lines += ["## Changements tactiques documentés", "",
              "- [Fait] Aucun : aucune donnée tactique (possession, pressing, formations, "
              "compositions) n'est collectée par une source autorisée. Aucun constat tactique "
              "n'est produit à partir des scores ou des formations affichées.", ""]

    pers = (run["config"] or {}).get("persistence", {})
    lines += ["## Persistance hors échantillon", "",
              "[Interprétation] À chaque 1er janvier et 1er août depuis 2010 : écart de la fenêtre "
              "moyenne à la référence, puis écart observé dans la fenêtre suivante. Pente 0 = pur "
              "bruit, 1 = écart entièrement durable.", "",
              "| Indicateur | Paires | Pente | IC 95 % | Écarts significatifs | Signe conservé |",
              "|---|---|---|---|---|---|"]
    for key, v in sorted(pers.items()):
        if "persistence_slope" not in v:
            continue
        if category and not key.startswith(("team|" if category == "team" else "competition|")):
            continue
        lines.append(f"| {key} | {v['pairs']} | {v['persistence_slope']:+.2f} | "
                     f"[{v['slope_ci'][0]:+.2f} ; {v['slope_ci'][1]:+.2f}] | {v['significant_then']} | "
                     f"{(v['kept_sign_share'] or 0) * 100:.0f} % |")
    lines.append("")
    lines += ["## Effets réellement utiles aux prédictions", ""]
    if contrib.empty:
        lines.append("- Pas encore évalué : lancer `footintel trends evaluate`.")
    else:
        useful = contrib[contrib["ci_high"] < 0]
        lines.append("[Fait] Écart de score (négatif = meilleur) par rapport au modèle actif, "
                     "2021-22 à 2025-26, IC 95 % bootstrap. Seules les lignes dont l'IC est "
                     "entièrement sous 0 sont listées.")
        lines.append("")
        lines += ["| Catégorie ajoutée | Périmètre | Marché | n | Écart | IC 95 % |", "|---|---|---|---|---|---|"]
        for r in useful.sort_values("value").itertuples():
            lines.append(f"| {r.model_name} | {r.segment.removeprefix('trend_ablation:')} | {r.metric} | "
                         f"{r.n} | {r.value:+.4f} | [{r.ci_low:+.4f} ; {r.ci_high:+.4f}] |")
        if useful.empty:
            lines.append("| — | — | aucune catégorie n'apporte de gain démontré | | | |")
    lines += ["", "## Données manquantes et limites", ""]
    lines += [f"- [Fait] Non collecté : {k} ({v})." for k, v in NOT_COLLECTED.items()]
    lines += [f"- [Fait] Définition : {k} — {v}" for k, v in DEFINITION_WARNINGS.items()]
    low = rows[rows["coverage"].notna() & (rows["coverage"] < 0.5) & (rows["window"] == "medium")]
    if len(low):
        lines.append(f"- [Fait] {len(low)} tendances reposent sur moins de 50 % de matchs avec la "
                     "donnée (statistiques absentes de certaines sources ou saisons).")
    lines += ["- [Fait] Coupes nationales et saison européenne en cours : aucune source autorisée.",
              "- [Interprétation] Une tendance significative n'est pas un avantage de pronostic ; "
              "seule la section « Effets réellement utiles » le mesure.", ""]
    md = "\n".join(lines)
    stem = "trends_" + "_".join(x for x in [str(run_id), competition, team and team.replace(" ", "-"),
                                             category] if x)
    return _write(settings, stem, md, "Tendances statistiques",
                  rows.drop(columns=["out_of_sample", "predictive_contribution", "sources"], errors="ignore"))
