"""Predictive value of each analysis level, measured on later seasons only.

Levels are nested: each one adds features to the previous one. Every level is
trained walk-forward (season S predicted by a model fitted on earlier seasons) and
compared with the previous level on the same matches (paired bootstrap).
"""

import logging

import numpy as np
import pandas as pd

from footintel.evaluation import metrics as M
from footintel.evaluation.backtest import finished
from footintel.features.builder import side_features
from footintel.features.context import PHASE_FEATURES, TREND_FEATURES
from footintel.models.base import PROB_COLS, encode_result
from footintel.models.baseline import PoissonFeatures
from footintel.models.ml import logistic

log = logging.getLogger(__name__)

GENERAL = ["elo_diff", "neutral"]
COMPETITION = GENERAL + TREND_FEATURES + ["is_european", "is_domestic_cup"]
PHASE = COMPETITION + PHASE_FEATURES
TEAMS = PHASE + side_features("h") + side_features("a")
MARKET = TEAMS + ["mkt_p_home", "mkt_p_draw", "mkt_p_away", "mkt_overround"]

OUTCOME_LEVELS = {"1_general": GENERAL, "2_competition": COMPETITION, "3_phase": PHASE,
                  "4_teams": TEAMS}
GOAL_TEAM = ["gf5_h", "ga5_h", "gf5_a", "ga5_a", "shots5_for_h", "shots5_against_h",
             "shots5_for_a", "shots5_against_a", "sot5_for_h", "sot5_against_h", "sot5_for_a",
             "sot5_against_a", "games_14d_h", "games_14d_a"]
GOAL_LEVELS = {"1_general": GENERAL, "2_competition": COMPETITION, "3_phase": PHASE,
               "4_teams": PHASE + GOAL_TEAM}


def _scores(frame: pd.DataFrame) -> pd.DataFrame:
    y = encode_result(frame)
    total = (frame["home_goals"] + frame["away_goals"]).to_numpy()
    btts = ((frame["home_goals"] > 0) & (frame["away_goals"] > 0)).astype(float).to_numpy()
    out = pd.DataFrame({"match_id": frame["match_id"].to_numpy(),
                        "ll_1x2": M.per_row_log_loss(frame[PROB_COLS].to_numpy(), y)})
    if "p_over_2_5" in frame:
        out["ll_ou25"] = M.binary_log_loss(frame["p_over_2_5"].to_numpy(), (total > 2.5).astype(float))
        out["ll_btts"] = M.binary_log_loss(frame["p_btts"].to_numpy(), btts)
    return out


def run_ablation(features: pd.DataFrame, test_seasons: list[int]) -> pd.DataFrame:
    data = finished(features)
    first = int(data["season"].min())
    target = data["is_target"].fillna(True).astype(bool)
    rows = []
    for season in test_seasons:
        train = data[(data["season"] > first) & (data["season"] < season)]
        test = data[(data["season"] == season) & target]
        meta = test[["match_id", "competition", "competition_type"]]
        for level, feats in OUTCOME_LEVELS.items():
            pred = logistic(feats, level).fit(train).predict(test)
            sc = _scores(pd.concat([test[["match_id", "home_goals", "away_goals"]], pred], axis=1))
            rows.append(sc.assign(family="outcome_logistic", level=level).merge(meta, on="match_id"))
        # Market level: trained and tested only where pre-match odds exist.
        tr_o, te_o = train[train["mkt_p_home"].notna()], test[test["mkt_p_home"].notna()]
        if len(te_o):
            pred = logistic(MARKET, "5_market").fit(tr_o).predict(te_o)
            sc = _scores(pd.concat([te_o[["match_id", "home_goals", "away_goals"]], pred], axis=1))
            rows.append(sc.assign(family="outcome_logistic", level="5_market").merge(meta, on="match_id"))
        for level, feats in GOAL_LEVELS.items():
            pred = PoissonFeatures(level, feats).fit(train).predict(test)
            sc = _scores(pd.concat([test[["match_id", "home_goals", "away_goals"]], pred], axis=1))
            rows.append(sc.assign(family="goals_poisson", level=level).merge(meta, on="match_id"))
        log.info("Ablation season %s done", season)
    return pd.concat(rows, ignore_index=True)


def compare_levels(scores: pd.DataFrame, samples: int = 1000) -> pd.DataFrame:
    """Each level minus the previous one, on shared matches, per scope and metric."""
    out = []
    scopes = {"all targets": scores,
              "domestic leagues": scores[scores["competition_type"] == "league"],
              "european cups": scores[scores["competition_type"] == "continental"]}
    for family, fam in [(f, scores[scores["family"] == f]) for f in scores["family"].unique()]:
        levels = sorted(fam["level"].unique())
        metrics = ["ll_1x2"] + (["ll_ou25", "ll_btts"] if family == "goals_poisson" else [])
        for scope, sdf in scopes.items():
            sfam = sdf[sdf["family"] == family]
            for prev, cur in zip(levels, levels[1:], strict=False):
                a = sfam[sfam["level"] == cur].set_index("match_id")
                b = sfam[sfam["level"] == prev].set_index("match_id")
                common = a.index.intersection(b.index)
                if len(common) < 100:
                    continue
                for metric in metrics:
                    diff = (a.loc[common, metric] - b.loc[common, metric]).to_numpy()
                    lo, hi = M.bootstrap_mean_ci(diff, samples=samples)
                    out.append({"family": family, "scope": scope, "step": f"{prev} -> {cur}",
                                "metric": metric, "n": len(common),
                                "level_value": float(a.loc[common, metric].mean()),
                                "mean_diff": float(diff.mean()), "ci_low": lo, "ci_high": hi,
                                "verdict": "improves" if hi < 0 else "worsens" if lo > 0
                                else "no demonstrated effect"})
    return pd.DataFrame(out)


def store_ablation(engine, comparisons: pd.DataFrame) -> int:
    """Save the level comparisons as one training run with its metrics."""
    from datetime import UTC, datetime

    from footintel.db.models import ModelMetric, TrainingRun
    from footintel.db.session import session_scope

    now = datetime.now(UTC)
    with session_scope(engine) as s:
        run = TrainingRun(kind="ablation", started_at=now, finished_at=now, status="success",
                          config={"levels": list(OUTCOME_LEVELS) + ["5_market"]})
        s.add(run)
        s.flush()
        for r in comparisons.itertuples():
            s.add(ModelMetric(training_run_id=run.id, model_name=f"{r.family}:{r.step}",
                              scope="backtest", segment=f"ablation:{r.scope}", metric=r.metric,
                              value=r.mean_diff, n=r.n, ci_low=r.ci_low, ci_high=r.ci_high))
        return run.id
