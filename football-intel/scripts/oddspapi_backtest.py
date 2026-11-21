"""betPawa (Cameroon) against Pinnacle on the matches already played (D68).

Run from football-intel/: ODDS_PAPI_KEY=... python scripts/oddspapi_backtest.py
Spends 1 request for the market list and 1 per league for the fixtures (6 in all);
the price histories are free. Writes OUT_DIR/rows.csv and prints one line per market.

For each finished match: the last pre-match price of each outcome at betPawa and at
Pinnacle. Fair probability = Pinnacle's last pre-match price, margin removed; first goal,
2UP and BTTS come from Pinnacle's 1X2 and over/under 2.5 through the goal-order
calculation of the site (D66), because Pinnacle does not price them. Expected value of a
betPawa price = price x fair probability - 1. A market is worth playing only if its mean
expected value is above 0 with the interval above 0.
"""

import csv
import os
import sys
import time
from collections import defaultdict
from pathlib import Path

import httpx
import numpy as np

sys.path.insert(0, "src")
from footintel.analysis.value import _fit_lambdas, path_markets  # noqa: E402

BASE = "https://api.oddspapi.io/v4"
KEY = os.environ.get("ODDS_PAPI_KEY", "").strip()
OUT = Path(os.environ.get("OUT_DIR", "oddspapi-backtest"))
SINCE = os.environ.get("SINCE", "2026-08-01T00:00:00Z")
LEAGUES = {"Premier League": 17, "LaLiga": 8, "Serie A": 23, "Ligue 1": 34, "Bundesliga": 35}
BOOK = "betpawa.cm"
# OddsPapi market ids seen on betpawa.cm (probe of 2026-10-30).
M_1X2, M_OU25, M_BTTS, M_FG, M_2UP, M_DC, M_DNB = "101", "1010", "104", "10216", "10761", "101902", "10214"


def get(path: str, **params):
    for _ in range(6):
        r = httpx.get(f"{BASE}{path}", params={"apiKey": KEY, **params}, timeout=60)
        if r.status_code != 429:
            break
        time.sleep(float(r.json().get("error", {}).get("retryMs", 3000)) / 1000 + 0.5)
    if r.status_code >= 400:
        raise RuntimeError(f"{path}: HTTP {r.status_code} {r.text[:200].replace(KEY, '***')}")
    return r.json()


def last_prices(market: dict, start: str) -> dict[str, float]:
    """Outcome id -> last price before kick-off."""
    out = {}
    for oid, o in market.get("outcomes", {}).items():
        rows = [h for h in o.get("players", {}).get("0", []) if h.get("price") and h["createdAt"][:19] < start]
        if rows:
            out[oid] = max(rows, key=lambda h: h["createdAt"])["price"]
    return out


def devig(prices: list[float]) -> list[float]:
    inv = [1 / p for p in prices]
    return [x / sum(inv) for x in inv]


def main() -> None:
    if not KEY:
        sys.exit("ODDS_PAPI_KEY is not set")
    OUT.mkdir(parents=True, exist_ok=True)
    names = {}
    for m in get("/markets"):
        if str(m["marketId"]) in {M_1X2, M_OU25, M_BTTS, M_FG, M_2UP, M_DC, M_DNB}:
            names[str(m["marketId"])] = {str(o["outcomeId"]): o["outcomeName"] for o in m["outcomes"]}
    rows = []
    for league, tid in LEAGUES.items():
        fixtures = [f for f in get("/fixtures", tournamentId=tid, **{"from": SINCE}) if f.get("statusId") == 2]
        print(f"{league}: {len(fixtures)} finished matches", flush=True)
        for f in fixtures:
            try:
                hist = get("/historical-odds", fixtureId=f["fixtureId"], bookmakers=f"pinnacle,{BOOK}")
            except RuntimeError as exc:
                print(f"  skip {f['fixtureId']}: {exc}")
                continue
            start = f["startTime"][:19]
            books = hist.get("bookmakers", {})
            pin = {mid: last_prices(m, start) for mid, m in books.get("pinnacle", {}).get("markets", {}).items()}
            paw = {mid: last_prices(m, start) for mid, m in books.get(BOOK, {}).get("markets", {}).items()}
            p1x2 = [pin.get(M_1X2, {}).get(o) for o in names[M_1X2]]
            pou = pin.get(M_OU25, {})
            if None in p1x2 or len(p1x2) != 3 or len(pou) != 2:
                continue
            by_name = dict(zip(names[M_1X2].values(), devig(p1x2)))
            h, d, a = by_name["1"], by_name["X"], by_name["2"]
            ou = dict(zip((names[M_OU25][o] for o in pou), devig(list(pou.values()))))
            lh, la = _fit_lambdas(h, a, (1.4, 1.1), ou["Over"])
            pm = path_markets(lh, la)
            btts = (1 - np.exp(-lh)) * (1 - np.exp(-la))
            fair = {
                M_1X2: {"1": h, "X": d, "2": a},
                M_OU25: ou,
                M_BTTS: {"Yes": btts, "No": 1 - btts},
                M_FG: {"1": pm["first_home"], "2": pm["first_away"], "No Goal": pm["none"]},
                M_2UP: {"1": pm["up2_home"], "2": pm["up2_away"], "X": 1 - pm["up2_home"] - pm["up2_away"]},
                M_DC: {"1X": h + d, "12": h + a, "2X": d + a},
                M_DNB: {"1": h / (h + a), "2": a / (h + a)},
            }
            for mid, sels in fair.items():
                for oid, price in paw.get(mid, {}).items():
                    sel = names.get(mid, {}).get(oid)
                    if sel in sels and price > 1:
                        rows.append({"league": league, "fixture": f["fixtureId"], "start": start,
                                     "match": f"{f['participant1Name']} - {f['participant2Name']}",
                                     "market": mid, "selection": sel, "price": price,
                                     "fair": round(sels[sel], 4), "ev": round(price * sels[sel] - 1, 4)})
    with open(OUT / "rows.csv", "w", newline="", encoding="utf-8") as fh:
        w = csv.DictWriter(fh, fieldnames=list(rows[0]) if rows else ["none"])
        w.writeheader()
        w.writerows(rows)
    label = {M_1X2: "1X2", M_OU25: "+/-2.5", M_BTTS: "BTTS", M_FG: "1er but", M_2UP: "2UP", M_DC: "DC", M_DNB: "DNB"}
    groups = defaultdict(list)
    for r in rows:
        groups[(label[r["market"]], r["selection"])].append(r["ev"])
        groups[(label[r["market"]], "*")].append(r["ev"])
    rng = np.random.default_rng(0)
    print(f"\n{len(rows)} betPawa prices against Pinnacle (EV = price x fair - 1)")
    for (mk, sel), evs in sorted(groups.items()):
        x = np.array(evs)
        boot = rng.choice(x, (2000, len(x))).mean(axis=1)
        lo, hi = np.percentile(boot, [2.5, 97.5])
        share = (x > 0).mean()
        print(f"{mk:8} {sel:8} n={len(x):4} EV {x.mean():+.2%} [{lo:+.2%} ; {hi:+.2%}]  prix > juste : {share:.0%}")


if __name__ == "__main__":
    main()
