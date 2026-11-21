"""Drift detection.

- Input drift: each model feature, recent target matches against the SAME calendar
  window one year earlier (comparing August-October with a whole season showed
  "drift" in rest days that was only the fixture calendar). Two measures:
  PSI (distribution) and standardised mean difference (SMD). A feature is "strong"
  only when both agree (PSI > 0.25 and |SMD| > 0.25): slow-moving features with a
  tiny spread got a huge PSI for a negligible change in mean.
- Performance drift: log loss of real pre-match predictions against the backtest log
  loss of the same model; reported only from 100 evaluated matches.
"""

from datetime import UTC, datetime, timedelta

import numpy as np
import pandas as pd
from sqlalchemy import Engine, text

from footintel.db.models import ModelMetric, TrainingRun
from footintel.db.session import session_scope

DRIFT_FEATURES = ["elo_diff", "form5_ppg_h", "form5_ppg_a", "gf5_h", "ga5_h", "shots5_for_h",
                  "sot5_for_h", "rest_days_h", "games_14d_h", "comp_goals_mean", "comp_draw_rate",
                  "comp_over25_rate", "mkt_p_home", "mkt_p_draw", "mkt_overround"]
MIN_LIVE = 100


def psi(reference: np.ndarray, recent: np.ndarray, bins: int = 10) -> float:
    reference, recent = reference[~np.isnan(reference)], recent[~np.isnan(recent)]
    if len(reference) < 50 or len(recent) < 30:
        return float("nan")
    edges = np.unique(np.quantile(reference, np.linspace(0, 1, bins + 1)))
    if len(edges) < 3:
        return 0.0
    edges[0], edges[-1] = -np.inf, np.inf
    ref = np.histogram(reference, edges)[0] / len(reference)
    cur = np.histogram(recent, edges)[0] / len(recent)
    ref, cur = np.clip(ref, 1e-4, None), np.clip(cur, 1e-4, None)
    return float(((cur - ref) * np.log(cur / ref)).sum())


def level(psi_value: float, smd: float) -> str:
    if np.isnan(psi_value) or np.isnan(smd):
        return "insufficient_data"
    if psi_value > 0.25 and abs(smd) > 0.25:
        return "strong"
    if psi_value > 0.1 and abs(smd) > 0.1:
        return "moderate"
    return "stable"


def input_drift(features: pd.DataFrame, recent_days: int = 60) -> pd.DataFrame:
    d = features[features["is_target"].fillna(True).astype(bool)].copy()
    d["kickoff_date"] = pd.to_datetime(d["kickoff_date"])
    end = d["kickoff_date"].max()
    start = end - timedelta(days=recent_days)
    recent = d[d["kickoff_date"] > start]
    year = pd.DateOffset(years=1)
    reference = d[(d["kickoff_date"] > start - year) & (d["kickoff_date"] <= end - year)]
    rows = []
    for f in DRIFT_FEATURES:
        if f not in d:
            continue
        ref_v, cur_v = reference[f].to_numpy(float), recent[f].to_numpy(float)
        v = psi(ref_v, cur_v)
        sd = np.nanstd(ref_v)
        smd = float((np.nanmean(cur_v) - np.nanmean(ref_v)) / sd) if sd > 0 else float("nan")
        rows.append({"feature": f, "psi": v, "smd": smd, "level": level(v, smd),
                     "n_reference": int(reference[f].notna().sum()),
                     "n_recent": int(recent[f].notna().sum()),
                     "mean_reference": float(reference[f].mean()), "mean_recent": float(recent[f].mean())})
    return pd.DataFrame(rows)


def performance_drift(engine: Engine) -> dict:
    with engine.connect() as conn:
        live = conn.execute(text("""
            SELECT model_name, count(*) AS n, avg(log_loss) AS log_loss FROM prediction_evaluations
            WHERE predictor_kind = 'model' AND market = '1X2' GROUP BY 1""")).mappings().all()
        backtest = conn.execute(text("""
            SELECT model_name, value FROM model_metrics WHERE metric = 'log_loss' AND segment = 'all'
              AND training_run_id = (SELECT max(id) FROM training_runs WHERE kind = 'backtest'
                                     AND status = 'success')""")).mappings().all()
    ref = {r["model_name"]: r["value"] for r in backtest}
    out = []
    for r in live:
        name = r["model_name"].split(":")[0]
        status = "insufficient_data" if r["n"] < MIN_LIVE else (
            "degraded" if ref.get(name) and r["log_loss"] > ref[name] + 0.03 else "in_line")
        out.append({"model": r["model_name"], "n_live": r["n"], "live_log_loss": float(r["log_loss"]),
                    "backtest_log_loss": ref.get(name), "status": status})
    return {"models": out, "min_live": MIN_LIVE}


def run_drift(engine: Engine, features: pd.DataFrame) -> int:
    table = input_drift(features)
    perf = performance_drift(engine)
    now = datetime.now(UTC)
    with session_scope(engine) as s:
        run = TrainingRun(kind="drift", started_at=now, finished_at=now, status="success",
                          config={"performance": perf})
        s.add(run)
        s.flush()
        for r in table.itertuples():
            for metric, value in (("psi", r.psi), ("smd", r.smd)):
                if not np.isnan(value):
                    s.add(ModelMetric(training_run_id=run.id, model_name="inputs", scope="live",
                                      segment=f"drift:{r.feature}:{r.level}", metric=metric,
                                      value=value, n=r.n_recent))
        return run.id
