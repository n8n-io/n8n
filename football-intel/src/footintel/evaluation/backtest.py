"""Chronological walk-forward backtest.

For each test season S: train on seasons [first_season + 1, S - 1], predict S.
The first season of the dataset is a warm-up: its features (Elo, form) start
from nothing, so it is never used for training or testing.
"""

import logging
from dataclasses import dataclass
from datetime import UTC, datetime

import numpy as np
import pandas as pd
from sqlalchemy import Engine

from footintel.db.models import ModelMetric, TrainingRun
from footintel.db.session import session_scope
from footintel.evaluation import metrics as M
from footintel.models.base import PROB_COLS, encode_result
from footintel.models.zoo import build

log = logging.getLogger(__name__)


@dataclass
class BacktestResult:
    predictions: pd.DataFrame  # one row per (model, match)
    summary: pd.DataFrame  # one row per (model, segment)
    comparisons: pd.DataFrame  # paired log-loss differences vs references
    run_id: int | None = None


def finished(df: pd.DataFrame) -> pd.DataFrame:
    return df[df["home_goals"].notna() & df["away_goals"].notna()]


def walk_forward(features: pd.DataFrame, model_names: list[str],
                 test_seasons: list[int]) -> pd.DataFrame:
    """Train on every finished match before season S (context leagues included);
    test only on target competitions of season S."""
    data = finished(features)
    first = int(data["season"].min())
    target = data["is_target"].fillna(True).astype(bool) if "is_target" in data else True
    out = []
    for season in test_seasons:
        train = data[(data["season"] > first) & (data["season"] < season)]
        test = data[(data["season"] == season) & target]
        if train.empty or test.empty:
            log.warning("Skip season %s: train=%d test=%d", season, len(train), len(test))
            continue
        for name in model_names:
            model = build(name).fit(train)
            pred = model.predict(test)
            frame = test[["match_id", "competition", "season", "kickoff_date",
                          "home_goals", "away_goals"]].copy()
            frame["model"] = name
            frame = pd.concat([frame, pred], axis=1)
            out.append(frame)
        log.info("Season %s done (train=%d, test=%d)", season, len(train), len(test))
    if not out:
        raise ValueError("No backtest fold had both training and test data")
    return pd.concat(out, ignore_index=True)


def _rows_metrics(frame: pd.DataFrame) -> dict[str, float]:
    valid = frame.dropna(subset=PROB_COLS)
    if valid.empty:
        return {}
    y = encode_result(valid)
    res = M.summarize_1x2(valid[PROB_COLS].to_numpy(), y)
    if "p_over_2_5" in valid and valid["p_over_2_5"].notna().all():
        over = ((valid["home_goals"] + valid["away_goals"]) > 2.5).astype(float).to_numpy()
        res["ou25_log_loss"] = float(M.binary_log_loss(valid["p_over_2_5"].to_numpy(), over).mean())
        res["ou25_brier"] = float(M.binary_brier(valid["p_over_2_5"].to_numpy(), over).mean())
        btts = ((valid["home_goals"] > 0) & (valid["away_goals"] > 0)).astype(float).to_numpy()
        res["btts_log_loss"] = float(M.binary_log_loss(valid["p_btts"].to_numpy(), btts).mean())
    return res


def summarize(preds: pd.DataFrame) -> pd.DataFrame:
    rows = []
    for model, frame in preds.groupby("model"):
        segments = [("all", frame)]
        segments += [(f"competition:{c}", f) for c, f in frame.groupby("competition")]
        segments += [(f"season:{s}", f) for s, f in frame.groupby("season")]
        for seg, f in segments:
            res = _rows_metrics(f)
            if res:
                rows.append({"model": model, "segment": seg, **res})
    return pd.DataFrame(rows)


def paired_logloss(preds: pd.DataFrame, candidate: str, reference: str,
                   samples: int = 1000) -> dict[str, float]:
    """Mean of (candidate - reference) log loss on matches both models predicted."""
    a = preds[preds["model"] == candidate].dropna(subset=PROB_COLS).set_index("match_id")
    b = preds[preds["model"] == reference].dropna(subset=PROB_COLS).set_index("match_id")
    common = a.index.intersection(b.index)
    if len(common) == 0:
        return {"candidate": candidate, "reference": reference, "n": 0}
    a, b = a.loc[common], b.loc[common]
    y = encode_result(a)
    diff = (M.per_row_log_loss(a[PROB_COLS].to_numpy(), y)
            - M.per_row_log_loss(b[PROB_COLS].to_numpy(), y))
    lo, hi = M.bootstrap_mean_ci(diff, samples=samples)
    return {"candidate": candidate, "reference": reference, "n": int(len(common)),
            "mean_diff": float(diff.mean()), "ci_low": lo, "ci_high": hi}


def compare_all(preds: pd.DataFrame, references=("naive_frequency", "market_implied"),
                samples: int = 1000) -> pd.DataFrame:
    models = sorted(preds["model"].unique())
    rows = [paired_logloss(preds, m, r, samples) for m in models for r in references
            if m != r and r in models]
    return pd.DataFrame(rows)


def run_backtest(engine: Engine, features: pd.DataFrame, model_names: list[str],
                 test_seasons: list[int], bootstrap_samples: int = 1000) -> BacktestResult:
    started = datetime.now(UTC)
    config = {"models": model_names, "test_seasons": test_seasons}
    with session_scope(engine) as s:
        run = TrainingRun(kind="backtest", started_at=started, status="running", config=config)
        s.add(run)
        s.flush()
        run_id = run.id
    try:
        preds = walk_forward(features, model_names, test_seasons)
        summary = summarize(preds)
        comparisons = compare_all(preds, samples=bootstrap_samples)
    except Exception as exc:
        with session_scope(engine) as s:
            r = s.get(TrainingRun, run_id)
            r.status, r.error, r.finished_at = "failed", str(exc), datetime.now(UTC)
        raise
    with session_scope(engine) as s:
        r = s.get(TrainingRun, run_id)
        r.status, r.finished_at = "success", datetime.now(UTC)
        r.n_matches = int(preds["match_id"].nunique())
        r.data_until = pd.to_datetime(preds["kickoff_date"]).max().date()
        for row in summary.itertuples(index=False):
            for metric in ("log_loss", "brier", "accuracy", "balanced_accuracy", "ece",
                           "ou25_log_loss", "ou25_brier", "btts_log_loss"):
                value = getattr(row, metric, np.nan)
                if value is not None and not np.isnan(value):
                    s.add(ModelMetric(training_run_id=run_id, model_name=row.model,
                                      scope="backtest", segment=row.segment, metric=metric,
                                      value=float(value), n=int(row.n)))
        for row in comparisons.itertuples(index=False):
            if row.n:
                s.add(ModelMetric(training_run_id=run_id, model_name=row.candidate,
                                  scope="backtest", segment=f"vs:{row.reference}",
                                  metric="log_loss_diff", value=row.mean_diff, n=row.n,
                                  ci_low=row.ci_low, ci_high=row.ci_high))
    return BacktestResult(preds, summary, comparisons, run_id)
