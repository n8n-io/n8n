"""Small-sample statistics used by the competition analysis."""

import math

import numpy as np
from scipy.stats import norm

Z95 = 1.959963984540054


def wilson(successes: float, n: int, z: float = Z95) -> tuple[float, float]:
    """Wilson score interval: reliable for small n and rates near 0 or 1."""
    if n == 0:
        return float("nan"), float("nan")
    p = successes / n
    denom = 1 + z * z / n
    centre = (p + z * z / (2 * n)) / denom
    half = z * math.sqrt(p * (1 - p) / n + z * z / (4 * n * n)) / denom
    return centre - half, centre + half


def mean_ci(values: np.ndarray) -> tuple[float, float]:
    """Student t interval: correct width for small windows (e.g. 6 matches)."""
    from scipy.stats import t as student

    values = values[~np.isnan(values)]
    if len(values) < 2:
        return float("nan"), float("nan")
    se = values.std(ddof=1) / math.sqrt(len(values))
    q = float(student.ppf(0.975, len(values) - 1))
    m = values.mean()
    return m - q * se, m + q * se


def residual_test(observed: np.ndarray, expected_p: np.ndarray) -> dict[str, float]:
    """Observed event rate against per-match model probabilities (sum of Bernoullis)."""
    n = len(observed)
    if n == 0:
        return {"n": 0}
    diff = observed.mean() - expected_p.mean()
    se = math.sqrt(float((expected_p * (1 - expected_p)).sum())) / n
    z = diff / se if se > 0 else 0.0
    return {"n": n, "observed": float(observed.mean()), "expected": float(expected_p.mean()),
            "diff": float(diff), "ci_low": float(diff - Z95 * se), "ci_high": float(diff + Z95 * se),
            "p_value": float(2 * norm.sf(abs(z)))}


def two_proportion_test(x1: float, n1: int, x2: float, n2: int) -> dict[str, float]:
    """Rate in sample 1 minus rate in sample 2, with a normal-approximation test."""
    if n1 == 0 or n2 == 0:
        return {"n": 0}
    p1, p2 = x1 / n1, x2 / n2
    pooled = (x1 + x2) / (n1 + n2)
    se0 = math.sqrt(pooled * (1 - pooled) * (1 / n1 + 1 / n2))
    se = math.sqrt(p1 * (1 - p1) / n1 + p2 * (1 - p2) / n2)
    z = (p1 - p2) / se0 if se0 > 0 else 0.0
    return {"n": n1 + n2, "diff": p1 - p2, "ci_low": p1 - p2 - Z95 * se,
            "ci_high": p1 - p2 + Z95 * se, "p_value": float(2 * norm.sf(abs(z)))}


def weighted_slope(x: np.ndarray, y: np.ndarray, w: np.ndarray) -> dict[str, float]:
    """Weighted least-squares slope of y on x (e.g. a rate per season, weights = n)."""
    if len(x) < 4:
        return {"n": int(w.sum())}
    xm, ym = np.average(x, weights=w), np.average(y, weights=w)
    sxx = float((w * (x - xm) ** 2).sum())
    slope = float((w * (x - xm) * (y - ym)).sum() / sxx)
    resid = y - (ym + slope * (x - xm))
    dof = len(x) - 2
    sigma2 = float((w * resid ** 2).sum() / dof)
    se = math.sqrt(sigma2 / sxx)
    z = slope / se if se > 0 else 0.0
    return {"n": int(w.sum()), "diff": slope, "ci_low": slope - Z95 * se,
            "ci_high": slope + Z95 * se, "p_value": float(2 * norm.sf(abs(z)))}


def benjamini_hochberg(p_values: list[float]) -> list[float]:
    """Adjusted p-values controlling the false discovery rate over many tests."""
    p = np.asarray(p_values, dtype=float)
    n = len(p)
    if n == 0:
        return []
    order = np.argsort(p)
    ranked = p[order] * n / np.arange(1, n + 1)
    adjusted = np.minimum.accumulate(ranked[::-1])[::-1]
    out = np.empty(n)
    out[order] = np.minimum(adjusted, 1.0)
    return out.tolist()
