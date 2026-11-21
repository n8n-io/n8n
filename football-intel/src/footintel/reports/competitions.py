"""Competition trend report, built from the stored analysis run (never recomputed here)."""

import pandas as pd
from sqlalchemy import Engine, text

from footintel.analysis.competitions import UNAVAILABLE
from footintel.catalog import COMPETITION_BY_CODE
from footintel.config import Settings
from footintel.reports.daily import Report, _write

TARGETS = ["ENG-PL", "ENG-FAC", "ENG-EFL", "ESP-LL", "ESP-CDR", "ITA-SA", "ITA-CI", "GER-BL",
           "GER-DFB", "UEFA-CL", "UEFA-EL", "UEFA-ECL"]
KEY_METRICS = ["home_win", "draw", "away_win", "goals", "over_2_5", "btts", "nil_nil",
               "favourite_won", "home_goal_advantage", "first_half_goal_share"]
RATE_METRICS = {"home_win", "draw", "away_win", "over_1_5", "over_2_5", "over_3_5", "btts",
                "nil_nil", "home_clean_sheet", "away_clean_sheet", "favourite_won"}
STATUS_FR = {"validated_out_of_sample": "validé hors échantillon", "robust": "robuste (à valider)",
             "robust_not_confirmed": "non confirmé hors échantillon", "hypothesis": "hypothèse"}


def _fmt(metric: str, v) -> str:
    if v is None or pd.isna(v):
        return "—"
    return f"{100 * v:.1f} %" if metric in RATE_METRICS else f"{v:.2f}"


def _fmt_diff(metric: str, v) -> str:
    if v is None or pd.isna(v):
        return "—"
    return f"{100 * v:+.1f} pts" if metric in RATE_METRICS else f"{v:+.3f}"


def competition_report(engine: Engine, settings: Settings, run_id: int | None = None,
                       ablation: pd.DataFrame | None = None) -> Report:
    with engine.connect() as conn:
        run_id = run_id or conn.execute(text(
            "SELECT max(id) FROM training_runs WHERE kind='analysis' AND status='success'")).scalar()
        if run_id is None:
            raise ValueError("No analysis run. Run `footintel analyze competitions` first.")
        prof = pd.read_sql(text("""
            SELECT c.code AS competition, p.season, p.segment, p.metric, p.value, p.n,
                   p.ci_low, p.ci_high, p.expected, p.data_until
            FROM competition_profile_metrics p JOIN competitions c ON c.id = p.competition_id
            WHERE p.training_run_id = :r"""), conn, params={"r": run_id})
        pats = pd.read_sql(text("SELECT * FROM detected_patterns"), conn)
    pats["competition"] = pats["segment"].apply(lambda s: s.get("competition"))
    pats["metric"] = pats["segment"].apply(lambda s: s.get("metric"))
    data_until = prof["data_until"].max()
    lines = [f"# Tendances par compétition — analyse n° {run_id}", "",
             f"Données jusqu'au {data_until:%d/%m/%Y}. Référence des écarts : modèle Elo-Poisson "
             "entraîné saison par saison, qui connaît la force des équipes mais pas la compétition. "
             "Un écart est donc une particularité de la compétition, pas un effet des équipes "
             "engagées.", "",
             "Statuts : *hypothèse* (non significatif après correction des tests multiples), "
             "*robuste* (significatif, p ajusté < 0,05), *validé hors échantillon* (robuste sur "
             "2006-2020 et confirmé avec le même signe sur 2021-2026).", "",
             f"Non disponible dans les sources autorisées : {', '.join(UNAVAILABLE)}.", ""]
    csv_rows = []
    for comp in TARGETS:
        cp = prof[prof["competition"] == comp]
        name = COMPETITION_BY_CODE[comp].name
        lines.append(f"## {name}")
        if cp.empty:
            lines += ["", "Aucune donnée : aucune source autorisée testée ne couvre cette "
                      "compétition (clé API-Football requise).", ""]
            continue
        allseg = cp[(cp["segment"] == "all")]
        seasons = sorted(int(s) for s in allseg["season"].dropna().unique())
        n_all = int(allseg[(allseg["season"].isna()) & (allseg["metric"] == "home_win")]["n"].iloc[0])
        lines += ["", f"{n_all} matchs, saisons {seasons[0]}-{seasons[0] + 1} à "
                  f"{seasons[-1]}-{seasons[-1] + 1}.", ""]
        recent = seasons[-6:]
        header = "| Indicateur | Toutes saisons | " + " | ".join(f"{s}-{(s + 1) % 100:02d}" for s in recent) + " |"
        lines += [header, "|" + "---|" * (2 + len(recent))]
        for metric in KEY_METRICS:
            row = allseg[allseg["metric"] == metric]
            if row.empty:
                continue
            tot = row[row["season"].isna()]
            cells = []
            for s in recent:
                r = row[row["season"] == s]
                cells.append(_fmt(metric, r["value"].iloc[0]) + f" (n={int(r['n'].iloc[0])})"
                             if not r.empty else "—")
            t = tot.iloc[0] if not tot.empty else None
            total_txt = (f"{_fmt(metric, t.value)} [{_fmt(metric, t.ci_low)} ; {_fmt(metric, t.ci_high)}]"
                         if t is not None else "—")
            lines.append(f"| {metric} | {total_txt} | " + " | ".join(cells) + " |")
        scores = cp[cp["metric"].str.startswith("score:")].sort_values("value", ascending=False).head(6)
        if not scores.empty:
            lines += ["", "Scores les plus fréquents : " + ", ".join(
                f"{m.removeprefix('score:')} ({100 * v:.1f} %)" for m, v in zip(scores.metric, scores.value, strict=True))]
        cpats = pats[pats["competition"] == comp]
        for title, keys in (("Particularités de la compétition (écart à la référence)", "residual|"),
                            ("Évolution récente (dernière saison complète contre les 5 précédentes)", "change|"),
                            ("Tendance sur toutes les saisons (par saison)", "trend|")):
            sel = cpats[cpats["key"].str.startswith(keys) & (cpats["status"] != "hypothesis")]
            if keys == "residual|":
                sel = sel[sel["key"].str.contains(r"\|all\||\|stage:|\|leg:|\|phase:", regex=True)]
            sel = sel.sort_values("adjusted_p_value").head(8)
            lines += ["", f"### {title}", ""]
            if sel.empty:
                lines.append("- Rien de significatif après correction des tests multiples.")
            for p in sel.itertuples():
                seg = p.segment.get("segment", "all")
                oos = (f" ; hors échantillon {_fmt_diff(p.metric, p.out_of_sample_effect)} "
                       f"(n={int(p.out_of_sample_n)})" if p.out_of_sample_effect is not None
                       and not pd.isna(p.out_of_sample_effect) else "")
                lines.append(f"- **{p.metric}** [{seg}] : {_fmt_diff(p.metric, p.effect)} "
                             f"[{_fmt_diff(p.metric, p.ci_low)} ; {_fmt_diff(p.metric, p.ci_high)}], "
                             f"n={p.n}{oos} — *{STATUS_FR.get(p.status, p.status)}*")
                csv_rows.append({"competition": comp, "key": p.key, "status": p.status,
                                 "effect": p.effect, "ci_low": p.ci_low, "ci_high": p.ci_high,
                                 "n": p.n, "adjusted_p": p.adjusted_p_value,
                                 "oos_effect": p.out_of_sample_effect, "oos_n": p.out_of_sample_n})
        lines.append("")
    if ablation is not None and not ablation.empty:
        lines += ["## Apport prédictif démontré de chaque niveau d'analyse", "",
                  "Chaque niveau est comparé au précédent sur les mêmes matchs futurs "
                  "(2021-22 à 2025-26), IC 95 % bootstrap. Négatif = meilleur.", "",
                  "| Famille | Périmètre | Étape | Métrique | n | Écart | IC 95 % | Verdict |",
                  "|---|---|---|---|---|---|---|---|"]
        for r in ablation.itertuples():
            lines.append(f"| {r.family} | {r.scope} | {r.step} | {r.metric} | {r.n} | "
                         f"{r.mean_diff:+.4f} | [{r.ci_low:+.4f} ; {r.ci_high:+.4f}] | {r.verdict} |")
        lines.append("")
    lines += ["> Une tendance observée n'est pas un avantage acquis. Seuls les gains mesurés sur "
              "des matchs futurs, dans la section précédente, justifient un changement de modèle.", ""]
    md = "\n".join(lines)
    return _write(settings, f"competitions_run{run_id}", md, "Tendances par compétition",
                  pd.DataFrame(csv_rows))
