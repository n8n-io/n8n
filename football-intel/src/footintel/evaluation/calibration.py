"""Store calibration tables of walk-forward predictions, for the performance dashboard."""

from datetime import UTC, datetime

import pandas as pd
from sqlalchemy import Engine

from footintel.analysis.stats import wilson
from footintel.db.models import ModelMetric, TrainingRun
from footintel.db.session import session_scope
from footintel.evaluation import metrics as M
from footintel.evaluation.backtest import walk_forward

EVENTS = {
    "1X2:home": ("p_home", lambda d: d.home_goals > d.away_goals),
    "1X2:draw": ("p_draw", lambda d: d.home_goals == d.away_goals),
    "1X2:away": ("p_away", lambda d: d.home_goals < d.away_goals),
    "OU2.5:over": ("p_over_2_5", lambda d: d.home_goals + d.away_goals > 2.5),
    "BTTS:yes": ("p_btts", lambda d: (d.home_goals > 0) & (d.away_goals > 0)),
}


def store_calibration(engine: Engine, features: pd.DataFrame, models: list[str],
                      seasons: list[int], bins: int = 10) -> int:
    preds = walk_forward(features, models, seasons)
    now = datetime.now(UTC)
    with session_scope(engine) as s:
        run = TrainingRun(kind="calibration", started_at=now, finished_at=now, status="success",
                          config={"models": models, "seasons": seasons, "bins": bins})
        s.add(run)
        s.flush()
        for model, frame in preds.groupby("model"):
            scopes = {"all": frame,
                      "domestic": frame[~frame["competition"].str.startswith("UEFA")],
                      "european": frame[frame["competition"].str.startswith("UEFA")]}
            for scope, f in scopes.items():
                for event, (col, fn) in EVENTS.items():
                    if col not in f or f[col].isna().all():
                        continue
                    g = f.dropna(subset=[col])
                    if len(g) < 100:
                        continue
                    table = M.calibration_table(g[col].to_numpy(), fn(g).astype(float).to_numpy(), bins)
                    for i, row in enumerate(table.itertuples()):
                        lo, hi = wilson(row.observed_rate * row.n, row.n)
                        s.add(ModelMetric(training_run_id=run.id, model_name=model, scope="backtest",
                                          segment=f"calibration:{scope}:{event}:{i}",
                                          metric=f"{row.mean_predicted:.6f}", value=row.observed_rate,
                                          n=row.n, ci_low=lo, ci_high=hi))
                    ece = M.expected_calibration_error(g[col].to_numpy(), fn(g).astype(float).to_numpy(), bins)
                    s.add(ModelMetric(training_run_id=run.id, model_name=model, scope="backtest",
                                      segment=f"calibration:{scope}:{event}", metric="ece",
                                      value=ece, n=len(g)))
        return run.id
