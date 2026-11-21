"""Closing line value study (D54): how far the model is from the closing market, and why.

Run from football-intel/: .venv/bin/python scripts/clv_study.py
Walk-forward on the last five complete seasons; every prediction is out of sample.
"""

import sys

import numpy as np
import pandas as pd
from sqlalchemy import text

sys.path.insert(0, "src")
from footintel.db.session import get_engine  # noqa: E402
from footintel.evaluation.backtest import walk_forward  # noqa: E402
from footintel.evaluation.clv import SELECTIONS, fair, load_prices  # noqa: E402
from footintel.evaluation.metrics import bootstrap_mean_ci  # noqa: E402
from footintel.features.builder import build_features  # noqa: E402
from footintel.features.dataset import load_matches  # noqa: E402
from footintel.models.base import PROB_COLS  # noqa: E402

engine = get_engine()
feats = build_features(load_matches(engine))
last = int(feats.loc[feats["home_goals"].notna(), "season"].max())
preds = walk_forward(feats, ["routed_competition", "routed_competition_blend"], list(range(last - 5, last)))
prices = load_prices(engine, preds["match_id"])
with engine.connect() as c:
    best = pd.read_sql(text("""SELECT match_id, selection, price FROM odds_snapshots
        WHERE market = '1X2' AND bookmaker = 'market_max' AND snapshot_label = 'pre_closing'
          AND match_id = ANY(:ids)"""), c, params={"ids": [int(x) for x in prices.match_id]})
best = best.pivot_table(index="match_id", columns="selection", values="price").add_prefix("best_").reset_index()


def ci(x):
    lo, hi = bootstrap_mean_ci(np.asarray(x), samples=1000)
    return f"{np.mean(x):+.4f} [{lo:+.4f} ; {hi:+.4f}] n={len(x)}"


for model, frame in preds.groupby("model"):
    f = frame.dropna(subset=PROB_COLS).merge(prices, on="match_id").merge(best, on="match_id").dropna()
    p = f[PROB_COLS].to_numpy(float)
    taken = f[[f"taken_{s}" for s in SELECTIONS]].to_numpy(float)
    top = f[[f"best_{s}" for s in SELECTIONS]].to_numpy(float)
    close = fair(f[[f"close_{s}" for s in SELECTIONS]].to_numpy(float))
    pre = fair(taken)
    print(f"\n== {model}: {len(f)} matches")
    # Baseline: how often the fair line moves toward a selection the model rates above the
    # pre-closing fair price, against how often it moves toward any selection at all.
    above = p > pre
    up = close > pre
    print(f"line shortens on a selection the model rates above the market: {up[above].mean():.1%} "
          f"(all selections: {up.mean():.1%})")
    for edge in (0.0, 0.03, 0.05, 0.10):
        for label, price in (("average price", taken), ("best price", top)):
            pick = p * price - 1 > edge
            if pick.sum():
                print(f"edge > {edge:>4.0%}, {label:>13}: CLV {ci((price * close - 1)[pick])}")

# Baseline without any model: the de-margined pre-closing market itself as the probability.
# The market maximum is above the fair price on many selections, so this baseline alone can
# show a positive CLV; the model only adds value where it beats this baseline.
f = preds[preds.model == "routed_competition"].dropna(subset=PROB_COLS).merge(prices, on="match_id").merge(best, on="match_id").dropna()
taken = f[[f"taken_{s}" for s in SELECTIONS]].to_numpy(float)
top = f[[f"best_{s}" for s in SELECTIONS]].to_numpy(float)
close = fair(f[[f"close_{s}" for s in SELECTIONS]].to_numpy(float))
pre = fair(taken)
print("\n== baseline: market fair price as the probability (no model)")
for edge in (0.0, 0.03, 0.05, 0.10):
    pick = pre * top - 1 > edge
    if pick.sum():
        print(f"edge > {edge:>4.0%}, best price: CLV {ci((top * close - 1)[pick])}")
