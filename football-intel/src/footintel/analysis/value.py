"""Model probabilities per betting market, for the odds checker.

The checker compares a bookmaker's odds with the model: fair odds = 1 / p and
theoretical value = p x odds - 1. A positive value only means something if p is
well calibrated, so every market carries a reliability note from the backtests.
"""

import numpy as np
from scipy.optimize import least_squares
from scipy.stats import poisson

GOALS = np.arange(16)

# From docs/RESULTS.md: what the backtests and live checks say about each market.
RELIABILITY = {
    "1x2": "Au niveau du marché en backtest (log loss 0,9655 contre 0,9678), sans avantage démontré.",
    "goals": "Plus/moins : légèrement meilleur que le marché en backtest, avantage non démontré.",
    "btts": "Point faible : à peine mieux qu'un taux fixe en backtest, moins bon ce week-end.",
    "1up": "Approximation : buts supposés arriver dans un ordre aléatoire.",
    "first": "Même approximation (ordre aléatoire des buts) ; le premier but est vérifié sur 2026-27 "
             "(docs/RESULTS.md).",
    "no_odds": "Match sans cotes de référence : prédiction moins fiable (données insuffisantes).",
    "market": "Marché : moyenne des bookmakers (The Odds API), marge de chacun retirée. Le 1UP, le 2UP et "
              "le premier but du marché sont calculés à partir de cette moyenne 1X2 et du total de buts du "
              "marché (sinon celui du modèle) : c'est la référence pour juger une cote betPawa.",
}


def _fit_lambdas(p_home: float, p_away: float, start: tuple[float, float],
                 p_over_2_5: float | None = None) -> tuple[float, float]:
    """Goal rates whose independent-Poisson markets match the model: its 1X2, and its
    over 2.5 when given (least squares, so the three are matched as closely as possible)."""
    def res(x):
        lh, la = np.exp(x)
        m = np.outer(poisson.pmf(GOALS, lh), poisson.pmf(GOALS, la))
        r = [np.tril(m, -1).sum() - p_home, np.triu(m, 1).sum() - p_away]
        if p_over_2_5 is not None:
            total = GOALS[:, None] + GOALS[None, :]
            r.append(m[total > 2.5].sum() - p_over_2_5)
        return r
    lh, la = np.exp(least_squares(res, np.log(np.clip(start, 0.2, 5.0))).x)
    return float(lh), float(la)


def path_markets(lh: float, la: float) -> dict[str, float]:
    """Markets that depend on the order of the goals, with goals in random order.

    Independent Poisson goal rates: the number of goals is Poisson(lh + la) and each goal is
    the home team's with probability lh / (lh + la). A state is (score difference, home led by
    1, home led by 2, away led by 1, away led by 2, first scorer).
    """
    q = lh / (lh + la)
    pn = poisson.pmf(GOALS, lh + la)
    dp = {(0, False, False, False, False, ""): 1.0}
    out = dict.fromkeys(("first_home", "first_away", "none", "up1_home", "up1_away", "up2_home",
                         "up2_away", "lead2_home", "lead2_away", "first_home_win", "first_home_draw",
                         "first_away_win", "first_away_draw"), 0.0)
    for n in range(len(GOALS)):
        for (s, h1, h2, a1, a2, first), p in dp.items():
            w = pn[n] * p
            if not first:
                out["none"] += w
                continue
            out[f"first_{first}"] += w
            out["up1_home"] += w * (h1 or s > 0)
            out["up1_away"] += w * (a1 or s < 0)
            out["up2_home"] += w * (h2 or s > 0)
            out["up2_away"] += w * (a2 or s < 0)
            out["lead2_home"] += w * h2
            out["lead2_away"] += w * a2
            sign = 1 if first == "home" else -1
            out[f"first_{first}_win"] += w * (sign * s > 0)
            out[f"first_{first}_draw"] += w * (s == 0)
        new: dict = {}
        for (s, h1, h2, a1, a2, first), p in dp.items():
            for step, pr in ((1, q), (-1, 1 - q)):
                t = s + step
                key = (t, h1 or t >= 1, h2 or t >= 2, a1 or t <= -1, a2 or t <= -2,
                       first or ("home" if step == 1 else "away"))
                new[key] = new.get(key, 0.0) + p * pr
        dp = new
    return {k: float(v) for k, v in out.items()}


def ever_leads(lh: float, la: float) -> tuple[float, float]:
    """P(home leads at some point), P(away leads at some point), goals in random order."""
    pm = path_markets(lh, la)
    return pm["up1_home"], pm["up1_away"]


def market_probabilities(pred: dict) -> list[dict]:
    """One row per selection: key, label, probability, reliability note key."""
    ph, pd_, pa = pred["p_home"], pred["p_draw"], pred["p_away"]
    rows = [("1", "1 (victoire domicile)", ph, "1x2"), ("X", "X (nul)", pd_, "1x2"),
            ("2", "2 (victoire extérieur)", pa, "1x2"), ("1X", "1X (double chance)", ph + pd_, "1x2"),
            ("X2", "X2 (double chance)", pd_ + pa, "1x2"), ("12", "12 (pas de nul)", ph + pa, "1x2")]
    for line, col in ((1.5, "p_over_1_5"), (2.5, "p_over_2_5"), (3.5, "p_over_3_5")):
        p = pred.get(col)
        if p is not None:
            fr = str(line).replace(".", ",")
            rows += [(f"O{line}", f"Plus de {fr} buts", p, "goals"),
                     (f"U{line}", f"Moins de {fr} buts", 1 - p, "goals")]
    if pred.get("p_btts") is not None:
        rows += [("BTTS_Y", "Les deux marquent : oui", pred["p_btts"], "btts"),
                 ("BTTS_N", "Les deux marquent : non", 1 - pred["p_btts"], "btts")]
    if pred.get("exp_home_goals") and pred.get("exp_away_goals"):
        lh, la = _fit_lambdas(ph, pa, (pred["exp_home_goals"], pred["exp_away_goals"]), pred.get("p_over_2_5"))
        pm = path_markets(lh, la)
        rows += [("1UP_1", "1UP domicile : mène d'1 but à un moment ou gagne", pm["up1_home"], "1up"),
                 ("1UP_2", "1UP extérieur : mène d'1 but à un moment ou gagne", pm["up1_away"], "1up"),
                 ("2UP_1", "2UP domicile : mène de 2 buts à un moment ou gagne", pm["up2_home"], "1up"),
                 ("2UP_2", "2UP extérieur : mène de 2 buts à un moment ou gagne", pm["up2_away"], "1up"),
                 ("FG_1", "Premier but : domicile", pm["first_home"], "first"),
                 ("FG_2", "Premier but : extérieur", pm["first_away"], "first"),
                 ("FG_0", "Aucun but", pm["none"], "first"),
                 ("FGW_1", "Domicile marque en premier et gagne", pm["first_home_win"], "first"),
                 ("FGW_2", "Extérieur marque en premier et gagne", pm["first_away_win"], "first")]
    return [{"key": k, "label": lab, "prob": round(float(p), 4), "note": note} for k, lab, p, note in rows]


def market_consensus(prices: list[tuple[str, str, float]]) -> dict | None:
    """Fair 1X2 probabilities from several bookmakers: each one's margin removed in
    proportion, then the mean. Also the best price offered for each selection."""
    books: dict[str, dict[str, float]] = {}
    for bookmaker, selection, price in prices:
        books.setdefault(bookmaker, {})[selection] = price
    fair = []
    for b in books.values():
        if set(b) == {"H", "D", "A"}:
            inv = {k: 1 / v for k, v in b.items()}
            total = sum(inv.values())
            fair.append({k: v / total for k, v in inv.items()})
    if not fair:
        return None
    mean = {k: float(np.mean([f[k] for f in fair])) for k in ("H", "D", "A")}
    best = {k: max(b[k] for b in books.values() if k in b) for k in ("H", "D", "A")}
    return {"1": round(mean["H"], 4), "X": round(mean["D"], 4), "2": round(mean["A"], 4),
            "1X": round(mean["H"] + mean["D"], 4), "X2": round(mean["D"] + mean["A"], 4),
            "12": round(mean["H"] + mean["A"], 4), "best": best, "n_bookmakers": len(fair)}
