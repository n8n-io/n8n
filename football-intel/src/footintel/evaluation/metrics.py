"""Scoring rules and calibration for probabilistic predictions."""

import numpy as np
import pandas as pd

EPS = 1e-15


def per_row_log_loss(probs: np.ndarray, y: np.ndarray) -> np.ndarray:
    """probs: (n, k) rows summing to 1; y: class index per row."""
    p = np.clip(probs[np.arange(len(y)), y], EPS, 1.0)
    return -np.log(p)


def per_row_brier(probs: np.ndarray, y: np.ndarray) -> np.ndarray:
    """Multiclass Brier score: sum over classes of the squared error (range 0..2)."""
    onehot = np.zeros_like(probs)
    onehot[np.arange(len(y)), y] = 1.0
    return ((probs - onehot) ** 2).sum(axis=1)


def binary_log_loss(p: np.ndarray, y: np.ndarray) -> np.ndarray:
    p = np.clip(p, EPS, 1 - EPS)
    return -(y * np.log(p) + (1 - y) * np.log(1 - p))


def binary_brier(p: np.ndarray, y: np.ndarray) -> np.ndarray:
    return (p - y) ** 2


def accuracy(probs: np.ndarray, y: np.ndarray) -> float:
    return float((probs.argmax(axis=1) == y).mean())


def balanced_accuracy(probs: np.ndarray, y: np.ndarray, k: int = 3) -> float:
    pred = probs.argmax(axis=1)
    recalls = [(pred[y == c] == c).mean() for c in range(k) if (y == c).any()]
    return float(np.mean(recalls))


def confusion(probs: np.ndarray, y: np.ndarray, labels=("H", "D", "A")) -> pd.DataFrame:
    pred = probs.argmax(axis=1)
    m = np.zeros((len(labels), len(labels)), dtype=int)
    for t, p in zip(y, pred, strict=True):
        m[t, p] += 1
    return pd.DataFrame(m, index=[f"true_{x}" for x in labels], columns=[f"pred_{x}" for x in labels])


def calibration_table(p: np.ndarray, y: np.ndarray, bins: int = 10) -> pd.DataFrame:
    """Reliability table for one binary event (e.g. 'home win')."""
    edges = np.linspace(0, 1, bins + 1)
    idx = np.clip(np.digitize(p, edges) - 1, 0, bins - 1)
    rows = []
    for b in range(bins):
        mask = idx == b
        if mask.any():
            rows.append({"bin_low": edges[b], "bin_high": edges[b + 1], "n": int(mask.sum()),
                         "mean_predicted": float(p[mask].mean()),
                         "observed_rate": float(y[mask].mean())})
    return pd.DataFrame(rows)


def expected_calibration_error(p: np.ndarray, y: np.ndarray, bins: int = 10) -> float:
    table = calibration_table(p, y, bins)
    if table.empty:
        return float("nan")
    weights = table["n"] / table["n"].sum()
    return float((weights * (table["mean_predicted"] - table["observed_rate"]).abs()).sum())


def bootstrap_mean_ci(values: np.ndarray, samples: int = 1000, alpha: float = 0.05,
                      seed: int = 0) -> tuple[float, float]:
    """Percentile CI of the mean. For paired comparisons, pass per-row differences."""
    if len(values) == 0:
        return float("nan"), float("nan")
    rng = np.random.default_rng(seed)
    idx = rng.integers(0, len(values), size=(samples, len(values)))
    means = values[idx].mean(axis=1)
    return float(np.quantile(means, alpha / 2)), float(np.quantile(means, 1 - alpha / 2))


def summarize_1x2(probs: np.ndarray, y: np.ndarray) -> dict[str, float]:
    ll, br = per_row_log_loss(probs, y), per_row_brier(probs, y)
    ece = np.mean([expected_calibration_error(probs[:, c], (y == c).astype(float)) for c in range(3)])
    return {"log_loss": float(ll.mean()), "brier": float(br.mean()),
            "accuracy": accuracy(probs, y), "balanced_accuracy": balanced_accuracy(probs, y),
            "ece": float(ece), "n": int(len(y))}
