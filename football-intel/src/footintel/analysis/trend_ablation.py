"""Contribution of each trend category to each market, on later seasons only.

Reference = the components of the active model (`routed_competition`):
- 1X2 with pre-match odds: logistic on Elo, team form and market (trained on rows with odds);
- 1X2 without odds: logistic on Elo and competition trends;
- goal markets: Poisson GLM on competition trends and team attack/defence;
- first-half markets: the same Poisson design fitted on half-time scores (not in the
  active model; reported as a new market).
Each variant adds one trend category to every component; "all" adds them all.
"""

import logging

import numpy as np
import pandas as pd
from scipy.stats import poisson

from footintel.analysis.ablation import COMPETITION, GOAL_TEAM
from footintel.evaluation import metrics as M
from footintel.evaluation.backtest import finished
from footintel.features.trend_features import TREND_GROUPS, group_columns
from footintel.models.base import MAX_GOALS, PROB_COLS, encode_result
from footintel.models.baseline import PoissonFeatures
from footintel.models.ml import WITH_MARKET_FEATURES, logistic

log = logging.getLogger(__name__)

GOAL_BASE = COMPETITION + GOAL_TEAM
TOTAL_CLASSES = 7  # 0, 1, ..., 5, 6+


def _score_probs(lh: np.ndarray, la: np.ndarray, hg: np.ndarray, ag: np.ndarray):
    """Probability of the exact score, and the distribution of the total (0..5, 6+)."""
    goals = np.arange(MAX_GOALS + 1)
    exact, totals = np.empty(len(lh)), np.empty((len(lh), TOTAL_CLASSES))
    for i, (a, b) in enumerate(zip(lh, la, strict=True)):
        m = np.outer(poisson.pmf(goals, a), poisson.pmf(goals, b))
        m /= m.sum()
        exact[i] = m[min(int(hg[i]), MAX_GOALS), min(int(ag[i]), MAX_GOALS)]
        tot = np.bincount((goals[:, None] + goals[None, :]).ravel(), weights=m.ravel())
        totals[i, :6] = tot[:6]
        totals[i, 6] = tot[6:].sum()
    return exact, totals


def rps(probs: np.ndarray, outcome: np.ndarray) -> np.ndarray:
    """Ranked probability score for ordered classes (lower is better)."""
    cum_p = probs.cumsum(axis=1)
    onehot = np.zeros_like(probs)
    onehot[np.arange(len(outcome)), outcome] = 1
    cum_o = onehot.cumsum(axis=1)
    return ((cum_p - cum_o) ** 2).sum(axis=1) / (probs.shape[1] - 1)


def _goal_scores(test: pd.DataFrame, pred: pd.DataFrame, prefix: str) -> pd.DataFrame:
    hg, ag = test["home_goals"].to_numpy(), test["away_goals"].to_numpy()
    total = hg + ag
    exact, totals = _score_probs(pred["exp_home_goals"].to_numpy(), pred["exp_away_goals"].to_numpy(), hg, ag)
    out = {f"{prefix}exact_score_ll": -np.log(np.clip(exact, 1e-15, 1)),
           f"{prefix}total_goals_rps": rps(totals, np.minimum(total, 6).astype(int)),
           f"{prefix}btts_ll": M.binary_log_loss(pred["p_btts"].to_numpy(), ((hg > 0) & (ag > 0)).astype(float))}
    for line, col in ((1.5, "p_over_1_5"), (2.5, "p_over_2_5"), (3.5, "p_over_3_5")):
        out[f"{prefix}ou{str(line).replace('.', '')}_ll"] = M.binary_log_loss(
            pred[col].to_numpy(), (total > line).astype(float))
    return pd.DataFrame(out, index=test.index)


def _ht_scores(test: pd.DataFrame, pred: pd.DataFrame) -> pd.DataFrame:
    ok = test[["ht_home_goals", "ht_away_goals"]].notna().all(axis=1)
    hth, hta = test["ht_home_goals"].fillna(0).to_numpy(), test["ht_away_goals"].fillna(0).to_numpy()
    tot = hth + hta
    y = np.where(hth > hta, 0, np.where(hth == hta, 1, 2))
    out = pd.DataFrame({
        "ht_over05_ll": M.binary_log_loss(pred["p_over_0_5"].to_numpy(), (tot > 0.5).astype(float)),
        "ht_over15_ll": M.binary_log_loss(pred["p_over_1_5"].to_numpy(), (tot > 1.5).astype(float)),
        "ht_1x2_ll": M.per_row_log_loss(pred[PROB_COLS].to_numpy(), y),
    }, index=test.index)
    return out.where(ok)


def _ht_markets(model: PoissonFeatures, test: pd.DataFrame) -> pd.DataFrame:
    x = test[model.features]
    lh, la = model.home_.predict(x), model.away_.predict(x)
    p0 = np.exp(-(lh + la))  # P(no first-half goal) = P(total = 0)
    p1 = p0 * (lh + la)
    pred = pd.DataFrame({"p_over_0_5": 1 - p0, "p_over_1_5": 1 - p0 - p1}, index=test.index)
    goals = np.arange(MAX_GOALS + 1)
    res = []
    for a, b in zip(lh, la, strict=True):
        m = np.outer(poisson.pmf(goals, a), poisson.pmf(goals, b))
        m /= m.sum()
        res.append((np.tril(m, -1).sum(), np.trace(m), np.triu(m, 1).sum()))
    pred[PROB_COLS] = np.array(res)
    return pred


def run_trend_ablation(features: pd.DataFrame, test_seasons: list[int],
                       variants: list[str] | None = None) -> pd.DataFrame:
    data = finished(features)
    first = int(data["season"].min())
    target = data["is_target"].fillna(True).astype(bool)
    variants = variants or ["reference", *TREND_GROUPS, "all"]
    rows = []
    for season in test_seasons:
        train = data[(data["season"] > first) & (data["season"] < season)]
        test = data[(data["season"] == season) & target]
        has_odds = test["mkt_p_home"].notna()
        for variant in variants:
            extra = [] if variant == "reference" else (
                [c for g in TREND_GROUPS for c in group_columns(g)] if variant == "all"
                else group_columns(variant))
            m_odds = logistic(WITH_MARKET_FEATURES + extra, "o").fit(train[train["mkt_p_home"].notna()])
            m_no = logistic(COMPETITION + extra, "n").fit(train)
            probs = m_no.predict(test)[PROB_COLS]
            if has_odds.any():
                probs.loc[has_odds, PROB_COLS] = m_odds.predict(test[has_odds])[PROB_COLS]
            goals = PoissonFeatures("g", GOAL_BASE + extra).fit(train)
            ht = PoissonFeatures("h", GOAL_BASE + extra, targets=("ht_home_goals", "ht_away_goals")).fit(train)
            sc = pd.DataFrame({"match_id": test["match_id"], "competition": test["competition"],
                               "competition_type": test["competition_type"],
                               "ll_1x2": M.per_row_log_loss(probs.to_numpy(), encode_result(test))},
                              index=test.index)
            sc = pd.concat([sc, _goal_scores(test, goals.predict(test), ""),
                            _ht_scores(test, _ht_markets(ht, test))], axis=1)
            rows.append(sc.assign(variant=variant, season=season))
        log.info("Trend ablation season %s done", season)
    return pd.concat(rows, ignore_index=True)


MARKETS = ["ll_1x2", "exact_score_ll", "total_goals_rps", "ou15_ll", "ou25_ll", "ou35_ll",
           "btts_ll", "ht_over05_ll", "ht_over15_ll", "ht_1x2_ll"]


def compare_variants(scores: pd.DataFrame, samples: int = 1000) -> pd.DataFrame:
    ref = scores[scores["variant"] == "reference"].set_index("match_id")
    out = []
    scopes = {"all targets": None, "domestic leagues": "league", "european cups": "continental"}
    for variant in [v for v in scores["variant"].unique() if v != "reference"]:
        cur = scores[scores["variant"] == variant].set_index("match_id")
        for scope, ctype in scopes.items():
            ids = cur.index if ctype is None else cur.index[cur["competition_type"] == ctype]
            for market in MARKETS:
                a, b = cur.loc[ids, market], ref.loc[ids, market]
                ok = a.notna() & b.notna()
                if ok.sum() < 100:
                    continue
                diff = (a[ok] - b[ok]).to_numpy()
                lo, hi = M.bootstrap_mean_ci(diff, samples=samples)
                out.append({"variant": variant, "scope": scope, "market": market, "n": int(ok.sum()),
                            "reference_value": float(b[ok].mean()), "mean_diff": float(diff.mean()),
                            "ci_low": lo, "ci_high": hi,
                            "verdict": "improves" if hi < 0 else "worsens" if lo > 0
                            else "no demonstrated effect"})
    return pd.DataFrame(out)


def store_trend_ablation(engine, comparisons: pd.DataFrame) -> int:
    from datetime import UTC, datetime

    from footintel.db.models import ModelMetric, TrainingRun
    from footintel.db.session import session_scope

    now = datetime.now(UTC)
    with session_scope(engine) as s:
        run = TrainingRun(kind="trend_ablation", started_at=now, finished_at=now, status="success",
                          config={"variants": sorted(comparisons["variant"].unique().tolist())})
        s.add(run)
        s.flush()
        for r in comparisons.itertuples():
            s.add(ModelMetric(training_run_id=run.id, model_name=r.variant, scope="backtest",
                              segment=f"trend_ablation:{r.scope}", metric=r.market,
                              value=r.mean_diff, n=r.n, ci_low=r.ci_low, ci_high=r.ci_high))
        return run.id
