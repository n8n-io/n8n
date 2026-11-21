"""Report of a stories run: recurring scenarios, match stories, new team trends, road ahead.

Labels:
[Fait]           a measured value from stored rows;
[Interprétation] a reading of measured values;
[Hypothèse]      a signal that has not passed the confirmation rules.
"""

from collections import Counter
from datetime import date

import pandas as pd
from sqlalchemy import Engine, text

from footintel.analysis.stories import FLOW_GENERIC_FR, SCENARIO_BY_CODE, STATUS_FR
from footintel.config import Settings
from footintel.reports.daily import Report, _write

SURPRISE_FR = {"big_surprise": "grosse surprise (< 15 %)", "surprise": "surprise (15-30 %)",
               "open": "issue ouverte (30-50 %)", "expected": "attendu (≥ 50 %)", "unknown": "sans probabilité"}


def _pts(v) -> str:
    return "n/d" if v is None or pd.isna(v) else f"{v:+.3f}"


def stories_report(engine: Engine, settings: Settings, result: dict, today: date | None = None) -> Report:
    today = today or date.today()
    t: pd.DataFrame = result["scenarios"]
    stories: list[dict] = result["stories"]
    ahead: pd.DataFrame = result["ahead"]
    md = [f"# Histoires, scénarios et route à venir — {today:%d/%m/%Y}", "",
          f"Analyse n° {result['run_id']}. {len(stories)} matchs racontés (7 derniers jours). "
          "Les données de composition, blessures et xG ne sont pas collectées : elles ne sont "
          "ni utilisées ni devinées.", ""]

    # 1. Scenarios
    md += ["## Scénarios récurrents : le marché se trompe-t-il ?", "",
           "[Fait] Points pris en plus ou en moins par les équipes dans chaque situation, comparées "
           "aux équipes de même cote (même probabilité de victoire selon le marché, cotes sans marge). "
           "Positif : le marché sous-estime ces équipes. La comparaison à cote égale retire le biais "
           "favori-outsider des cotes. Toutes saisons avec cotes depuis 2005, 4 grands championnats et "
           "championnats de contexte.", "",
           "| Scénario | Statut | n | Écart (pts/match) | IC 95 % | Avant 2016 | Depuis 2016 | 365 derniers jours | 60 derniers jours |",
           "|---|---|---|---|---|---|---|---|---|"]
    w = t.set_index(["scenario", "window"])
    order = {"confirmed": 0, "reversing": 1, "emerging": 2, "no_effect": 3, "insufficient_data": 4}
    alls = t[t["window"] == "all"].sort_values(by="status", key=lambda s: s.map(order))
    for r in alls.itertuples():
        def cell(win):
            x = w.loc[(r.scenario, win)] if (r.scenario, win) in w.index else None
            return "n/d" if x is None or x["n"] == 0 else f"{_pts(x['observed'])} (n={int(x['n'])})"
        md.append(f"| {SCENARIO_BY_CODE[r.scenario].label} | {STATUS_FR[r.status]} | {int(r.n)} | "
                  f"{_pts(r.observed)} | [{_pts(r.ci_low)} ; {_pts(r.ci_high)}] | {cell('before_2016')} | "
                  f"{cell('from_2016')} | {cell('last_365d')} | {cell('last_60d')} |")
    conf = alls[alls["status"] == "confirmed"]
    emer = alls[alls["status"].isin(["emerging", "reversing"])]
    md += ["", "[Interprétation] " + (
        "Scénarios confirmés (significatifs après correction des tests multiples, même sens sur "
        "les deux moitiés de l'historique et sur la dernière année) : "
        + ", ".join(f"{SCENARIO_BY_CODE[c].label} ({_pts(o)} pt/match)" for c, o in zip(conf.scenario, conf.observed))
        + "." if len(conf) else "Aucun scénario ne bat durablement le marché : il intègre déjà ces situations.")]
    if len(emer):
        md.append("[Hypothèse] Nouveaux ou changeants, à surveiller sans parier dessus : "
                  + ", ".join(f"{SCENARIO_BY_CODE[c].label} ({STATUS_FR[s]})" for c, s in zip(emer.scenario, emer.status)) + ".")
    md.append("")

    # 2. What repeated this week
    flows = Counter(code for s in stories for code in s["flow"])
    surprises = Counter(s["surprise"] for s in stories)
    md += ["## Ce qui s'est répété sur la période", "",
           "[Fait] " + ", ".join(f"{SURPRISE_FR[k]} : {v}" for k, v in surprises.most_common()) + ".", ""]
    if flows:
        md += ["| Déroulé | Matchs |", "|---|---|"]
        for code, n in flows.most_common():
            md.append(f"| {FLOW_GENERIC_FR[code]} | {n} |")
        md.append("")
    # Scenarios that matter, as they played out this period.
    watch = alls[alls["status"].isin(["confirmed", "emerging", "reversing"])]["scenario"].tolist()
    lines = []
    for code in watch:
        pts, exp = [], []
        for s in stories:
            probs = s["factors"]["match"]["probabilities"]
            if probs is None or s["factors"]["match"]["probability_source"] != "marché":
                continue
            for side, k in (("home", 0), ("away", 2)):
                if code in s["scenarios"].get(side, []):
                    gf, ga = ((s["home_goals"], s["away_goals"]) if side == "home"
                              else (s["away_goals"], s["home_goals"]))
                    pts.append(3 if gf > ga else 1 if gf == ga else 0)
                    exp.append(3 * probs[k] + probs[1])
        if pts:
            diff = (sum(pts) - sum(exp)) / len(pts)
            hist = alls.set_index("scenario").loc[code, "observed"]
            same = "dans le sens de l'historique" if diff * hist > 0 else "à l'inverse de l'historique"
            lines.append(f"| {SCENARIO_BY_CODE[code].label} | {len(pts)} | {sum(pts)} | {sum(exp):.1f} | "
                         f"{diff:+.2f} | {same} |")
    if lines:
        md += ["[Fait] Scénarios qui comptent, cette période (matchs avec cotes ; trop peu de matchs "
               "pour conclure quoi que ce soit sur une semaine) :", "",
               "| Scénario | Cas | Points pris | Points attendus (marché) | Écart/match | Sens |",
               "|---|---|---|---|---|---|", *lines, ""]

    # 3. Stories
    md += ["## Histoires des matchs", "",
           "Classées de la plus grosse surprise à la plus attendue. Probabilités d'avant-match.", ""]
    rank = {"big_surprise": 0, "surprise": 1, "open": 2, "expected": 3, "unknown": 4}
    for s in sorted(stories, key=lambda s: (rank[s["surprise"]], str(s["date"]))):
        m = s["factors"]["match"]
        md += [f"### {s['home']} {m['score']} {s['away']} — {s['competition']}, {s['date']:%d/%m}"
               + (f" (mi-temps {m['half_time']})" if m["half_time"] else ""),
               f"*{SURPRISE_FR[s['surprise']]}*", ""]
        md += [f"- {line}" for line in s["narrative"].splitlines()]
        md.append("")

    # 4. New team trends from the latest trend run
    with engine.connect() as conn:
        tr = pd.read_sql(text("""
            SELECT population, competition, metric, "window", observed, reference, status, confidence, n
            FROM trends WHERE training_run_id = (SELECT max(id) FROM training_runs WHERE kind = 'trends')
              AND population_type = 'team' AND status IN ('emerging', 'rising', 'falling')
              AND confidence IN ('high', 'medium') AND "window" = 'short'
            ORDER BY confidence, status, population LIMIT 60"""), conn)
    md += ["## Nouvelles tendances d'équipes (6 derniers matchs)", "",
           "[Hypothèse] Signaux du moteur de tendances, confiance moyenne ou haute. Sur 6 matchs, "
           "la persistance mesurée des tendances d'équipe est faible (0,14 pour les scores) : à "
           "surveiller, pas à parier.", ""]
    if tr.empty:
        md.append("Aucune.")
    else:
        md += ["| Équipe | Indicateur | Statut | Observé | Référence | n |", "|---|---|---|---|---|---|"]
        for r in tr.itertuples():
            md.append(f"| {r.population} | {r.metric} | {r.status} | {r.observed:.2f} | "
                      f"{'n/d' if pd.isna(r.reference) else f'{r.reference:.2f}'} | {r.n} |")
    md.append("")

    # 5. Road ahead
    md += ["## Route à venir : les 5 prochains matchs", "",
           "[Fait] Calendrier enregistré (championnats complets, coupes d'Europe, DFB-Pokal). "
           "Alertes : match européen 4 jours avant au plus, repos ≤ 3 jours, coupe ou Europe "
           "dans les 4 jours suivants (risque de rotation), 4e match ou plus sur 14 jours.",
           "",
           "Limites : la FA Cup, la Coupe de la Ligue anglaise, la Coppa Italia et la Copa del Rey ne "
           "sont pas collectées, donc un repos peut être surestimé pour ces clubs. Les dates de championnat "
           "au-delà de deux semaines sont provisoires (choix des diffuseurs). La forme d'un adversaire "
           "d'un championnat non importé (ex. Tchéquie) ne compte que ses matchs de coupe d'Europe.", ""]
    if ahead.empty:
        md.append("Aucun match programmé.")
    else:
        a = ahead.copy()
        a["alerts"] = a.apply(lambda r: ", ".join(x for x, c in (
            ("Europe juste avant", r.europe_before),
            (f"repos {r.rest_days} j", r.rest_days is not None and not pd.isna(r.rest_days) and r.rest_days <= 3),
            ("coupe/Europe juste après", r.cup_or_europe_next),
            (f"{r.matches_prev_14d + 1}e match en 14 j", r.matches_prev_14d >= 3)) if c), axis=1)
        for league in sorted(a["league"].unique()):
            md += [f"### {league}", "", "| Équipe | Forme (pts/match, 5) | Prochains matchs |", "|---|---|---|"]
            for team, g in a[a["league"] == league].groupby("team"):
                g = g.sort_values("order")
                form = g["form5_ppg"].iloc[0]
                cells = "<br>".join(
                    f"{r.date:%d/%m} {r.competition} {r.venue} {r.opponent}"
                    + ("" if pd.isna(r.opp_form5_ppg) else f" (forme adv. {r.opp_form5_ppg:.1f})")
                    + (f" — **{r.alerts}**" if r.alerts else "") for r in g.itertuples())
                md.append(f"| {team} | {'n/d' if pd.isna(form) else f'{form:.1f}'} | {cells} |")
            md.append("")
    csv = ahead if not ahead.empty else pd.DataFrame()
    return _write(settings, f"stories_{today:%Y%m%d}", "\n".join(md), "Histoires et scénarios", csv)
