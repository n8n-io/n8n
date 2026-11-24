"""Where the deployed model was wrong: the weekly look at its live 1X2 errors.

Built from prediction_evaluations (each prediction made before kick-off, scored after the
final whistle) and, when odds were known, the market's evaluation of the same match. The
leads it writes are hypotheses to test with the promotion rules (D9), not changes: a few
weeks of matches are too few to adapt the model on their own.
"""

from datetime import date

import pandas as pd
from sqlalchemy import Engine, text

MIN_SEGMENT = 20  # matches in a segment before a lead is written
DRAW_GAP = 0.05   # observed minus announced draw rate
FAV_GAP = 0.08    # announced minus observed win rate of big favourites
MARKET_GAP = 0.03  # log loss behind the market in one competition

_SQL = text("""
SELECT e.match_id, e.model_name, e.log_loss, e.correct, p.p_home, p.p_draw, p.p_away,
       o.result, o.home_goals, o.away_goals, c.code AS competition, c.name AS competition_name,
       th.name AS home, ta.name AS away, m.kickoff_date, mk.log_loss AS market_log_loss
FROM prediction_evaluations e
JOIN predictions p ON p.id = e.predictor_ref
JOIN matches m ON m.id = e.match_id JOIN match_outcomes o ON o.match_id = m.id
JOIN competitions c ON c.id = m.competition_id
JOIN teams th ON th.id = m.home_team_id JOIN teams ta ON ta.id = m.away_team_id
LEFT JOIN prediction_evaluations mk ON mk.predictor_kind = 'market' AND mk.predictor_ref = e.predictor_ref
     AND mk.market = '1X2'
WHERE e.predictor_kind = 'model' AND e.market = '1X2' AND m.kickoff_date BETWEEN :s AND :e
""")


def _segment(d: pd.DataFrame) -> dict:
    mk = d.market_log_loss.dropna()
    return {"n": int(len(d)), "log_loss": float(d.log_loss.mean()), "accuracy": float(d.correct.mean()),
            "market_log_loss": float(mk.mean()) if len(mk) else None, "n_market": int(len(mk)),
            "model_on_same": float(d.loc[d.market_log_loss.notna(), "log_loss"].mean()) if len(mk) else None}


def model_errors(engine: Engine, start: date, end: date) -> dict | None:
    with engine.connect() as conn:
        df = pd.read_sql(_SQL, conn, params={"s": start, "e": end})
    return analyse(df, start, end)


def analyse(df: pd.DataFrame, start: date, end: date) -> dict | None:
    """df: one row per match with log_loss, correct, p_home/p_draw/p_away, result (H/D/A),
    goals, competition codes and names, team names, kickoff_date, market_log_loss (or NaN)."""
    if df.empty:
        return None
    df = df.copy()
    df["fav_p"] = df[["p_home", "p_away"]].max(axis=1)
    df["fav_side"] = df.apply(lambda r: "H" if r.p_home >= r.p_away else "A", axis=1)
    df["fav_won"] = df.result == df.fav_side
    df["band"] = pd.cut(df.fav_p, [0, 0.45, 0.6, 1.0], labels=["serré (favori < 45 %)", "favori 45-60 %",
                                                                "gros favori (> 60 %)"])
    out: dict = {"start": start, "end": end, "overall": _segment(df)}
    out["by_competition"] = [{"competition": k, **_segment(g)}
                             for k, g in df.groupby("competition_name") if len(g)]
    out["by_band"] = [{"band": str(k), **_segment(g), "announced_fav": float(g.fav_p.mean()),
                       "observed_fav": float(g.fav_won.mean())}
                      for k, g in df.groupby("band", observed=True)]
    out["draws"] = {"announced": float(df.p_draw.mean()), "observed": float((df.result == "D").mean()),
                    "n": int(len(df))}
    worst = df.sort_values("log_loss", ascending=False).head(8)
    out["worst"] = [{"date": r.kickoff_date, "competition": r.competition, "match": f"{r.home} – {r.away}",
                     "score": f"{r.home_goals}-{r.away_goals}",
                     "probs": [round(r.p_home, 3), round(r.p_draw, 3), round(r.p_away, 3)],
                     "p_actual": round(float({"H": r.p_home, "D": r.p_draw, "A": r.p_away}[r.result]), 3)}
                    for r in worst.itertuples()]
    out["leads"] = _leads(out)
    return out


def _leads(e: dict) -> list[str]:
    """Plain leads to test, written only above fixed gaps and sample sizes."""
    leads = []
    d = e["draws"]
    if d["n"] >= MIN_SEGMENT and d["observed"] - d["announced"] > DRAW_GAP:
        leads.append(f"Les nuls sont sous-estimés : {100 * d['announced']:.0f} % annoncés, "
                     f"{100 * d['observed']:.0f} % observés sur {d['n']} matchs. Piste : tester un candidat "
                     "qui relève la probabilité du nul (température ou terme de nul).")
    for b in e["by_band"]:
        if b["n"] >= MIN_SEGMENT and b["announced_fav"] - b["observed_fav"] > FAV_GAP:
            leads.append(f"{b['band'].capitalize()} : le favori gagne {100 * b['observed_fav']:.0f} % des matchs "
                         f"pour {100 * b['announced_fav']:.0f} % annoncés ({b['n']} matchs). Piste : surconfiance, "
                         "à vérifier par la calibration sur la saison.")
    for c in e["by_competition"]:
        if c["n_market"] >= MIN_SEGMENT and c["model_on_same"] - c["market_log_loss"] > MARKET_GAP:
            leads.append(f"{c['competition']} : le modèle fait moins bien que le marché "
                         f"({c['model_on_same']:.3f} contre {c['market_log_loss']:.3f}, {c['n_market']} matchs). "
                         "Piste : variables propres à cette compétition.")
    if not leads:
        leads.append(f"Aucun écart au-dessus des seuils fixés ({MIN_SEGMENT} matchs au moins par groupe) : "
                     "rien ne justifie de changer le modèle cette semaine.")
    return leads


def _pair(seg: dict) -> str:
    """Model and market log loss on the same matches: the only fair comparison."""
    if seg["market_log_loss"] is None:
        return "—"
    return f"{seg['model_on_same']:.3f} / {seg['market_log_loss']:.3f} ({seg['n_market']})"


def errors_markdown(e: dict | None, title: str = "Où le modèle s'est trompé (4 dernières semaines)") -> list[str]:
    L = [f"## {title}", ""]
    if not e:
        return L + ["Aucun match évalué sur la période : la section se remplit après les premiers résultats.", ""]
    o = e["overall"]
    mk = f", marché {o['market_log_loss']:.3f} sur {o['n_market']} matchs (modèle {o['model_on_same']:.3f} sur les mêmes)" \
        if o["market_log_loss"] is not None else ""
    L += [f"{o['n']} matchs évalués : log loss {o['log_loss']:.3f}{mk}, bon favori dans {100 * o['accuracy']:.0f} % des cas.", ""]
    L += ["| Groupe | Matchs | Log loss | Modèle / marché (matchs avec cotes) | Favori annoncé | Favori gagnant |",
          "|---|---|---|---|---|---|"]
    for b in e["by_band"]:
        L.append(f"| {b['band']} | {b['n']} | {b['log_loss']:.3f} | {_pair(b)} | "
                 f"{100 * b['announced_fav']:.0f} % | {100 * b['observed_fav']:.0f} % |")
    L += ["", "| Compétition | Matchs | Log loss | Modèle / marché (matchs avec cotes) | Bon favori |", "|---|---|---|---|---|"]
    for c in sorted(e["by_competition"], key=lambda c: -c["n"]):
        L.append(f"| {c['competition']} | {c['n']} | {c['log_loss']:.3f} | {_pair(c)} | "
                 f"{100 * c['accuracy']:.0f} % |")
    d = e["draws"]
    L += ["", f"Nuls : {100 * d['announced']:.0f} % annoncés en moyenne, {100 * d['observed']:.0f} % observés.", "",
          "Plus grosses surprises (probabilité donnée au résultat réel) :", ""]
    L += [f"- {w['date']:%d/%m} {w['match']} ({w['competition']}) {w['score']} : 1 {100 * w['probs'][0]:.0f} %, "
          f"X {100 * w['probs'][1]:.0f} %, 2 {100 * w['probs'][2]:.0f} % → résultat annoncé à {100 * w['p_actual']:.0f} %"
          for w in e["worst"]]
    L += ["", "### Pistes à tester", ""] + [f"- {x}" for x in e["leads"]]
    L += ["", "> Une piste devient un candidat, testé hors échantillon. Il ne remplace le modèle que s'il "
          "respecte les critères de promotion (D9) : c'est ainsi que le système apprend de ses erreurs sans "
          "suivre le hasard d'une semaine.", ""]
    return L
