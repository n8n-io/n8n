"""Tickets du jour (D69): three betPawa combos per match day, every market considered.

For each match, every selection the owner plays on betPawa gets a probability from the
bookmakers' 1X2 and over 2.5 (margin removed), through independent Poisson goal rates with
goals in random order (D58, D66): 1X2, double chance, 1UP, 2UP, double chance 1UP and 2UP
(early payout at a one- or two-goal lead, else the final result), first goal, BTTS, over and
under 1.5, 2.5 and 3.5.

The betPawa price is the one read on the owner's screenshots (reference/betpawa_prices.csv)
when known, else an estimate: the fair price less the margin measured for that market
(docs/RESULTS.md: 403 matches against Pinnacle; 1UP and double chance 1UP from RDC prices).
A ticket is the combination with the best chance of winning among those with total odds of
10 or more and an expected value, Win Bonus included (D67), above a floor. Not a forecast of
profit: the model has no proven edge, and estimated prices must be checked on betPawa.
"""

import csv
import math
from collections import Counter
from datetime import date, datetime, timedelta
from pathlib import Path

import numpy as np
from scipy.stats import poisson

from footintel.analysis.value import _fit_lambdas, path_markets

JOURNAL = Path(__file__).resolve().parents[3] / "reference" / "betpawa_prices.csv"
# Lubumbashi time (UTC+2): a match belongs to the owner's local day.
LOCAL_OFFSET = timedelta(hours=2)
MIN_ODDS = 10.0
# (tag, name, fewest legs, most legs, lowest total odds). D80: each leg loses betPawa's margin,
# so a short ticket keeps more of the stake on average than a long one, even with the Win Bonus.
SIZES = (("A", "Restreint", 5, 5, MIN_ODDS), ("B", "Large", 6, 9, MIN_ODDS), ("C", "Très large", 12, 15, MIN_ODDS),
         ("D", "Court", 2, 3, 2.5))
# Same list as MY_TEAMS in static/app.js (the owner's followed teams).
FOLLOWED = {"ENG-PL": "*", "GER-BL": "*", "ITA-SA": {"Lazio", "Inter", "Milan", "Como", "Bologna"},
            "ESP-LL": {"Barcelona", "Ath Madrid", "Real Madrid", "Villarreal", "Betis"}, "FRA-L1": {"Paris SG"}}
# Win Bonus of betPawa RDC by number of selections priced 1.20 or more (D67).
BONUS = {3: .04, 4: .07, 5: .12, 6: .17, 7: .21, 8: .25, 9: .27, 10: .32, 11: .34, 12: .39, 13: .44,
         14: .49, 15: .53, 16: .58}
BONUS_MIN_ODDS = 1.2
# Share of the fair price that betPawa keeps, by market (docs/RESULTS.md, 2026-10-30).
MARGIN = {"1": .065, "2": .07, "X": .019, "1X": .038, "X2": .045, "12": .066, "BTTS_Y": .095,
          "BTTS_N": .044, "1UP": .053, "FG": .051, "DC1UP": .035, "DC2UP": .035, "over": .066, "under": .031}
LABELS = {"1": "Victoire {h}", "X": "Match nul", "2": "Victoire {a}", "1X": "Double chance {h} ou nul",
          "X2": "Double chance {a} ou nul", "12": "Double chance pas de nul", "1UP_1": "1UP {h}",
          "1UP_2": "1UP {a}", "2UP_1": "2UP {h}", "2UP_2": "2UP {a}", "DC1UP_1X": "DC 1UP {h} ou nul",
          "DC1UP_X2": "DC 1UP {a} ou nul", "DC1UP_12": "DC 1UP pas de nul", "DC2UP_1X": "DC 2UP {h} ou nul",
          "DC2UP_X2": "DC 2UP {a} ou nul", "DC2UP_12": "DC 2UP pas de nul", "FG_1": "{h} marque en premier",
          "FG_2": "{a} marque en premier", "BTTS_Y": "Les deux marquent", "BTTS_N": "Les deux ne marquent pas"}
# Journal market and selection -> key of this module.
JOURNAL_KEYS = {("1X2", "H"): "1", ("1X2", "D"): "X", ("1X2", "A"): "2", ("DC", "1X"): "1X", ("DC", "X2"): "X2",
                ("DC", "12"): "12", ("1UP", "1"): "1UP_1", ("1UP", "2"): "1UP_2", ("2UP", "1"): "2UP_1",
                ("2UP", "2"): "2UP_2", ("DC1UP", "1X"): "DC1UP_1X", ("DC1UP", "X2"): "DC1UP_X2",
                ("DC1UP", "12"): "DC1UP_12", ("FG", "1"): "FG_1", ("FG", "2"): "FG_2", ("BTTS", "Y"): "BTTS_Y",
                ("BTTS", "N"): "BTTS_N", ("OU2.5", "O"): "+2.5", ("OU2.5", "U"): "-2.5"}


def dc_up(lh: float, la: float, need: int, n_max: int = 16) -> tuple[float, float, float]:
    """P(1X), P(X2), P(12) with betPawa's early payout: paid as soon as a covered team leads
    by `need` goals, else settled on the final result. Goals in random order."""
    q = lh / (lh + la)
    pn = poisson.pmf(np.arange(n_max), lh + la)
    dp = {(0, False, False): 1.0}  # score difference, home led by `need`, away led by `need`
    out = np.zeros(3)
    for n in range(n_max):
        for (s, h, a), p in dp.items():
            w = pn[n] * p
            out += w * np.array([h or s >= 0, a or s <= 0, h or a or s != 0])
        new: dict = {}
        for (s, h, a), p in dp.items():
            for step, pr in ((1, q), (-1, 1 - q)):
                t = s + step
                key = (t, h or t >= need, a or t <= -need)
                new[key] = new.get(key, 0.0) + p * pr
        dp = new
    return float(out[0]), float(out[1]), float(out[2])


def probabilities(p1: float, p2: float, p_over: float | None) -> dict[str, float]:
    """Every selection's probability from a fair 1X2 and over 2.5."""
    lh, la = _fit_lambdas(p1, p2, (1.4, 1.1), p_over)
    pm = path_markets(lh, la)
    goals = np.arange(11)
    grid = np.outer(poisson.pmf(goals, lh), poisson.pmf(goals, la))
    total = goals[:, None] + goals[None, :]
    px = 1 - p1 - p2
    # The goal rates match the 1X2 only approximately: an early-payout market is the exact
    # 1X2 or double chance plus what the early payout adds under those rates.
    f1, fx = float(np.tril(grid, -1).sum()), float(np.trace(grid))
    f2 = 1 - f1 - fx
    btts = (1 - np.exp(-lh)) * (1 - np.exp(-la))
    out = {"1": p1, "X": px, "2": p2, "1X": p1 + px, "X2": px + p2, "12": p1 + p2,
           "1UP_1": p1 + pm["up1_home"] - f1, "1UP_2": p2 + pm["up1_away"] - f2,
           "2UP_1": p1 + pm["up2_home"] - f1, "2UP_2": p2 + pm["up2_away"] - f2,
           "FG_1": pm["first_home"], "FG_2": pm["first_away"], "BTTS_Y": btts, "BTTS_N": 1 - btts}
    for need, tag in ((1, "DC1UP"), (2, "DC2UP")):
        d1x, dx2, d12 = dc_up(lh, la, need)
        out[f"{tag}_1X"] = p1 + px + d1x - (f1 + fx)
        out[f"{tag}_X2"] = px + p2 + dx2 - (fx + f2)
        out[f"{tag}_12"] = p1 + p2 + d12 - (f1 + f2)
    out = {k: min(max(v, 0.0), 1.0) for k, v in out.items()}
    for line in (1.5, 2.5, 3.5):
        over = float(grid[total > line].sum())
        out[f"+{line}"], out[f"-{line}"] = over, 1 - over
    return {k: float(v) for k, v in out.items()}


def margin(key: str, prob: float) -> float:
    if key.startswith("2UP"):
        # Moderate favourites' 2UP is priced near fair; heavy favourites' is not (RESULTS.md).
        return .06 if prob > .65 else .012
    if key[0] in "+-":
        return MARGIN["over" if key[0] == "+" else "under"]
    return MARGIN.get(key, MARGIN.get(key.split("_")[0], .05))


def label(key: str, home: str, away: str) -> str:
    if key[0] in "+-":
        return f"{'Plus' if key[0] == '+' else 'Moins'} de {key[1:].replace('.', ',')} buts"
    return LABELS[key].format(h=home, a=away)


def load_journal(path: Path = JOURNAL) -> dict[tuple[str, str, str], float]:
    """Latest betPawa price per (home, away, key) from the owner's screenshots."""
    if not path.exists():
        return {}
    latest: dict[tuple[str, str, str], tuple[str, float]] = {}
    with path.open(encoding="utf-8") as fh:
        for r in csv.DictReader(fh):
            key = JOURNAL_KEYS.get((r["market"].upper(), r["selection"].upper()))
            if key is None:
                continue
            k = (r["home"], r["away"], key)
            if k not in latest or r["captured_at"] >= latest[k][0]:
                latest[k] = (r["captured_at"], float(r["price"]))
    return {k: v for k, (_, v) in latest.items()}


def _team_followed(team: str, league: str | None) -> bool:
    teams = FOLLOWED.get(league)
    return teams == "*" or bool(teams and team in teams)


# National teams (D83, D84): every match with bookmaker prices, and every match of these teams,
# priced or not. Names as in the results file (connectors/international.py).
NATIONAL_ALWAYS = {
    "DR Congo", "France", "Spain", "Netherlands", "Italy", "Germany", "England", "Portugal",
    "Argentina", "Uruguay", "United States", "Brazil", "Norway", "Denmark", "Switzerland",
    "Morocco", "Egypt", "Senegal", "Nigeria", "Ivory Coast", "Algeria", "Japan", "Mexico",
    "Chile", "Greece",
}


def national_followed(m: dict) -> bool:
    """A national-team match the owner follows: priced by the bookmakers (Nations League, World
    Cup, Euro, AFCON...), or played by one of his teams. Other friendlies without prices stay
    out: nothing checks the young national model against them."""
    return m.get("source") == "marché" or bool({m["home"], m["away"]} & NATIONAL_ALWAYS)


def is_followed(m: dict) -> bool:
    """A followed team plays, in any competition: its domestic league (home_league,
    away_league) decides, so Dortmund counts in the Champions League too. National teams
    follow their own rule (national_followed)."""
    if str(m.get("competition", "")).startswith("INT-"):
        return national_followed(m)
    return (_team_followed(m["home"], m.get("home_league") or m["competition"])
            or _team_followed(m["away"], m.get("away_league") or m["competition"]))


def match_legs(m: dict, journal: dict) -> list[dict]:
    """Every selection of one match with its probability, fair odds and betPawa price,
    best first (probability net of the betPawa margin)."""
    probs = probabilities(m["p1"], m["p2"], m.get("p_over"))
    legs = []
    for key, p in probs.items():
        if p <= 0.02:
            continue
        known = journal.get((m["home"], m["away"], key))
        price = known or round(1 / p * (1 - margin(key, p)), 2)
        legs.append({"key": key, "label": label(key, m["home"], m["away"]), "prob": round(p, 4),
                     "fair": round(1 / p, 2), "price": price, "known": known is not None,
                     "ev": round(price * p - 1, 4)})
    return sorted(legs, key=lambda x: -x["prob"] * (1 + min(x["ev"], 0)))


def _family(key: str) -> str:
    return key[0] if key[0] in "+-" else key.split("_")[0] if "_" in key else ("DC" if len(key) == 2 else "1X2")


def evaluate(legs: list[dict]) -> tuple[float, float, float]:
    """Expected value with the Win Bonus, probability and total odds of a combo."""
    prob = math.prod(x["prob"] for x in legs)
    odds = math.prod(x["price"] for x in legs)
    eligible = sum(x["price"] >= BONUS_MIN_ODDS for x in legs)
    bonus = BONUS.get(min(eligible, 16), 0) if eligible >= 3 else 0
    return prob * (1 + (odds - 1) * (1 + bonus)) - 1, prob, odds


def best_ticket(pool: list[dict], n_min: int, n_max: int, beam: int = 200,
                min_odds: float = MIN_ODDS) -> dict | None:
    """Beam search over one selection per match: the most likely combo with total odds of
    `min_odds` or more, no market family repeated more than about a third of the legs, and
    an expected value above -6 % (else the best expected value found)."""
    legs = [x for x in pool if x["ev"] > -0.05 and 1.2 <= x["price"] <= 4.0 and x["prob"] >= 0.3]
    best = fallback = None
    states: list[list[dict]] = [[]]
    for n in range(1, n_max + 1):
        pace = math.log(min_odds) * n / n_min
        cand = []
        for st in states:
            used = {x["match_id"] for x in st}
            fam = Counter(_family(x["key"]) for x in st)
            for x in legs:
                if x["match_id"] in used or fam[_family(x["key"])] >= max(2, math.ceil(n_max / 3)):
                    continue
                ns = st + [x]
                ev, prob, odds = evaluate(ns)
                # Most likely first, but a combo behind the pace towards min_odds is penalised.
                cand.append((math.log(prob) - 6 * max(0.0, pace - math.log(odds)) + 0.5 * ev, ns))
        cand.sort(key=lambda c: -c[0])
        seen: set = set()
        states = []
        for _, st in cand:
            sig = frozenset((x["match_id"], x["key"]) for x in st)
            if sig not in seen:
                seen.add(sig)
                states.append(st)
            if len(states) >= beam:
                break
        if n >= n_min:
            for st in states:
                ev, prob, odds = evaluate(st)
                if odds < min_odds:
                    continue
                if ev > -0.06 and (best is None or prob > best[1]):
                    best = (ev, prob, odds, st)
                if fallback is None or ev > fallback[0]:
                    fallback = (ev, prob, odds, st)
    pick = best or fallback
    if pick is None:
        return None
    ev, prob, odds, st = pick
    return {"ev": round(ev, 4), "prob": round(prob, 5), "odds": round(odds, 2),
            "legs": sorted(st, key=lambda x: x["kickoff_utc"] or "")}


def local_day(m: dict) -> date:
    k = m.get("kickoff_utc")
    if not k:
        return m["kickoff_date"] if isinstance(m["kickoff_date"], date) else date.fromisoformat(str(m["kickoff_date"]))
    t = k if isinstance(k, datetime) else datetime.fromisoformat(str(k).replace("Z", "+00:00"))
    return (t + LOCAL_OFFSET).date()


def day_tickets(matches: list[dict], journal: dict, today: date, n_days: int = 2) -> list[dict]:
    """Tickets A, B and C for the next `n_days` local days with matches, built from the
    owner's teams only. A size with too few of their matches is listed in `missing`."""
    by_day: dict[date, list[dict]] = {}
    for m in matches:
        d = local_day(m)
        if d >= today:
            by_day.setdefault(d, []).append(m)
    out = []
    for d in sorted(by_day)[:n_days]:
        rows = []
        for m in sorted(by_day[d], key=lambda m: str(m.get("kickoff_utc") or "")):
            legs = match_legs(m, journal)
            base = {"match_id": m["id"], "match": f"{m['home']} – {m['away']}", "kickoff_utc": m.get("kickoff_utc"),
                    "competition": m["competition"], "followed": is_followed(m), "source": m.get("source", "marché"),
                    "scenarios": m.get("scenarios", [])}
            rows.append(base | {"alternatives": legs})
        pool_all = [{k: v for k, v in r.items() if k not in ("alternatives", "scenarios")} | x for r in rows for x in r["alternatives"]]
        # Tickets use the owner's teams only; a size needs that many of their matches.
        pool_mine = [x for x in pool_all if x["followed"]]
        n_mine = len({x["match_id"] for x in pool_mine})
        tickets, missing = [], []
        for tag, name, lo, hi, min_odds in SIZES:
            t = best_ticket(pool_mine, lo, hi, min_odds=min_odds) if n_mine >= lo else None
            if t:
                tickets.append({"tag": tag, "name": name, "size": [lo, hi]} | t)
            else:
                missing.append({"tag": tag, "name": name, "needs": lo})
        # Shown: the 12 best alternatives of each match, plus any selection a ticket uses.
        chosen = {(x["match_id"], x["key"]) for t in tickets for x in t["legs"]}
        for r in rows:
            r["alternatives"] = [x for i, x in enumerate(r["alternatives"])
                                 if i < 12 or (r["match_id"], x["key"]) in chosen]
        out.append({"date": d.isoformat(), "tickets": tickets, "missing": missing, "n_followed": n_mine,
                    "matches": rows})
    return out
