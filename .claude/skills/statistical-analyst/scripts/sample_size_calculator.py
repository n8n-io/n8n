#!/usr/bin/env python3
from __future__ import annotations
"""
sample_size_calculator.py — Required sample size per variant for A/B experiments.

Supports proportion tests (conversion rates) and mean tests (continuous metrics).
All math uses Python stdlib only.

Usage:
    python3 sample_size_calculator.py --test proportion \
        --baseline 0.05 --mde 0.20 --alpha 0.05 --power 0.80

    python3 sample_size_calculator.py --test mean \
        --baseline-mean 42.3 --baseline-std 18.1 --mde 0.10 \
        --alpha 0.05 --power 0.80

    python3 sample_size_calculator.py --test proportion \
        --baseline 0.05 --mde 0.20 --table

    python3 sample_size_calculator.py --test proportion \
        --baseline 0.05 --mde 0.20 --format json
"""

import argparse
import json
import math
import sys


def normal_cdf(z: float) -> float:
    return 0.5 * math.erfc(-z / math.sqrt(2))


def normal_ppf(p: float) -> float:
    """Inverse normal CDF via bisection."""
    lo, hi = -10.0, 10.0
    for _ in range(100):
        mid = (lo + hi) / 2
        if normal_cdf(mid) < p:
            lo = mid
        else:
            hi = mid
    return (lo + hi) / 2


def sample_size_proportion(baseline: float, mde: float, alpha: float, power: float) -> int:
    """
    Required n per variant for a two-proportion Z-test.

    Uses the standard formula:
        n = (z_α/2 + z_β)² × (p1(1−p1) + p2(1−p2)) / (p1 − p2)²

    Args:
        baseline: Control conversion rate (e.g. 0.05 for 5%)
        mde: Minimum detectable effect as relative change (e.g. 0.20 for +20% relative)
        alpha: Significance level (e.g. 0.05)
        power: Statistical power (e.g. 0.80)
    """
    p1 = baseline
    p2 = baseline * (1 + mde)

    if not (0 < p1 < 1) or not (0 < p2 < 1):
        raise ValueError(f"Rates must be between 0 and 1. Got baseline={p1}, treatment={p2:.4f}")

    z_alpha = normal_ppf(1 - alpha / 2)
    z_beta = normal_ppf(power)

    numerator = (z_alpha + z_beta) ** 2 * (p1 * (1 - p1) + p2 * (1 - p2))
    denominator = (p2 - p1) ** 2

    return math.ceil(numerator / denominator)


def sample_size_mean(baseline_mean: float, baseline_std: float, mde: float, alpha: float, power: float) -> int:
    """
    Required n per variant for a two-sample t-test.

    Uses:
        n = 2 × σ² × (z_α/2 + z_β)² / δ²

    where δ = mde × baseline_mean (absolute effect).

    Args:
        baseline_mean: Control group mean
        baseline_std: Control group standard deviation
        mde: Minimum detectable effect as relative change (e.g. 0.10 for +10%)
        alpha: Significance level
        power: Statistical power
    """
    delta = abs(mde * baseline_mean)
    if delta == 0:
        raise ValueError("MDE × baseline_mean = 0. Cannot size experiment with zero effect.")

    z_alpha = normal_ppf(1 - alpha / 2)
    z_beta = normal_ppf(power)

    n = 2 * baseline_std ** 2 * (z_alpha + z_beta) ** 2 / delta ** 2
    return math.ceil(n)


def duration_estimate(n_per_variant: int, daily_traffic: int | None, variants: int = 2) -> str:
    if daily_traffic and daily_traffic > 0:
        traffic_per_variant = daily_traffic / variants
        days = math.ceil(n_per_variant / traffic_per_variant)
        weeks = days / 7
        return f"{days} days ({weeks:.1f} weeks) at {daily_traffic:,} daily users split {variants} ways"
    return "Provide --daily-traffic to estimate duration"


def print_report(
    test: str, n: int, baseline: float, mde: float, alpha: float, power: float,
    daily_traffic: int | None, variants: int,
    baseline_mean: float | None = None, baseline_std: float | None = None
):
    total = n * variants
    treatment_rate = baseline * (1 + mde) if test == "proportion" else None
    absolute_mde = baseline * mde if test == "proportion" else (baseline_mean or 0) * mde

    print("=" * 60)
    print("  SAMPLE SIZE REPORT")
    print("=" * 60)

    if test == "proportion":
        print(f"  Baseline conversion rate: {baseline:.2%}")
        print(f"  Target conversion rate:   {treatment_rate:.2%}")
        print(f"  MDE: {mde:+.1%} relative  ({absolute_mde:+.4f} absolute)")
    else:
        print(f"  Baseline mean: {baseline_mean}  (std: {baseline_std})")
        print(f"  MDE: {mde:+.1%} relative  (absolute: {absolute_mde:+.4f})")

    print(f"  Significance level (α): {alpha}")
    print(f"  Statistical power (1−β): {power:.0%}")
    print(f"  Variants: {variants}")
    print()
    print(f"  Required per variant:  {n:>10,}")
    print(f"  Required total:        {total:>10,}")
    print()
    print(f"  Duration: {duration_estimate(n, daily_traffic, variants)}")
    print()

    # Risk interpretation
    if n < 100:
        print("  ⚠️  Very small sample — results may be sensitive to outliers.")
    elif n > 1_000_000:
        print("  ⚠️  Very large sample required — consider increasing MDE or accepting lower power.")
    else:
        print("  ✅ Sample size is achievable for most web/app products.")

    print("=" * 60)


def print_table(test: str, baseline: float, mde: float, alpha: float,
                baseline_mean: float | None, baseline_std: float | None):
    """Print tradeoff table across power levels and MDE values."""
    powers = [0.70, 0.75, 0.80, 0.85, 0.90, 0.95]
    mdes = [mde * 0.5, mde * 0.75, mde, mde * 1.5, mde * 2.0]

    print("=" * 70)
    print(f"  SAMPLE SIZE TRADEOFF TABLE  (α={alpha}, baseline={'proportion' if test == 'proportion' else 'mean'})")
    print("=" * 70)
    header = f"  {'MDE':>8} | " + " | ".join(f"power={p:.0%}" for p in powers)
    print(header)
    print("  " + "-" * (len(header) - 2))

    for m in mdes:
        row = f"  {m:>+7.1%} | "
        cells = []
        for p in powers:
            try:
                if test == "proportion":
                    n = sample_size_proportion(baseline, m, alpha, p)
                else:
                    n = sample_size_mean(baseline_mean, baseline_std, m, alpha, p)
                cells.append(f"{n:>9,}")
            except ValueError:
                cells.append(f"{'N/A':>9}")
        row += " | ".join(cells)
        print(row)

    print("=" * 70)
    print("  (Values = required n per variant)")
    print()


def main():
    parser = argparse.ArgumentParser(description="Calculate required sample size for A/B experiments.")
    parser.add_argument("--test", choices=["proportion", "mean"], required=True,
                        help="Type of metric: proportion (conversion rate) or mean (continuous)")
    parser.add_argument("--alpha", type=float, default=0.05, help="Significance level (default: 0.05)")
    parser.add_argument("--power", type=float, default=0.80, help="Statistical power (default: 0.80)")
    parser.add_argument("--mde", type=float, required=True,
                        help="Minimum detectable effect as relative change (e.g. 0.20 = +20%%)")
    parser.add_argument("--variants", type=int, default=2, help="Number of variants including control (default: 2)")
    parser.add_argument("--daily-traffic", type=int, help="Daily unique users (for duration estimate)")
    parser.add_argument("--table", action="store_true", help="Print tradeoff table across power and MDE")
    parser.add_argument("--format", choices=["text", "json"], default="text")

    # Proportion-specific
    parser.add_argument("--baseline", type=float, help="Baseline conversion rate (e.g. 0.05 for 5%%)")

    # Mean-specific
    parser.add_argument("--baseline-mean", type=float, help="Control group mean")
    parser.add_argument("--baseline-std", type=float, help="Control group standard deviation")

    args = parser.parse_args()

    try:
        if args.test == "proportion":
            if args.baseline is None:
                print("Error: --baseline is required for proportion test", file=sys.stderr)
                sys.exit(1)
            n = sample_size_proportion(args.baseline, args.mde, args.alpha, args.power)
        else:
            if args.baseline_mean is None or args.baseline_std is None:
                print("Error: --baseline-mean and --baseline-std are required for mean test", file=sys.stderr)
                sys.exit(1)
            n = sample_size_mean(args.baseline_mean, args.baseline_std, args.mde, args.alpha, args.power)
    except ValueError as e:
        print(f"Error: {e}", file=sys.stderr)
        sys.exit(1)

    if args.format == "json":
        output = {
            "test": args.test,
            "n_per_variant": n,
            "n_total": n * args.variants,
            "alpha": args.alpha,
            "power": args.power,
            "mde": args.mde,
            "variants": args.variants,
        }
        if args.test == "proportion":
            output["baseline_rate"] = args.baseline
            output["treatment_rate"] = round(args.baseline * (1 + args.mde), 6)
        else:
            output["baseline_mean"] = args.baseline_mean
            output["baseline_std"] = args.baseline_std
        if args.daily_traffic:
            days = math.ceil(n / (args.daily_traffic / args.variants))
            output["estimated_days"] = days
        print(json.dumps(output, indent=2))
        return

    if args.table:
        print_table(args.test, args.baseline if args.test == "proportion" else None,
                    args.mde, args.alpha, args.baseline_mean, args.baseline_std)

    print_report(
        args.test, n,
        baseline=args.baseline or 0,
        mde=args.mde,
        alpha=args.alpha,
        power=args.power,
        daily_traffic=args.daily_traffic,
        variants=args.variants,
        baseline_mean=args.baseline_mean,
        baseline_std=args.baseline_std,
    )


if __name__ == "__main__":
    main()
