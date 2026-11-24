#!/usr/bin/env python3
"""
hypothesis_tester.py — Z-test (proportions), Welch's t-test (means), Chi-square (categorical).

All math uses Python stdlib (math module only). No scipy, numpy, or pandas required.

Usage:
    python3 hypothesis_tester.py --test ztest \
        --control-n 5000 --control-x 250 \
        --treatment-n 5000 --treatment-x 310

    python3 hypothesis_tester.py --test ttest \
        --control-mean 42.3 --control-std 18.1 --control-n 800 \
        --treatment-mean 46.1 --treatment-std 19.4 --treatment-n 820

    python3 hypothesis_tester.py --test chi2 \
        --observed "120,80,50" --expected "100,100,50"
"""

import argparse
import json
import math
import sys


# ---------------------------------------------------------------------------
# Normal / t-distribution approximations (stdlib only)
# ---------------------------------------------------------------------------

def normal_cdf(z: float) -> float:
    """Cumulative distribution function of standard normal using math.erfc."""
    return 0.5 * math.erfc(-z / math.sqrt(2))


def normal_ppf(p: float) -> float:
    """Percent-point function (inverse CDF) of standard normal via bisection."""
    lo, hi = -10.0, 10.0
    for _ in range(100):
        mid = (lo + hi) / 2
        if normal_cdf(mid) < p:
            lo = mid
        else:
            hi = mid
    return (lo + hi) / 2


def t_cdf(t: float, df: float) -> float:
    """
    CDF of t-distribution via regularized incomplete beta function approximation.
    Uses the relation: P(T ≤ t) = I_{x}(df/2, 1/2) where x = df/(df+t^2).
    Falls back to normal CDF for large df (> 1000).
    """
    if df > 1000:
        return normal_cdf(t)
    x = df / (df + t * t)
    # Regularized incomplete beta via continued fraction (Lentz)
    ib = _regularized_incomplete_beta(x, df / 2, 0.5)
    p = ib / 2
    return p if t <= 0 else 1 - p


def _regularized_incomplete_beta(x: float, a: float, b: float) -> float:
    """Regularized incomplete beta I_x(a,b) via continued fraction expansion."""
    if x < 0 or x > 1:
        return 0.0
    if x == 0:
        return 0.0
    if x == 1:
        return 1.0
    lbeta = math.lgamma(a) + math.lgamma(b) - math.lgamma(a + b)
    front = math.exp(math.log(x) * a + math.log(1 - x) * b - lbeta) / a
    # Use symmetry for better convergence
    if x > (a + 1) / (a + b + 2):
        return 1 - _regularized_incomplete_beta(1 - x, b, a)
    # Lentz continued fraction
    TINY = 1e-30
    f = TINY
    C = f
    D = 0.0
    for m in range(200):
        for s in (0, 1):
            if m == 0 and s == 0:
                num = 1.0
            elif s == 0:
                num = m * (b - m) * x / ((a + 2 * m - 1) * (a + 2 * m))
            else:
                num = -(a + m) * (a + b + m) * x / ((a + 2 * m) * (a + 2 * m + 1))
            D = 1 + num * D
            if abs(D) < TINY:
                D = TINY
            D = 1 / D
            C = 1 + num / C
            if abs(C) < TINY:
                C = TINY
            f *= C * D
            if abs(C * D - 1) < 1e-10:
                break
    return front * f


def two_tail_p_normal(z: float) -> float:
    return 2 * (1 - normal_cdf(abs(z)))


def two_tail_p_t(t: float, df: float) -> float:
    return 2 * (1 - t_cdf(abs(t), df))


# ---------------------------------------------------------------------------
# Effect sizes
# ---------------------------------------------------------------------------

def cohens_h(p1: float, p2: float) -> float:
    """Cohen's h for two proportions."""
    return 2 * math.asin(math.sqrt(p1)) - 2 * math.asin(math.sqrt(p2))


def cohens_d(mean1: float, std1: float, n1: int, mean2: float, std2: float, n2: int) -> float:
    """Cohen's d using pooled standard deviation."""
    pooled = math.sqrt(((n1 - 1) * std1 ** 2 + (n2 - 1) * std2 ** 2) / (n1 + n2 - 2))
    return (mean1 - mean2) / pooled if pooled else 0.0


def cramers_v(chi2: float, n: int, k: int) -> float:
    """Cramér's V effect size for chi-square test."""
    return math.sqrt(chi2 / (n * (k - 1))) if n and k > 1 else 0.0


def effect_label(val: float, metric: str) -> str:
    thresholds = {"h": [0.2, 0.5, 0.8], "d": [0.2, 0.5, 0.8], "v": [0.1, 0.3, 0.5]}
    t = thresholds.get(metric, [0.2, 0.5, 0.8])
    v = abs(val)
    if v < t[0]:
        return "negligible"
    if v < t[1]:
        return "small"
    if v < t[2]:
        return "medium"
    return "large"


# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------

def ztest_proportions(cn: int, cx: int, tn: int, tx: int, alpha: float) -> dict:
    """Two-proportion Z-test."""
    if cn <= 0 or tn <= 0:
        return {"error": "Sample sizes must be positive."}

    p_c = cx / cn
    p_t = tx / tn
    p_pool = (cx + tx) / (cn + tn)

    se = math.sqrt(p_pool * (1 - p_pool) * (1 / cn + 1 / tn))
    if se == 0:
        return {"error": "Standard error is zero — check input values."}

    z = (p_t - p_c) / se
    p_value = two_tail_p_normal(z)

    # Confidence interval for difference (unpooled SE)
    se_diff = math.sqrt(p_c * (1 - p_c) / cn + p_t * (1 - p_t) / tn)
    z_crit = normal_ppf(1 - alpha / 2)
    diff = p_t - p_c
    ci_lo = diff - z_crit * se_diff
    ci_hi = diff + z_crit * se_diff

    h = cohens_h(p_t, p_c)
    lift = (p_t - p_c) / p_c * 100 if p_c else 0

    return {
        "test": "Two-proportion Z-test",
        "control": {"n": cn, "conversions": cx, "rate": round(p_c, 6)},
        "treatment": {"n": tn, "conversions": tx, "rate": round(p_t, 6)},
        "difference": round(diff, 6),
        "relative_lift_pct": round(lift, 2),
        "z_statistic": round(z, 4),
        "p_value": round(p_value, 6),
        "significant": p_value < alpha,
        "alpha": alpha,
        "confidence_interval": {
            "level": f"{int((1 - alpha) * 100)}%",
            "lower": round(ci_lo, 6),
            "upper": round(ci_hi, 6),
        },
        "effect_size": {
            "cohens_h": round(abs(h), 4),
            "interpretation": effect_label(h, "h"),
        },
    }


def ttest_means(cm: float, cs: float, cn: int, tm: float, ts: float, tn: int, alpha: float) -> dict:
    """Welch's two-sample t-test (unequal variances)."""
    if cn < 2 or tn < 2:
        return {"error": "Each group needs at least 2 observations."}

    se = math.sqrt(cs ** 2 / cn + ts ** 2 / tn)
    if se == 0:
        return {"error": "Standard error is zero — check std values."}

    t = (tm - cm) / se

    # Welch–Satterthwaite degrees of freedom
    num = (cs ** 2 / cn + ts ** 2 / tn) ** 2
    denom = (cs ** 2 / cn) ** 2 / (cn - 1) + (ts ** 2 / tn) ** 2 / (tn - 1)
    df = num / denom if denom else cn + tn - 2

    p_value = two_tail_p_t(t, df)

    z_crit = normal_ppf(1 - alpha / 2) if df > 1000 else normal_ppf(1 - alpha / 2)
    # Use t critical value approximation
    from_t = abs(t) / (p_value / 2) if p_value > 0 else z_crit  # rough
    t_crit = normal_ppf(1 - alpha / 2)  # normal approx for CI

    diff = tm - cm
    ci_lo = diff - t_crit * se
    ci_hi = diff + t_crit * se

    d = cohens_d(tm, ts, tn, cm, cs, cn)
    lift = (tm - cm) / cm * 100 if cm else 0

    return {
        "test": "Welch's two-sample t-test",
        "control": {"n": cn, "mean": round(cm, 4), "std": round(cs, 4)},
        "treatment": {"n": tn, "mean": round(tm, 4), "std": round(ts, 4)},
        "difference": round(diff, 4),
        "relative_lift_pct": round(lift, 2),
        "t_statistic": round(t, 4),
        "degrees_of_freedom": round(df, 1),
        "p_value": round(p_value, 6),
        "significant": p_value < alpha,
        "alpha": alpha,
        "confidence_interval": {
            "level": f"{int((1 - alpha) * 100)}%",
            "lower": round(ci_lo, 4),
            "upper": round(ci_hi, 4),
        },
        "effect_size": {
            "cohens_d": round(abs(d), 4),
            "interpretation": effect_label(d, "d"),
        },
    }


def chi2_test(observed: list[float], expected: list[float], alpha: float) -> dict:
    """Chi-square goodness-of-fit test."""
    if len(observed) != len(expected):
        return {"error": "Observed and expected must have the same number of categories."}
    if any(e <= 0 for e in expected):
        return {"error": "Expected values must all be positive."}
    if any(e < 5 for e in expected):
        return {"warning": "Some expected values < 5 — chi-square approximation may be unreliable.",
                "suggestion": "Consider combining categories or using Fisher's exact test."}

    chi2 = sum((o - e) ** 2 / e for o, e in zip(observed, expected))
    k = len(observed)
    df = k - 1
    n = sum(observed)

    # Chi-square CDF via regularized gamma function approximation
    p_value = 1 - _chi2_cdf(chi2, df)

    v = cramers_v(chi2, int(n), k)

    return {
        "test": "Chi-square goodness-of-fit",
        "categories": k,
        "observed": observed,
        "expected": expected,
        "chi2_statistic": round(chi2, 4),
        "degrees_of_freedom": df,
        "p_value": round(p_value, 6),
        "significant": p_value < alpha,
        "alpha": alpha,
        "effect_size": {
            "cramers_v": round(v, 4),
            "interpretation": effect_label(v, "v"),
        },
    }


def _chi2_cdf(x: float, k: float) -> float:
    """CDF of chi-square via regularized lower incomplete gamma."""
    if x <= 0:
        return 0.0
    return _regularized_gamma(k / 2, x / 2)


def _regularized_gamma(a: float, x: float) -> float:
    """Lower regularized incomplete gamma P(a, x) via series expansion."""
    if x < 0:
        return 0.0
    if x == 0:
        return 0.0
    if x < a + 1:
        # Series expansion
        ap = a
        delta = 1.0 / a
        total = delta
        for _ in range(300):
            ap += 1
            delta *= x / ap
            total += delta
            if abs(delta) < abs(total) * 1e-10:
                break
        return total * math.exp(-x + a * math.log(x) - math.lgamma(a))
    else:
        # Continued fraction (Lentz)
        b = x + 1 - a
        c = 1e30
        d = 1 / b
        f = d
        for i in range(1, 300):
            an = -i * (i - a)
            b += 2
            d = an * d + b
            if abs(d) < 1e-30:
                d = 1e-30
            c = b + an / c
            if abs(c) < 1e-30:
                c = 1e-30
            d = 1 / d
            delta = d * c
            f *= delta
            if abs(delta - 1) < 1e-10:
                break
        return 1 - math.exp(-x + a * math.log(x) - math.lgamma(a)) * f


# ---------------------------------------------------------------------------
# Reporting
# ---------------------------------------------------------------------------

DIRECTION = {True: "statistically significant", False: "NOT statistically significant"}


def verdict(result: dict) -> str:
    if "error" in result:
        return f"ERROR: {result['error']}"
    sig = result.get("significant", False)
    p = result.get("p_value", 1.0)
    alpha = result.get("alpha", 0.05)
    diff = result.get("difference", 0)
    lift = result.get("relative_lift_pct")
    ci = result.get("confidence_interval", {})
    es = result.get("effect_size", {})
    es_name = "Cohen's h" if "cohens_h" in es else ("Cohen's d" if "cohens_d" in es else "Cramér's V")
    es_val = es.get("cohens_h") or es.get("cohens_d") or es.get("cramers_v", 0)
    es_interp = es.get("interpretation", "")

    lines = [
        "",
        "=" * 60,
        f"  {result.get('test', 'Hypothesis Test')}",
        "=" * 60,
    ]

    if "control" in result and "rate" in result["control"]:
        c = result["control"]
        t = result["treatment"]
        lines += [
            f"  Control:   {c['rate']:.4%}  (n={c['n']}, conversions={c['conversions']})",
            f"  Treatment: {t['rate']:.4%}  (n={t['n']}, conversions={t['conversions']})",
            f"  Difference: {diff:+.4%}  ({'+' if lift >= 0 else ''}{lift:.1f}% relative lift)",
        ]
    elif "control" in result and "mean" in result["control"]:
        c = result["control"]
        t = result["treatment"]
        lines += [
            f"  Control:   mean={c['mean']}  std={c['std']}  n={c['n']}",
            f"  Treatment: mean={t['mean']}  std={t['std']}  n={t['n']}",
            f"  Difference: {diff:+.4f}  ({'+' if lift >= 0 else ''}{lift:.1f}% relative lift)",
        ]
    elif "observed" in result:
        lines += [
            f"  Observed: {result['observed']}",
            f"  Expected: {result['expected']}",
        ]

    lines += [
        "",
        f"  p-value:    {p:.6f}  (α={alpha})",
        f"  Result:     {DIRECTION[sig].upper()}",
    ]
    if ci:
        lines.append(f"  {ci['level']} CI: [{ci['lower']}, {ci['upper']}]")
    lines += [
        f"  Effect:     {es_name} = {es_val}  ({es_interp})",
        "",
    ]

    # Plain English verdict
    if sig:
        lines.append(f"  ✅ VERDICT: The difference is real (p={p:.4f} < α={alpha}).")
        if es_interp in ("negligible", "small"):
            lines.append("  ⚠️  BUT: Effect is small — confirm practical significance before shipping.")
        else:
            lines.append("  Effect size is meaningful. Recommend shipping if no negative guardrails.")
    else:
        lines.append(f"  ❌ VERDICT: Insufficient evidence to conclude a difference exists (p={p:.4f} ≥ α={alpha}).")
        lines.append("  Options: extend the test, increase MDE, or kill if underpowered.")

    lines.append("=" * 60)
    return "\n".join(lines)


def main():
    parser = argparse.ArgumentParser(description="Run hypothesis tests on experiment results.")
    parser.add_argument("--test", choices=["ztest", "ttest", "chi2"], required=True)
    parser.add_argument("--alpha", type=float, default=0.05, help="Significance level (default: 0.05)")
    parser.add_argument("--format", choices=["text", "json"], default="text")

    # Z-test / t-test shared
    parser.add_argument("--control-n", type=int)
    parser.add_argument("--treatment-n", type=int)

    # Z-test
    parser.add_argument("--control-x", type=int, help="Conversions in control group")
    parser.add_argument("--treatment-x", type=int, help="Conversions in treatment group")

    # t-test
    parser.add_argument("--control-mean", type=float)
    parser.add_argument("--control-std", type=float)
    parser.add_argument("--treatment-mean", type=float)
    parser.add_argument("--treatment-std", type=float)

    # chi2
    parser.add_argument("--observed", help="Comma-separated observed counts")
    parser.add_argument("--expected", help="Comma-separated expected counts")

    args = parser.parse_args()

    if args.test == "ztest":
        for req in ["control_n", "control_x", "treatment_n", "treatment_x"]:
            if getattr(args, req) is None:
                print(f"Error: --{req.replace('_', '-')} is required for ztest", file=sys.stderr)
                sys.exit(1)
        result = ztest_proportions(args.control_n, args.control_x, args.treatment_n, args.treatment_x, args.alpha)

    elif args.test == "ttest":
        for req in ["control_n", "control_mean", "control_std", "treatment_n", "treatment_mean", "treatment_std"]:
            if getattr(args, req) is None:
                print(f"Error: --{req.replace('_', '-')} is required for ttest", file=sys.stderr)
                sys.exit(1)
        result = ttest_means(
            args.control_mean, args.control_std, args.control_n,
            args.treatment_mean, args.treatment_std, args.treatment_n,
            args.alpha
        )

    elif args.test == "chi2":
        if not args.observed or not args.expected:
            print("Error: --observed and --expected are required for chi2", file=sys.stderr)
            sys.exit(1)
        observed = [float(x.strip()) for x in args.observed.split(",")]
        expected = [float(x.strip()) for x in args.expected.split(",")]
        result = chi2_test(observed, expected, args.alpha)

    if args.format == "json":
        print(json.dumps(result, indent=2))
    else:
        if "error" in result:
            print(f"Error: {result['error']}", file=sys.stderr)
            sys.exit(1)
        print(verdict(result))


if __name__ == "__main__":
    main()
