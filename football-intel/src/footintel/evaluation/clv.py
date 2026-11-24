"""Closing line value (CLV): does the model see what the market only prices at kick-off?

Two measures, both on matches with Pinnacle closing odds (the sharpest public price):

1. Paired log loss of the model against the closing market. The closing price knows the
   line-ups and late news: losing to it is expected; the size of the gap is the measure.
2. CLV of the model's picks. A pick is a selection where the model probability times the
   pre-closing price is above 1 + `edge`. Its CLV is that price times the fair closing
   probability, minus 1. A positive mean CLV, with a CI above zero, is the usual sign of a
   real edge; it needs far fewer matches than profit to be read.

The price taken is the pre-closing market average (what a bettor gets at a common
bookmaker), never the market maximum, which overstates what can be had.
"""

import numpy as np
import pandas as pd
from sqlalchemy import Engine, text

from footintel.evaluation import metrics as M
from footintel.models.base import PROB_COLS, encode_result

SELECTIONS = ["H", "D", "A"]
_ODDS_SQL = text("""
SELECT match_id, bookmaker, selection, price, snapshot_label FROM odds_snapshots
WHERE market = '1X2' AND match_id = ANY(:ids)
  AND ((snapshot_label = 'closing' AND bookmaker = 'pinnacle')
    OR (snapshot_label = 'pre_closing' AND bookmaker = 'market_avg'))
""")


def fair(prices: np.ndarray) -> np.ndarray:
    """Proportional margin removal, row by row: (n, 3) prices to (n, 3) probabilities."""
    inv = 1.0 / prices
    return inv / inv.sum(axis=1, keepdims=True)


def load_prices(engine: Engine, match_ids) -> pd.DataFrame:
    """One row per match with taken_H/D/A (pre-closing average) and close_H/D/A (Pinnacle)."""
    ids = [int(x) for x in pd.unique(pd.Series(match_ids))]
    with engine.connect() as conn:
        odds = pd.read_sql(_ODDS_SQL, conn, params={"ids": ids})
    if odds.empty:
        return pd.DataFrame(columns=["match_id"] + [f"{k}_{s}" for k in ("taken", "close") for s in SELECTIONS])
    odds["kind"] = np.where(odds["snapshot_label"] == "closing", "close", "taken")
    wide = odds.pivot_table(index="match_id", columns=["kind", "selection"], values="price", aggfunc="first")
    wide.columns = [f"{k}_{s}" for k, s in wide.columns]
    return wide.reset_index()


def clv_table(preds: pd.DataFrame, prices: pd.DataFrame, edge: float = 0.03,
              samples: int = 1000) -> pd.DataFrame:
    """One row per model: log loss against the closing market, then CLV of its picks."""
    cols = [f"{k}_{s}" for k in ("taken", "close") for s in SELECTIONS]
    rows = []
    for model, frame in preds.groupby("model"):
        f = frame.dropna(subset=PROB_COLS).merge(prices, on="match_id").dropna(subset=cols)
        f = f[(f[cols] > 1.0).all(axis=1)]
        if f.empty:
            continue
        p = f[PROB_COLS].to_numpy(float)
        taken = f[[f"taken_{s}" for s in SELECTIONS]].to_numpy(float)
        close = fair(f[[f"close_{s}" for s in SELECTIONS]].to_numpy(float))
        row = {"model": model, "n_matches": int(len(f))}
        if f["home_goals"].notna().all():
            y = encode_result(f)
            diff = M.per_row_log_loss(p, y) - M.per_row_log_loss(close, y)
            lo, hi = M.bootstrap_mean_ci(diff, samples=samples)
            row.update({"vs_close_mean": float(diff.mean()), "vs_close_ci_low": lo, "vs_close_ci_high": hi})
        picked = p * taken - 1 > edge
        clv = (taken * close - 1)[picked]
        row["n_picks"] = int(picked.sum())
        if len(clv):
            lo, hi = M.bootstrap_mean_ci(clv, samples=samples)
            beat = (close > fair(taken))[picked]
            row.update({"clv_mean": float(clv.mean()), "clv_ci_low": lo, "clv_ci_high": hi,
                        "share_line_moved_our_way": float(beat.mean())})
        rows.append(row)
    return pd.DataFrame(rows)
