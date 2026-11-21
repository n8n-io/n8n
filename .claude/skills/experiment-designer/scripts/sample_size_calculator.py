#!/usr/bin/env python3
"""Calculate sample size for two-proportion A/B tests."""

import argparse
import math
import statistics


def clamp_rate(value: float, name: str) -> float:
    if value <= 0 or value >= 1:
        raise ValueError(f"{name} must be between 0 and 1 (exclusive).")
    return value


def required_sample_size_per_group(
    baseline_rate: float,
    target_rate: float,
    alpha: float,
    power: float,
) -> int:
    delta = abs(target_rate - baseline_rate)
    if delta <= 0:
        raise ValueError("MDE resolves to zero; target and baseline must differ.")

    z_alpha = statistics.NormalDist().inv_cdf(1 - alpha / 2)
    z_beta = statistics.NormalDist().inv_cdf(power)
    pooled = (baseline_rate + target_rate) / 2

    numerator = 2 * pooled * (1 - pooled) * (z_alpha + z_beta) ** 2
    n = numerator / (delta ** 2)
    return math.ceil(n)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Compute sample size for two-proportion product experiments."
    )
    parser.add_argument("--baseline-rate", type=float, required=True)
    parser.add_argument(
        "--mde",
        type=float,
        required=True,
        help="Minimum detectable effect. Absolute points when --mde-type absolute, otherwise relative uplift.",
    )
    parser.add_argument("--mde-type", choices=["absolute", "relative"], default="relative")
    parser.add_argument("--alpha", type=float, default=0.05)
    parser.add_argument("--power", type=float, default=0.8)
    parser.add_argument(
        "--daily-samples",
        type=int,
        default=0,
        help="Optional total daily samples to estimate runtime in days.",
    )
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    baseline = clamp_rate(args.baseline_rate, "baseline-rate")

    if args.mde <= 0:
        raise ValueError("mde must be > 0")
    if args.alpha <= 0 or args.alpha >= 1:
        raise ValueError("alpha must be between 0 and 1")
    if args.power <= 0 or args.power >= 1:
        raise ValueError("power must be between 0 and 1")

    if args.mde_type == "absolute":
        target = baseline + args.mde
    else:
        target = baseline * (1 + args.mde)

    target = clamp_rate(target, "target-rate")

    n_per_group = required_sample_size_per_group(
        baseline_rate=baseline,
        target_rate=target,
        alpha=args.alpha,
        power=args.power,
    )
    total_n = n_per_group * 2

    print("A/B Test Sample Size Estimate")
    print(f"baseline_rate: {baseline:.6f}")
    print(f"target_rate: {target:.6f}")
    print(f"mde_type: {args.mde_type}")
    print(f"alpha: {args.alpha}")
    print(f"power: {args.power}")
    print(f"n_per_group: {n_per_group}")
    print(f"n_total: {total_n}")

    if args.daily_samples > 0:
        days = math.ceil(total_n / args.daily_samples)
        print(f"estimated_days_at_daily_samples_{args.daily_samples}: {days}")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
