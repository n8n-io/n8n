"""Hybrid human + model 1X2 probabilities, evaluated in time order.

A pick is not a probability (D12). The hybrid learns how much the user's pick and
confidence should move the model's pre-match probabilities: a multinomial logistic
regression on log model probabilities plus pick x confidence. Every hybrid
probability is out of sample: each block of picks is predicted by a fit on the
earlier blocks only. The hybrid is adopted only under the promotion rule fixed in
advance (D9); below MIN_PICKS the evaluation does not run.
"""

import logging
from datetime import UTC, datetime

import numpy as np
import pandas as pd
from sklearn.linear_model import LogisticRegression
from sqlalchemy import Engine, text

from footintel.config import PromotionCriteria
from footintel.db.models import ModelMetric, TrainingRun
from footintel.db.session import session_scope
from footintel.evaluation.metrics import bootstrap_mean_ci, per_row_log_loss

log = logging.getLogger(__name__)

MIN_PICKS = 200
MIN_TRAIN = 100
N_BLOCKS = 5
LABELS = ("H", "D", "A")


def design(df: pd.DataFrame) -> np.ndarray:
    probs = df[["p_home", "p_draw", "p_away"]].to_numpy(float).clip(1e-6, 1)
    conf = df["confidence"].to_numpy(float) / 5.0
    picks = np.stack([(df["pick"] == k).to_numpy(float) * conf for k in LABELS], axis=1)
    return np.hstack([np.log(probs), picks])


def out_of_sample(df: pd.DataFrame, min_train: int = MIN_TRAIN, n_blocks: int = N_BLOCKS) -> pd.DataFrame:
    """Expanding-window predictions. Rows before `min_train` are never scored."""
    df = df.sort_values("kickoff").reset_index(drop=True)
    y = df["result"].map({k: i for i, k in enumerate(LABELS)}).to_numpy()
    edges = np.linspace(min_train, len(df), n_blocks + 1).astype(int)
    parts = []
    for start, end in zip(edges[:-1], edges[1:], strict=True):
        if end <= start:
            continue
        train = slice(0, start)
        if len(set(y[train])) < 3:
            continue
        clf = LogisticRegression(C=1.0, max_iter=1000).fit(design(df.iloc[train]), y[train])
        p = clf.predict_proba(design(df.iloc[start:end]))
        block = df.iloc[start:end].copy()
        block[["h_home", "h_draw", "h_away"]] = p
        parts.append(block)
    return pd.concat(parts) if parts else pd.DataFrame()


def evaluate(df: pd.DataFrame, criteria: PromotionCriteria | None = None) -> dict:
    """Compare the hybrid with the model alone on the same out-of-sample picks."""
    criteria = criteria or PromotionCriteria()
    if len(df) < MIN_PICKS:
        return {"status": "insufficient_data", "n_picks": len(df), "min_picks": MIN_PICKS}
    oos = out_of_sample(df)
    if oos.empty:
        return {"status": "insufficient_data", "n_picks": len(df), "min_picks": MIN_PICKS,
                "reason": "the training picks do not contain all three results"}
    y = oos["result"].map({k: i for i, k in enumerate(LABELS)}).to_numpy()
    ll_model = per_row_log_loss(oos[["p_home", "p_draw", "p_away"]].to_numpy(float), y)
    ll_hybrid = per_row_log_loss(oos[["h_home", "h_draw", "h_away"]].to_numpy(float), y)
    diff = ll_hybrid - ll_model
    lo, hi = bootstrap_mean_ci(diff, samples=criteria.bootstrap_samples)
    gain = float(diff.mean())
    adopt = (len(oos) >= criteria.min_test_matches and gain <= -criteria.min_logloss_improvement
             and (hi < 0 or not criteria.require_ci_below_zero))
    if adopt:
        verdict = "adopt"
    elif len(oos) < criteria.min_test_matches:
        verdict = "too_few_test_picks"
    else:
        verdict = "no_reliable_gain"
    pick_acc = float((oos["pick"].to_numpy() == oos["result"].to_numpy()).mean())
    return {"status": "evaluated", "verdict": verdict, "n_picks": len(df), "n_test": len(oos),
            "logloss_model": float(ll_model.mean()), "logloss_hybrid": float(ll_hybrid.mean()),
            "diff": gain, "ci_low": lo, "ci_high": hi, "pick_accuracy": pick_acc}


def load_pairs(engine: Engine, user_label: str = "me") -> pd.DataFrame:
    """Latest pre-kick-off pick per match, with the latest pre-kick-off model prediction."""
    sql = text("""
        WITH picks AS (
          SELECT DISTINCT ON (up.match_id) up.match_id, up.pick, up.confidence, up.submitted_at
          FROM user_predictions up JOIN matches m ON m.id = up.match_id
          WHERE up.user_label = :u
            AND up.submitted_at < COALESCE(m.kickoff_utc, m.kickoff_date::timestamptz)
          ORDER BY up.match_id, up.submitted_at DESC)
        SELECT pk.match_id, pk.pick, pk.confidence,
               COALESCE(m.kickoff_utc, m.kickoff_date::timestamptz) AS kickoff,
               CASE WHEN o.home_goals > o.away_goals THEN 'H'
                    WHEN o.home_goals = o.away_goals THEN 'D' ELSE 'A' END AS result,
               p.p_home, p.p_draw, p.p_away
        FROM picks pk JOIN matches m ON m.id = pk.match_id
        JOIN match_outcomes o ON o.match_id = m.id AND o.home_goals IS NOT NULL
        JOIN LATERAL (SELECT p.p_home, p.p_draw, p.p_away FROM predictions p
                      WHERE p.match_id = m.id
                        AND p.predicted_at < COALESCE(m.kickoff_utc, m.kickoff_date::timestamptz)
                      ORDER BY p.predicted_at DESC LIMIT 1) p ON TRUE
        ORDER BY kickoff""")
    with engine.connect() as conn:
        return pd.read_sql(sql, conn, params={"u": user_label})


def run_hybrid(engine: Engine, user_label: str = "me",
               criteria: PromotionCriteria | None = None) -> dict:
    """Evaluate and store the result. Nothing changes in the active model."""
    result = evaluate(load_pairs(engine, user_label), criteria)
    now = datetime.now(UTC)
    with session_scope(engine) as s:
        run = TrainingRun(kind="hybrid", started_at=now, finished_at=now, status="success",
                          config={"user_label": user_label, **result}, n_matches=result["n_picks"])
        s.add(run)
        s.flush()
        if result["status"] == "evaluated":
            for name, metric in (("model", "logloss_model"), ("hybrid", "logloss_hybrid")):
                s.add(ModelMetric(training_run_id=run.id, model_name=name, scope="live",
                                  segment=f"hybrid:{user_label}", metric="log_loss",
                                  value=result[metric], n=result["n_test"]))
            s.add(ModelMetric(training_run_id=run.id, model_name="hybrid", scope="live",
                              segment=f"hybrid:{user_label}", metric="log_loss_diff",
                              value=result["diff"], n=result["n_test"],
                              ci_low=result["ci_low"], ci_high=result["ci_high"]))
        result["training_run_id"] = run.id
    log.info("Hybrid %s: %s", user_label, result)
    return result


def latest(engine: Engine, user_label: str = "me") -> dict | None:
    with engine.connect() as conn:
        row = conn.execute(text("""SELECT id, finished_at, config FROM training_runs
                                   WHERE kind = 'hybrid' AND config->>'user_label' = :u
                                   ORDER BY id DESC LIMIT 1"""), {"u": user_label}).first()
    if row is None:
        return None
    return {"training_run_id": row.id, "computed_at": row.finished_at.isoformat(), **row.config}
