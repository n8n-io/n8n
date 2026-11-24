"""Where is the model closest to, or ahead of, the market? One row per competition.

Run from football-intel/: python scripts/competition_edge.py
Walk-forward on the last five complete seasons plus the current one (all out of sample).
Paired log loss model minus market (negative = model better), against the pre-closing
market average (a common price) and the Pinnacle close; CLV of the model's picks at the
pre-closing average, edge 3 %.
"""

import sys

import numpy as np
import pandas as pd

sys.path.insert(0, "src")
from footintel.db.session import get_engine  # noqa: E402
from footintel.evaluation.backtest import walk_forward  # noqa: E402
from footintel.evaluation.clv import SELECTIONS, fair, load_prices  # noqa: E402
from footintel.evaluation.metrics import bootstrap_mean_ci  # noqa: E402
from footintel.features.builder import build_features  # noqa: E402
from footintel.features.dataset import load_matches  # noqa: E402
from footintel.models.base import PROB_COLS, encode_result  # noqa: E402

EDGE = 0.03
engine = get_engine()
feats = build_features(load_matches(engine))
last = int(feats.loc[feats["home_goals"].notna(), "season"].max())
preds = walk_forward(feats, ["routed_competition"], list(range(last - 5, last + 1)))
prices = load_prices(engine, preds["match_id"])
goals = feats[["match_id", "home_goals", "away_goals"]].drop_duplicates("match_id")
f = preds.dropna(subset=PROB_COLS).drop(columns=["home_goals", "away_goals"], errors="ignore")
f = f.merge(goals, on="match_id").merge(prices, on="match_id", how="left")


def ll(p: np.ndarray, y: np.ndarray) -> np.ndarray:
    return -np.log(np.clip(p[np.arange(len(y)), y], 1e-12, 1))


def ci(x: np.ndarray) -> str:
    if len(x) < 30:
        return f"{np.mean(x):+.4f} (n={len(x)})"
    lo, hi = bootstrap_mean_ci(x, samples=1000)
    return f"{np.mean(x):+.4f} [{lo:+.4f} ; {hi:+.4f}]"


rows = []
for code, g in f.groupby("competition"):
    y = encode_result(g)
    p = g[PROB_COLS].to_numpy()
    row = {"competition": code, "n": len(g)}
    for kind in ("taken", "close"):
        cols = [f"{kind}_{s}" for s in SELECTIONS]
        ok = g[cols].notna().all(axis=1).to_numpy() & (g[cols] > 1).all(axis=1).to_numpy()
        if ok.sum() == 0:
            row[kind] = "—"
            continue
        m = fair(g.loc[ok, cols].to_numpy())
        row[f"{kind}"] = ci(ll(p[ok], y[ok]) - ll(m, y[ok])) + f" n={ok.sum()}"
    cols = [f"taken_{s}" for s in SELECTIONS]
    ok = g[cols].notna().all(axis=1).to_numpy() & g[[f"close_{s}" for s in SELECTIONS]].notna().all(axis=1).to_numpy()
    if ok.sum():
        taken = g.loc[ok, cols].to_numpy()
        close = fair(g.loc[ok, [f"close_{s}" for s in SELECTIONS]].to_numpy())
        pick = p[ok] * taken > 1 + EDGE
        clv = (taken * close - 1)[pick]
        row["picks"] = int(pick.sum())
        row["clv"] = ci(clv) if len(clv) else "—"
    rows.append(row)

pd.set_option("display.width", 220)
print(pd.DataFrame(rows).sort_values("n", ascending=False).to_string(index=False))
