#!/usr/bin/env python3
"""
sample_size_calculator.py — A/B Test Sample Size Calculator
100% stdlib, no pip installs required.

Usage:
    python3 sample_size_calculator.py                          # demo mode
    python3 sample_size_calculator.py --baseline 0.05 --mde 0.20
    python3 sample_size_calculator.py --baseline 0.05 --mde 0.20 --daily-traffic 500
    python3 sample_size_calculator.py --baseline 0.05 --mde 0.20 --json
"""

import argparse
import json
import math
import sys


# ---------------------------------------------------------------------------
# Z-score approximation (scipy-free, Beasley-Springer-Moro algorithm)
# ---------------------------------------------------------------------------

def _norm_ppf(p: float) -> float:
    """Percent-point function (inverse CDF) of the standard normal.
    Uses rational approximation — accurate to ~1e-9.
    Reference: Abramowitz & Stegun 26.2.17 / Peter Acklam's algorithm.
    """
    if p <= 0 or p >= 1:
        raise ValueError(f"p must be in (0, 1), got {p}")

    # Coefficients for rational approximation
    a = [-3.969683028665376e+01,  2.209460984245205e+02,
         -2.759285104469687e+02,  1.383577518672690e+02,
         -3.066479806614716e+01,  2.506628277459239e+00]
    b = [-5.447609879822406e+01,  1.615858368580409e+02,
         -1.556989798598866e+02,  6.680131188771972e+01,
         -1.328068155288572e+01]
    c = [-7.784894002430293e-03, -3.223964580411365e-01,
         -2.400758277161838e+00, -2.549732539343734e+00,
          4.374664141464968e+00,  2.938163982698783e+00]
    d = [7.784695709041462e-03,  3.224671290700398e-01,
         2.445134137142996e+00,  3.754408661907416e+00]

    p_low  = 0.02425
    p_high = 1 - p_low

    if p < p_low:
        q = math.sqrt(-2 * math.log(p))
        return (((((c[0]*q+c[1])*q+c[2])*q+c[3])*q+c[4])*q+c[5]) / \
               ((((d[0]*q+d[1])*q+d[2])*q+d[3])*q+1)
    elif p <= p_high:
        q = p - 0.5
        r = q * q
        return (((((a[0]*r+a[1])*r+a[2])*r+a[3])*r+a[4])*r+a[5])*q / \
               (((((b[0]*r+b[1])*r+b[2])*r+b[3])*r+b[4])*r+1)
    else:
        q = math.sqrt(-2 * math.log(1 - p))
        return -(((((c[0]*q+c[1])*q+c[2])*q+c[3])*q+c[4])*q+c[5]) / \
                ((((d[0]*q+d[1])*q+d[2])*q+d[3])*q+1)


# ---------------------------------------------------------------------------
# Core calculation
# ---------------------------------------------------------------------------

def calculate_sample_size(
    baseline: float,
    mde: float,
    alpha: float = 0.05,
    power: float = 0.80,
) -> dict:
    """
    Two-proportion z-test sample size formula (two-tailed).

    n = (Z_alpha/2 + Z_beta)^2 * (p1*(1-p1) + p2*(1-p2)) / (p2 - p1)^2

    Args:
        baseline  : baseline conversion rate (e.g. 0.05 for 5%)
        mde       : minimum detectable effect as relative lift (e.g. 0.20 for +20%)
        alpha     : significance level (Type I error rate), default 0.05
        power     : statistical power (1 - Type II error rate), default 0.80

    Returns dict with all intermediate values and results.
    """
    p1 = baseline
    p2 = baseline * (1 + mde)          # expected conversion with treatment

    if not (0 < p1 < 1):
        raise ValueError(f"baseline must be in (0,1), got {p1}")
    if not (0 < p2 < 1):
        raise ValueError(
            f"baseline * (1 + mde) = {p2:.4f} is outside (0,1). "
            "Reduce mde or increase baseline."
        )

    z_alpha = _norm_ppf(1 - alpha / 2)   # two-tailed
    z_beta  = _norm_ppf(power)

    pooled_var = p1 * (1 - p1) + p2 * (1 - p2)
    effect_sq  = (p2 - p1) ** 2

    n_raw = ((z_alpha + z_beta) ** 2 * pooled_var) / effect_sq
    n     = math.ceil(n_raw)

    return {
        "inputs": {
            "baseline_conversion_rate": p1,
            "minimum_detectable_effect_relative": mde,
            "expected_variant_conversion_rate": round(p2, 6),
            "significance_level_alpha": alpha,
            "statistical_power": power,
        },
        "z_scores": {
            "z_alpha_2": round(z_alpha, 4),
            "z_beta":    round(z_beta,  4),
        },
        "results": {
            "sample_size_per_variation": n,
            "total_sample_size":         n * 2,
            "absolute_lift":             round(p2 - p1, 6),
            "relative_lift_pct":         round(mde * 100, 2),
        },
        "formula": (
            "n = (Z_α/2 + Z_β)² × (p1(1−p1) + p2(1−p2)) / (p2−p1)²  "
            "[two-proportion z-test, two-tailed]"
        ),
        "assumptions": [
            "Two-tailed test (detecting lift in either direction)",
            "Independent samples (no within-subject correlation)",
            "Fixed horizon (not sequential / always-valid)",
            "Binomial outcome (conversion yes/no)",
            "No novelty effect correction applied",
        ],
    }


def add_duration(result: dict, daily_traffic: int) -> dict:
    """Append estimated test duration given total daily traffic (both variants)."""
    n_total = result["results"]["total_sample_size"]
    days    = math.ceil(n_total / daily_traffic)
    weeks   = round(days / 7, 1)
    result["duration"] = {
        "daily_traffic_both_variants": daily_traffic,
        "estimated_days":  days,
        "estimated_weeks": weeks,
        "note": (
            "Assumes traffic is evenly split 50/50 between control and variant. "
            "Add ~10–20% buffer for weekday/weekend variance."
        ),
    }
    return result


# ---------------------------------------------------------------------------
# Scoring helper (0-100)
# ---------------------------------------------------------------------------

def score_test_design(result: dict) -> dict:
    """Heuristic quality score for the A/B test design."""
    score = 100
    reasons = []
    inputs = result["inputs"]

    # Penalise very low baseline (unreliable estimates)
    if inputs["baseline_conversion_rate"] < 0.01:
        score -= 15
        reasons.append("Baseline <1%: high variance, consider aggregating more data first.")

    # Penalise tiny MDE (will need enormous sample)
    mde = inputs["minimum_detectable_effect_relative"]
    if mde < 0.05:
        score -= 20
        reasons.append("MDE <5%: very small effect, experiment may take months.")
    elif mde < 0.10:
        score -= 10
        reasons.append("MDE <10%: moderately small effect size.")

    # Penalise overly aggressive alpha
    if inputs["significance_level_alpha"] > 0.10:
        score -= 15
        reasons.append("α >10%: high false-positive risk.")

    # Penalise low power
    if inputs["statistical_power"] < 0.80:
        score -= 20
        reasons.append("Power <80%: elevated risk of missing real effects (Type II error).")

    # Duration penalty (if available)
    dur = result.get("duration")
    if dur:
        days = dur["estimated_days"]
        if days > 90:
            score -= 20
            reasons.append(f"Test duration {days}d >90 days: novelty/seasonal effects likely.")
        elif days > 30:
            score -= 10
            reasons.append(f"Test duration {days}d >30 days: monitor for external confounders.")

    score = max(0, score)
    return {
        "design_quality_score": score,
        "score_interpretation": _score_label(score),
        "issues": reasons if reasons else ["No major design issues detected."],
    }


def _score_label(s: int) -> str:
    if s >= 90: return "Excellent"
    if s >= 75: return "Good"
    if s >= 60: return "Fair"
    if s >= 40: return "Poor"
    return "Critical"


# ---------------------------------------------------------------------------
# Pretty-print
# ---------------------------------------------------------------------------

def pretty_print(result: dict, score: dict) -> None:
    inp = result["inputs"]
    res = result["results"]
    zs  = result["z_scores"]

    print("\n" + "=" * 60)
    print("  A/B TEST SAMPLE SIZE CALCULATOR")
    print("=" * 60)

    print("\n📥  INPUTS")
    print(f"  Baseline conversion rate : {inp['baseline_conversion_rate']*100:.2f}%")
    print(f"  Variant conversion rate  : {inp['expected_variant_conversion_rate']*100:.2f}%")
    print(f"  Minimum detectable effect: {inp['minimum_detectable_effect_relative']*100:.1f}% relative "
          f"(+{res['absolute_lift']*100:.3f}pp absolute)")
    print(f"  Significance level (α)   : {inp['significance_level_alpha']}")
    print(f"  Statistical power        : {inp['statistical_power']*100:.0f}%")

    print("\n📐  FORMULA")
    print(f"  {result['formula']}")
    print(f"  Z_α/2 = {zs['z_alpha_2']}   Z_β = {zs['z_beta']}")

    print("\n📊  RESULTS")
    print(f"  ✅ Sample size per variation : {res['sample_size_per_variation']:,}")
    print(f"  ✅ Total sample size (both)  : {res['total_sample_size']:,}")

    if "duration" in result:
        d = result["duration"]
        print(f"\n⏱️   DURATION ESTIMATE  (traffic: {d['daily_traffic_both_variants']:,}/day)")
        print(f"  Estimated test duration : {d['estimated_days']} days  (~{d['estimated_weeks']} weeks)")
        print(f"  Note: {d['note']}")

    print("\n💡  ASSUMPTIONS")
    for a in result["assumptions"]:
        print(f"  • {a}")

    print(f"\n🎯  DESIGN QUALITY SCORE: {score['design_quality_score']}/100  ({score['score_interpretation']})")
    for issue in score["issues"]:
        print(f"  ⚠  {issue}")

    print()


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------

def parse_args():
    parser = argparse.ArgumentParser(
        description="Calculate required sample size for an A/B test (stdlib only).",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=__doc__,
    )
    parser.add_argument("--baseline",       type=float, default=None,
                        help="Baseline conversion rate (e.g. 0.05 for 5%%)")
    parser.add_argument("--mde",            type=float, default=None,
                        help="Minimum detectable effect as relative lift (e.g. 0.20 for +20%%)")
    parser.add_argument("--alpha",          type=float, default=0.05,
                        help="Significance level α (default: 0.05)")
    parser.add_argument("--power",          type=float, default=0.80,
                        help="Statistical power 1-β (default: 0.80)")
    parser.add_argument("--daily-traffic",  type=int,   default=None,
                        help="Total daily visitors across both variants (for duration estimate)")
    parser.add_argument("--json",           action="store_true",
                        help="Output results as JSON")
    return parser.parse_args()


DEMO_SCENARIOS = [
    {"label": "E-commerce checkout (low baseline)",
     "baseline": 0.03, "mde": 0.20, "alpha": 0.05, "power": 0.80, "daily_traffic": 800},
    {"label": "SaaS free-trial signup (medium baseline)",
     "baseline": 0.08, "mde": 0.15, "alpha": 0.05, "power": 0.80, "daily_traffic": 2000},
    {"label": "Button CTA (high baseline)",
     "baseline": 0.25, "mde": 0.10, "alpha": 0.05, "power": 0.80, "daily_traffic": 5000},
]


def main():
    args = parse_args()
    demo_mode = (args.baseline is None and args.mde is None)

    if demo_mode:
        print("🔬  DEMO MODE — running 3 sample scenarios\n")
        all_results = []
        for sc in DEMO_SCENARIOS:
            res = calculate_sample_size(sc["baseline"], sc["mde"], sc["alpha"], sc["power"])
            res = add_duration(res, sc["daily_traffic"])
            sc_score = score_test_design(res)
            res["scenario"] = sc["label"]
            res["score"] = sc_score
            all_results.append(res)
            if not args.json:
                print(f"\n{'─'*60}")
                print(f"SCENARIO: {sc['label']}")
                pretty_print(res, sc_score)

        if args.json:
            print(json.dumps(all_results, indent=2))
        return

    # Single calculation mode
    if args.baseline is None or args.mde is None:
        print("Error: --baseline and --mde are required (or omit both for demo mode).", file=sys.stderr)
        sys.exit(1)

    result = calculate_sample_size(args.baseline, args.mde, args.alpha, args.power)
    if args.daily_traffic:
        result = add_duration(result, args.daily_traffic)
    sc_score = score_test_design(result)
    result["score"] = sc_score

    if args.json:
        print(json.dumps(result, indent=2))
    else:
        pretty_print(result, sc_score)


if __name__ == "__main__":
    main()
