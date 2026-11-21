"""Check the "who scores first" estimate against the real first goals of 2026-27.

The model is trained on seasons before 2026-27 only, then predicts this season's league
matches: every prediction is out of sample. The real first goal comes from the OneFootball
goal minutes. Run from football-intel/: .venv/bin/python scripts/first_goal_check.py
"""

import sys

import numpy as np
import pandas as pd
from sqlalchemy import text

sys.path.insert(0, "src")
from footintel.analysis.matchup import _goal_events, first_goal  # noqa: E402
from footintel.db.session import get_engine  # noqa: E402
from footintel.evaluation.backtest import walk_forward  # noqa: E402
from footintel.features.builder import build_features  # noqa: E402
from footintel.features.dataset import load_matches  # noqa: E402

SEASON = 2026
MODEL = "routed_competition"
engine = get_engine()
feats = build_features(load_matches(engine))
preds = walk_forward(feats, [MODEL], [SEASON])
lam_cols = [c for c in preds.columns if c in ("exp_home_goals", "exp_away_goals", "lambda_home", "lambda_away")]
print("expected-goal columns:", lam_cols)
lh, la = (("exp_home_goals", "exp_away_goals") if "exp_home_goals" in preds else ("lambda_home", "lambda_away"))

with engine.connect() as c:
    goals = pd.read_sql(text("""
        SELECT e.match_id, e.team_id, e.minute, coalesce(e.extra_minute, 0) AS extra, e.detail,
               m.home_team_id, m.away_team_id
        FROM match_events e JOIN data_sources d ON d.id = e.source_id AND d.code = 'onefootball'
        JOIN matches m ON m.id = e.match_id WHERE e.type = 'goal'"""), c)
    read = pd.read_sql(text("""
        SELECT DISTINCT r.match_id, m.home_team_id, m.away_team_id FROM match_external_refs r
        JOIN data_sources d ON d.id = r.source_id AND d.code = 'onefootball'
        JOIN matches m ON m.id = r.match_id"""), c)

g = _goal_events(goals)
first = g.sort_values("t").groupby("match_id").first()
read["actual"] = "none"
for r in read.itertuples():
    if r.match_id in first.index:
        read.loc[r.Index, "actual"] = "home" if first.loc[r.match_id, "credited"] == r.home_team_id else "away"

df = preds.merge(read[["match_id", "actual"]], on="match_id").dropna(subset=[lh, la])
est = pd.DataFrame([first_goal(h, a) for h, a in zip(df[lh], df[la])], index=df.index)
df = pd.concat([df, est], axis=1)
y = df.actual.to_numpy()
cols = ["home", "away", "none"]
P = df[cols].to_numpy()
idx = np.array([cols.index(v) for v in y])


def logloss(p):
    return float(-np.log(np.clip(p[np.arange(len(p)), idx], 1e-12, 1)).mean())


freq = pd.Series(y).value_counts(normalize=True).reindex(cols).fillna(0).to_numpy()
naive = np.tile(freq, (len(y), 1))
# A plainer rule: the share of the home win probability among the two win probabilities.
share = df.p_home / (df.p_home + df.p_away)
plain = np.column_stack([share * (1 - df.none), (1 - share) * (1 - df.none), df.none])

n = len(df)
print(f"\nMatches: {n} (league matches of {SEASON}-{SEASON % 100 + 1} with goal minutes)")
print("Actual first goal:", {k: int((y == k).sum()) for k in cols})
print(f"Log loss  model {logloss(P):.4f} | naive frequency {logloss(naive):.4f} | 1X2-share rule {logloss(plain):.4f}")
rng = np.random.default_rng(0)
d = -np.log(np.clip(P[np.arange(n), idx], 1e-12, 1)) + np.log(np.clip(naive[np.arange(n), idx], 1e-12, 1))
boots = [d[rng.integers(0, n, n)].mean() for _ in range(2000)]
print(f"Model - naive: {d.mean():+.4f} [95% CI {np.percentile(boots, 2.5):+.4f} ; {np.percentile(boots, 97.5):+.4f}]")
fav = np.where(df.home >= df.away, "home", "away")
scored = y != "none"
print(f"The team the model favours to score first did so in {(fav[scored] == y[scored]).mean():.1%} "
      f"of the {scored.sum()} matches with a goal")

# Calibration of P(home scores first) and P(away scores first), pooled.
pool = pd.DataFrame({"p": np.r_[df.home, df.away], "hit": np.r_[y == "home", y == "away"]})
pool["bin"] = pd.cut(pool.p, [0, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 1.0])
cal = pool.groupby("bin", observed=True).agg(n=("hit", "size"), announced=("p", "mean"), observed=("hit", "mean"))
print("\nCalibration (a team's chance to score first):")
print(cal.assign(announced=lambda t: (100 * t.announced).round(1), observed=lambda t: (100 * t.observed).round(1)).to_string())
print(f"\nNo goal: announced {df.none.mean():.1%} on average, observed {(y == 'none').mean():.1%}")
