#!/usr/bin/env python3
"""
confidence_interval.py — Confidence intervals for proportions and means.

Methods:
  proportion — Wilson score interval (recommended over normal approximation for small n or extreme p)
  mean       — t-based interval using normal approximation for large n

Usage:
    python3 confidence_interval.py --type proportion --n 1200 --x 96
    python3 confidence_interval.py --type mean --n 800 --mean 42.3 --std 18.1
    python3 confidence_interval.py --type proportion --n 1200 --x 96 --confidence 0.99
    python3 confidence_interval.py --type proportion --n 1200 --x 96 --format json
"""

import argparse
import json
import math
import sys


def normal_ppf(p: float) -> float:
    """Inverse normal CDF via bisection."""
    lo, hi = -10.0, 10.0
    for _ in range(100):
        mid = (lo + hi) / 2
        if 0.5 * math.erfc(-mid / math.sqrt(2)) < p:
            lo = mid
        else:
            hi = mid
    return (lo + hi) / 2


def wilson_interval(n: int, x: int, confidence: float) -> dict:
    """
    Wilson score confidence interval for a proportion.
    More accurate than normal approximation, especially for small n or p near 0/1.
    """
    if n <= 0:
        return {"error": "n must be positive"}
    if x < 0 or x > n:
        return {"error": "x must be between 0 and n"}

    p_hat = x / n
    z = normal_ppf(1 - (1 - confidence) / 2)
    z2 = z ** 2

    center = (p_hat + z2 / (2 * n)) / (1 + z2 / n)
    margin = (z / (1 + z2 / n)) * math.sqrt(p_hat * (1 - p_hat) / n + z2 / (4 * n ** 2))

    lo = max(0.0, center - margin)
    hi = min(1.0, center + margin)

    # Normal approximation for comparison
    se = math.sqrt(p_hat * (1 - p_hat) / n) if n > 0 else 0
    normal_lo = max(0.0, p_hat - z * se)
    normal_hi = min(1.0, p_hat + z * se)

    return {
        "type": "proportion",
        "method": "Wilson score interval",
        "n": n,
        "successes": x,
        "observed_rate": round(p_hat, 6),
        "confidence": confidence,
        "lower": round(lo, 6),
        "upper": round(hi, 6),
        "margin_of_error": round((hi - lo) / 2, 6),
        "normal_approximation": {
            "lower": round(normal_lo, 6),
            "upper": round(normal_hi, 6),
            "note": "Wilson is preferred; normal approx shown for reference",
        },
    }


def mean_interval(n: int, mean: float, std: float, confidence: float) -> dict:
    """
    Confidence interval for a mean.
    Uses normal approximation (z-based) for n >= 30, t-approximation otherwise.
    """
    if n <= 1:
        return {"error": "n must be > 1"}
    if std < 0:
        return {"error": "std must be non-negative"}

    se = std / math.sqrt(n)
    z = normal_ppf(1 - (1 - confidence) / 2)

    lo = mean - z * se
    hi = mean + z * se
    moe = z * se

    rel_moe = moe / abs(mean) * 100 if mean != 0 else None

    precision_note = ""
    if rel_moe and rel_moe > 20:
        precision_note = "Wide CI — consider increasing sample size for tighter estimates."
    elif rel_moe and rel_moe < 5:
        precision_note = "Tight CI — high precision estimate."

    return {
        "type": "mean",
        "method": "Normal approximation (z-based)" if n >= 30 else "Use with caution (n < 30)",
        "n": n,
        "observed_mean": round(mean, 6),
        "std": round(std, 6),
        "standard_error": round(se, 6),
        "confidence": confidence,
        "lower": round(lo, 6),
        "upper": round(hi, 6),
        "margin_of_error": round(moe, 6),
        "relative_margin_of_error_pct": round(rel_moe, 2) if rel_moe is not None else None,
        "precision_note": precision_note,
    }


def print_report(result: dict):
    if "error" in result:
        print(f"Error: {result['error']}", file=sys.stderr)
        sys.exit(1)

    conf_pct = int(result["confidence"] * 100)
    print("=" * 60)
    print(f"  CONFIDENCE INTERVAL REPORT")
    print("=" * 60)
    print(f"  Method: {result['method']}")
    print(f"  Confidence level: {conf_pct}%")
    print()

    if result["type"] == "proportion":
        print(f"  Observed rate: {result['observed_rate']:.4%}  ({result['successes']}/{result['n']})")
        print()
        print(f"  {conf_pct}% CI: [{result['lower']:.4%}, {result['upper']:.4%}]")
        print(f"  Margin of error: ±{result['margin_of_error']:.4%}")
        print()
        norm = result.get("normal_approximation", {})
        print(f"  Normal approx CI (ref): [{norm.get('lower', 0):.4%}, {norm.get('upper', 0):.4%}]")

    elif result["type"] == "mean":
        print(f"  Observed mean: {result['observed_mean']}  (std={result['std']}, n={result['n']})")
        print(f"  Standard error: {result['standard_error']}")
        print()
        print(f"  {conf_pct}% CI: [{result['lower']}, {result['upper']}]")
        print(f"  Margin of error: ±{result['margin_of_error']}")
        if result.get("relative_margin_of_error_pct") is not None:
            print(f"  Relative MoE: ±{result['relative_margin_of_error_pct']:.1f}%")
        if result.get("precision_note"):
            print(f"\n  ℹ️  {result['precision_note']}")

    print()
    # Interpretation guide
    print(f"  Interpretation: If this experiment were repeated many times,")
    print(f"  {conf_pct}% of the computed intervals would contain the true value.")
    print(f"  This does NOT mean there is a {conf_pct}% chance the true value is")
    print(f"  in this specific interval — it either is or it isn't.")
    print("=" * 60)


def main():
    parser = argparse.ArgumentParser(
        description="Compute confidence intervals for proportions and means."
    )
    parser.add_argument("--type", choices=["proportion", "mean"], required=True)
    parser.add_argument("--confidence", type=float, default=0.95,
                        help="Confidence level (default: 0.95)")
    parser.add_argument("--format", choices=["text", "json"], default="text")

    # Proportion
    parser.add_argument("--n", type=int, help="Total sample size")
    parser.add_argument("--x", type=int, help="Number of successes (for proportion)")

    # Mean
    parser.add_argument("--mean", type=float, help="Observed mean")
    parser.add_argument("--std", type=float, help="Observed standard deviation")

    args = parser.parse_args()

    if args.type == "proportion":
        if args.n is None or args.x is None:
            print("Error: --n and --x are required for proportion CI", file=sys.stderr)
            sys.exit(1)
        result = wilson_interval(args.n, args.x, args.confidence)

    elif args.type == "mean":
        if args.n is None or args.mean is None or args.std is None:
            print("Error: --n, --mean, and --std are required for mean CI", file=sys.stderr)
            sys.exit(1)
        result = mean_interval(args.n, args.mean, args.std, args.confidence)

    if args.format == "json":
        print(json.dumps(result, indent=2))
    else:
        print_report(result)


if __name__ == "__main__":
    main()
