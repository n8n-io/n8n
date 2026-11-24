"""Season 2026-27 experiment: do OneFootball line-up variables add to the market?

Run from football-intel/: .venv/bin/python scripts/lineup_experiment.py (see docs/RESULTS.md).

Only variables known before kick-off are used: each one comes from the team's previous
matches of the season, never from the line-up of the match itself.
"""

import sys

import numpy as np
import pandas as pd
from sklearn.linear_model import LogisticRegression
from sqlalchemy import text

sys.path.insert(0, "src")
from footintel.db.session import get_engine  # noqa: E402
from footintel.features.builder import build_features  # noqa: E402
from footintel.features.dataset import load_matches  # noqa: E402

LEAGUES = ["ENG-PL", "ESP-LL", "ITA-SA", "GER-BL"]
engine = get_engine()
feats = build_features(load_matches(engine))
m = feats[(feats.season == 2026) & feats.competition.isin(LEAGUES) & feats.home_goals.notna()].copy()
m = m.dropna(subset=["mkt_p_home", "mkt_p_draw", "mkt_p_away"])
m["y"] = np.select([m.home_goals > m.away_goals, m.home_goals == m.away_goals], [0, 1], 2)

with engine.connect() as c:
    lu = pd.read_sql(text("""
        SELECT l.match_id, l.team_id, l.player_id, mt.kickoff_date FROM lineups l
        JOIN data_sources d ON d.id = l.source_id AND d.code = 'onefootball'
        JOIN matches mt ON mt.id = l.match_id"""), c)
    fm = pd.read_sql(text("""
        SELECT t.match_id, t.team_id, t.formation FROM team_match_tactics t
        JOIN data_sources d ON d.id = t.source_id AND d.code = 'onefootball'"""), c)

xi = lu.groupby(["team_id", "match_id", "kickoff_date"])["player_id"].apply(frozenset).reset_index()
xi = xi.merge(fm, on=["match_id", "team_id"], how="left").sort_values(["team_id", "kickoff_date"])

rows = []
for team, g in xi.groupby("team_id"):
    g = g.reset_index(drop=True)
    for i in range(len(g)):
        prev = g.iloc[:i]
        r = {"team_id": team, "match_id": g.match_id[i], "n_prev": i,
             "rot_last": np.nan, "core_out_last": np.nan, "form_change_last": np.nan}
        if i >= 2:
            r["rot_last"] = 11 - len(prev.player_id.iloc[-1] & prev.player_id.iloc[-2])
        if i >= 3:
            counts = pd.Series([p for s in prev.player_id for p in s]).value_counts()
            core = set(counts.index[:11])
            r["core_out_last"] = len(core - prev.player_id.iloc[-1])
            modal = prev.formation.mode()
            r["form_change_last"] = float(prev.formation.iloc[-1] != modal.iloc[0]) if len(modal) else np.nan
        rows.append(r)
tf = pd.DataFrame(rows)

LU = ["rot_last", "core_out_last", "form_change_last"]
for side, col in (("h", "home_team_id"), ("a", "away_team_id")):
    part = tf.rename(columns={c: f"{c}_{side}" for c in LU}).rename(columns={"team_id": col})
    m = m.merge(part[["match_id", col] + [f"{c}_{side}" for c in LU]], on=["match_id", col], how="left")
for c in LU:
    m[f"d_{c}"] = m[f"{c}_h"] - m[f"{c}_a"]
m = m.dropna(subset=[f"d_{c}" for c in LU]).sort_values("kickoff_date")

eps = 1e-9
m["l_hd"] = np.log((m.mkt_p_home + eps) / (m.mkt_p_draw + eps))
m["l_ad"] = np.log((m.mkt_p_away + eps) / (m.mkt_p_draw + eps))
BASE, CAND = ["l_hd", "l_ad"], ["l_hd", "l_ad"] + [f"d_{c}" for c in LU]


def ll(p, y):
    return -np.log(np.clip(p[np.arange(len(y)), y], 1e-12, 1))


def fit_predict(train, test, cols):
    model = LogisticRegression(C=1.0, max_iter=2000).fit(train[cols], train.y)
    return model.predict_proba(test[cols])


def compare(train, test, label):
    mkt = test[["mkt_p_home", "mkt_p_draw", "mkt_p_away"]].to_numpy()
    mkt = mkt / mkt.sum(axis=1, keepdims=True)
    l_mkt, l_base, l_cand = ll(mkt, test.y.to_numpy()), ll(fit_predict(train, test, BASE), test.y.to_numpy()), \
        ll(fit_predict(train, test, CAND), test.y.to_numpy())
    diff = l_cand - l_base
    rng = np.random.default_rng(0)
    boots = [diff[rng.integers(0, len(diff), len(diff))].mean() for _ in range(2000)]
    lo, hi = np.percentile(boots, [2.5, 97.5])
    print(f"{label}: train {len(train)}, test {len(test)} | log loss market {l_mkt.mean():.4f}, "
          f"base {l_base.mean():.4f}, candidate {l_cand.mean():.4f} | candidate - base "
          f"{diff.mean():+.4f} [95% CI {lo:+.4f} ; {hi:+.4f}]")


cut = pd.Timestamp("2026-10-19")
print("Matches with all variables:", len(m), "from", m.kickoff_date.min().date(), "to", m.kickoff_date.max().date())
compare(m[m.kickoff_date < cut], m[m.kickoff_date >= cut], "Trained to Oct 18, tested Oct 19-26")

# Week by week: train on everything before each week, predict that week.
weeks = m.kickoff_date.dt.to_period("W-SUN")
preds = []
for w in sorted(weeks.unique())[2:]:
    tr, te = m[weeks < w], m[weeks == w]
    if len(tr) >= 60 and len(te):
        preds.append((tr, te))
if preds:
    test = pd.concat([te for _, te in preds])
    pb = np.vstack([fit_predict(tr, te, BASE) for tr, te in preds])
    pc = np.vstack([fit_predict(tr, te, CAND) for tr, te in preds])
    y = test.y.to_numpy()
    mkt = test[["mkt_p_home", "mkt_p_draw", "mkt_p_away"]].to_numpy()
    mkt = mkt / mkt.sum(axis=1, keepdims=True)
    diff = ll(pc, y) - ll(pb, y)
    rng = np.random.default_rng(0)
    boots = [diff[rng.integers(0, len(diff), len(diff))].mean() for _ in range(2000)]
    lo, hi = np.percentile(boots, [2.5, 97.5])
    print(f"Week by week ({len(preds)} weeks): test {len(test)} | log loss market {ll(mkt, y).mean():.4f}, "
          f"base {ll(pb, y).mean():.4f}, candidate {ll(pc, y).mean():.4f} | candidate - base "
          f"{diff.mean():+.4f} [95% CI {lo:+.4f} ; {hi:+.4f}]")
model = LogisticRegression(C=1.0, max_iter=2000).fit(m[m.kickoff_date < cut][CAND], m[m.kickoff_date < cut].y)
print("Coefficients (home win, draw, away win):")
print(pd.DataFrame(model.coef_, columns=CAND, index=["H", "D", "A"]).round(3).to_string())
