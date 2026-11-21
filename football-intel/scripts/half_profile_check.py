"""Does a team's half-time profile repeat? Season to next season, and odd vs even matches of
one season, on every league match with a half-time score (D59).
Run from football-intel/: .venv/bin/python scripts/half_profile_check.py
"""
import sys

import numpy as np
import pandas as pd
from sqlalchemy import text
sys.path.insert(0, "src")
from footintel.db.session import get_engine  # noqa: E402
e = get_engine()
df = pd.read_sql(text("""
SELECT m.id, se.start_year AS season, c.code, m.home_team_id AS h, m.away_team_id AS a,
       o.home_goals hg, o.away_goals ag, o.ht_home_goals hh, o.ht_away_goals ha
FROM matches m JOIN match_outcomes o ON o.match_id=m.id JOIN seasons se ON se.id=m.season_id
JOIN competitions c ON c.id=m.competition_id
WHERE o.ht_home_goals IS NOT NULL AND c.type='league'"""), e.connect())
print("matches with half-time score:", len(df), "seasons", df.season.min(), "-", df.season.max())
rows = []
for side, o in (("h", "a"), ("a", "h")):
    gf1 = df.hh if side == "h" else df.ha; ga1 = df.ha if side == "h" else df.hh
    gf = df.hg if side == "h" else df.ag; ga = df.ag if side == "h" else df.hg
    rows.append(pd.DataFrame({"team": df[side], "season": df.season, "code": df.code,
        "d1": gf1 - ga1, "d2": (gf - gf1) - (ga - ga1), "gf1": gf1, "gf2": gf - gf1}))
t = pd.concat(rows)
ts = t.groupby(["team", "season", "code"]).agg(n=("d1", "size"), d1=("d1", "mean"), d2=("d2", "mean"),
    gf1=("gf1", "sum"), gf2=("gf2", "sum")).reset_index()
ts = ts[ts.n >= 20]
ts["half_edge"] = ts.d1 - ts.d2            # >0: better in 1st half than 2nd (goal difference per match)
ts["share2"] = ts.gf2 / (ts.gf1 + ts.gf2)  # share of goals scored after the break
# Remove the league-season average so a league effect is not read as a team trait.
for k in ("half_edge", "share2"):
    ts[k + "_rel"] = ts[k] - ts.groupby(["code", "season"])[k].transform("mean")
nxt = ts.copy(); nxt["season"] -= 1
pair = ts.merge(nxt, on=["team", "season"], suffixes=("", "_next"))
print("team-season pairs:", len(pair))
for k in ("half_edge_rel", "share2_rel"):
    r = np.corrcoef(pair[k], pair[k + "_next"])[0, 1]
    rng = np.random.default_rng(0); b = []
    for _ in range(1000):
        s = pair.sample(len(pair), replace=True, random_state=int(rng.integers(1e9)))
        b.append(np.corrcoef(s[k], s[k + "_next"])[0, 1])
    print(f"{k}: correlation season -> next season r = {r:.3f} [95% {np.percentile(b,2.5):.3f} ; {np.percentile(b,97.5):.3f}]")
# For comparison: overall strength persists strongly.
pair["d_all"] = pair.d1 + pair.d2; pair["d_all_next"] = pair.d1_next + pair.d2_next
print("overall goal difference per match: r =", round(np.corrcoef(pair.d_all, pair.d_all_next)[0, 1], 3))

# Within a season: matches 1,3,5... against matches 2,4,6... of the same team.
df2 = []
for side in ("h", "a"):
    gf1 = df.hh if side == "h" else df.ha; ga1 = df.ha if side == "h" else df.hh
    gf = df.hg if side == "h" else df.ag; ga = df.ag if side == "h" else df.hg
    df2.append(pd.DataFrame({"id": df.id, "team": df[side], "season": df.season, "code": df.code,
        "edge": (gf1 - ga1) - ((gf - gf1) - (ga - ga1)), "share2": (gf - gf1), "gf": gf}))
u = pd.concat(df2).sort_values("id")
u["k"] = u.groupby(["team", "season"]).cumcount() % 2
g = u.groupby(["team", "season", "code", "k"]).agg(n=("edge", "size"), edge=("edge", "mean"),
    g2=("share2", "sum"), gf=("gf", "sum")).reset_index()
g["share2"] = g.g2 / g.gf.where(g.gf > 0)
for k in ("edge", "share2"):
    g[k] = g[k] - g.groupby(["code", "season", "k"])[k].transform("mean")
w = g.pivot_table(index=["team", "season"], columns="k", values=["edge", "share2", "n"])
w = w[(w[("n", 0)] >= 10) & (w[("n", 1)] >= 10)].dropna()
for k in ("edge", "share2"):
    print(f"within season, odd vs even matches, {k}: r = {np.corrcoef(w[(k, 0)], w[(k, 1)])[0, 1]:.3f} (n={len(w)})")
