"""Check the order-dependent markets (first goal, 1UP, 2UP, first goal and win) against the
real goal sequences of 2026-27.

The model is trained on seasons before 2026-27 only, then predicts this season's league
matches: every prediction is out of sample. The goal order comes from the OneFootball goal
minutes. Three ways to get the goal rates are compared:
  model    the model's own expected goals
  fit_1x2  rates fitted to the model's 1X2
  fit_ou   rates fitted to the model's 1X2 and over 2.5 (used by the site)
Run from football-intel/: .venv/bin/python scripts/markets_check.py
"""

import sys

import numpy as np
import pandas as pd
from sqlalchemy import text

sys.path.insert(0, "src")
from footintel.analysis.matchup import _goal_events  # noqa: E402
from footintel.analysis.value import _fit_lambdas, path_markets  # noqa: E402
from footintel.db.session import get_engine  # noqa: E402
from footintel.evaluation.backtest import walk_forward  # noqa: E402
from footintel.features.builder import build_features  # noqa: E402
from footintel.features.dataset import load_matches  # noqa: E402

SEASON = 2026
MODEL = "routed_competition"
engine = get_engine()
preds = walk_forward(build_features(load_matches(engine)), [MODEL], [SEASON])

with engine.connect() as c:
    goals = pd.read_sql(text("""
        SELECT e.match_id, e.team_id, e.minute, coalesce(e.extra_minute, 0) AS extra, e.detail,
               m.home_team_id, m.away_team_id
        FROM match_events e JOIN data_sources d ON d.id = e.source_id AND d.code = 'onefootball'
        JOIN matches m ON m.id = e.match_id WHERE e.type = 'goal'"""), c)
    read = pd.read_sql(text("""
        SELECT DISTINCT r.match_id, m.home_team_id FROM match_external_refs r
        JOIN data_sources d ON d.id = r.source_id AND d.code = 'onefootball'
        JOIN matches m ON m.id = r.match_id"""), c)

g = _goal_events(goals).sort_values("t")
home_of = dict(zip(read.match_id, read.home_team_id))
actual = {}
for mid in read.match_id:
    seq = [1 if c == home_of[mid] else -1 for c in g.loc[g.match_id == mid, "credited"]]
    run = np.cumsum(seq) if seq else np.array([0])
    first = "none" if not seq else ("home" if seq[0] == 1 else "away")
    end = run[-1]
    actual[mid] = {"first": first, "up1_home": run.max() >= 1, "up1_away": run.min() <= -1,
                   "up2_home": run.max() >= 2 or end > 0, "up2_away": run.min() <= -2 or end < 0,
                   "first_home_win": first == "home" and end > 0, "first_away_win": first == "away" and end < 0}

df = preds[preds.match_id.isin(actual)].dropna(subset=["p_home", "exp_home_goals"]).reset_index(drop=True)
print(f"Matches: {len(df)} league matches of {SEASON}-{SEASON % 100 + 1} with goal minutes, predicted out of sample")


def rates(row, how):
    if how == "model":
        return row.exp_home_goals, row.exp_away_goals
    ou = row.p_over_2_5 if how == "fit_ou" else None
    return _fit_lambdas(row.p_home, row.p_away, (row.exp_home_goals, row.exp_away_goals), ou)


def ll(p, y):
    return float(-np.mean(np.log(np.clip(np.where(y, p, 1 - p), 1e-12, 1))))


BINARY = ["up1_home", "up1_away", "up2_home", "up2_away", "first_home_win", "first_away_win"]
results, est = {}, {}
for how in ("model", "fit_1x2", "fit_ou"):
    pm = pd.DataFrame([path_markets(*rates(r, how)) for r in df.itertuples()])
    est[how] = pm
    y_first = np.array([actual[m]["first"] for m in df.match_id])
    P = pm[["first_home", "first_away", "none"]].to_numpy()
    idx = np.array([["home", "away", "none"].index(v) for v in y_first])
    results[how] = {"first goal (3 outcomes)": float(-np.log(np.clip(P[np.arange(len(P)), idx], 1e-12, 1)).mean())}
    for k in BINARY:
        y = np.array([actual[m][k] for m in df.match_id])
        results[how][k] = ll(pm[k].to_numpy(), y)

naive = {}
y_first = np.array([actual[m]["first"] for m in df.match_id])
freq = pd.Series(y_first).value_counts(normalize=True)
naive["first goal (3 outcomes)"] = float(-np.mean(np.log([freq[v] for v in y_first])))
for k in BINARY:
    y = np.array([actual[m][k] for m in df.match_id])
    naive[k] = ll(np.full(len(y), y.mean()), y)
table = pd.DataFrame(results).assign(naive_frequency=pd.Series(naive))
print("\nLog loss (lower is better):")
print(table.round(4).to_string())

pm = est["fit_ou"]
rows = []
for k in BINARY:
    y = np.array([actual[m][k] for m in df.match_id])
    rows.append(pd.DataFrame({"market": k, "p": pm[k], "hit": y}))
pool = pd.concat(rows)
pool["bin"] = pd.cut(pool.p, [0, 0.2, 0.35, 0.5, 0.65, 0.8, 1.0])
cal = pool.groupby(["bin"], observed=True).agg(n=("hit", "size"), announced=("p", "mean"), observed=("hit", "mean"))
print("\nCalibration of the site's estimate (fit_ou), all six markets pooled:")
print(cal.assign(announced=lambda t: (100 * t.announced).round(1), observed=lambda t: (100 * t.observed).round(1)).to_string())
print("\nObserved rates:", {k: round(float(np.mean([actual[m][k] for m in df.match_id])), 3) for k in BINARY})
