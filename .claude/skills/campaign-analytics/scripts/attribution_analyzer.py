#!/usr/bin/env python3
"""
Attribution Analyzer - Multi-touch attribution modeling for marketing campaigns.

Implements 5 attribution models:
  - first-touch: 100% credit to first interaction
  - last-touch: 100% credit to last interaction
  - linear: Equal credit across all touchpoints
  - time-decay: Exponential decay favoring recent touchpoints
  - position-based: 40% first, 40% last, 20% split among middle

Usage:
    python attribution_analyzer.py data.json
    python attribution_analyzer.py data.json --model time-decay
    python attribution_analyzer.py data.json --model time-decay --half-life 14
    python attribution_analyzer.py data.json --format json
"""

import argparse
import json
import sys
from datetime import datetime
from typing import Any, Dict, List, Optional


MODELS = ["first-touch", "last-touch", "linear", "time-decay", "position-based"]


def safe_divide(numerator: float, denominator: float, default: float = 0.0) -> float:
    """Safely divide two numbers, returning default if denominator is zero."""
    if denominator == 0:
        return default
    return numerator / denominator


def parse_timestamp(ts: str) -> datetime:
    """Parse an ISO-format timestamp string into a datetime object."""
    for fmt in ("%Y-%m-%dT%H:%M:%S", "%Y-%m-%d %H:%M:%S", "%Y-%m-%d"):
        try:
            return datetime.strptime(ts, fmt)
        except ValueError:
            continue
    raise ValueError(f"Cannot parse timestamp: {ts}")


def first_touch_attribution(journeys: List[Dict]) -> Dict[str, float]:
    """First-touch: 100% credit to the first touchpoint in each journey."""
    credits: Dict[str, float] = {}
    for journey in journeys:
        if not journey.get("converted", False):
            continue
        touchpoints = journey.get("touchpoints", [])
        if not touchpoints:
            continue
        sorted_tp = sorted(touchpoints, key=lambda t: parse_timestamp(t["timestamp"]))
        channel = sorted_tp[0]["channel"]
        revenue = journey.get("revenue", 1.0)
        credits[channel] = credits.get(channel, 0.0) + revenue
    return credits


def last_touch_attribution(journeys: List[Dict]) -> Dict[str, float]:
    """Last-touch: 100% credit to the last touchpoint in each journey."""
    credits: Dict[str, float] = {}
    for journey in journeys:
        if not journey.get("converted", False):
            continue
        touchpoints = journey.get("touchpoints", [])
        if not touchpoints:
            continue
        sorted_tp = sorted(touchpoints, key=lambda t: parse_timestamp(t["timestamp"]))
        channel = sorted_tp[-1]["channel"]
        revenue = journey.get("revenue", 1.0)
        credits[channel] = credits.get(channel, 0.0) + revenue
    return credits


def linear_attribution(journeys: List[Dict]) -> Dict[str, float]:
    """Linear: Equal credit split across all touchpoints in each journey."""
    credits: Dict[str, float] = {}
    for journey in journeys:
        if not journey.get("converted", False):
            continue
        touchpoints = journey.get("touchpoints", [])
        if not touchpoints:
            continue
        revenue = journey.get("revenue", 1.0)
        share = safe_divide(revenue, len(touchpoints))
        for tp in touchpoints:
            channel = tp["channel"]
            credits[channel] = credits.get(channel, 0.0) + share
    return credits


def time_decay_attribution(journeys: List[Dict], half_life_days: float = 7.0) -> Dict[str, float]:
    """Time-decay: Exponential decay giving more credit to recent touchpoints.

    Uses a configurable half-life (in days). Touchpoints closer to conversion
    receive exponentially more credit.
    """
    import math

    credits: Dict[str, float] = {}
    decay_rate = math.log(2) / half_life_days

    for journey in journeys:
        if not journey.get("converted", False):
            continue
        touchpoints = journey.get("touchpoints", [])
        if not touchpoints:
            continue

        revenue = journey.get("revenue", 1.0)
        sorted_tp = sorted(touchpoints, key=lambda t: parse_timestamp(t["timestamp"]))
        conversion_time = parse_timestamp(sorted_tp[-1]["timestamp"])

        # Calculate raw weights
        weights: List[float] = []
        for tp in sorted_tp:
            tp_time = parse_timestamp(tp["timestamp"])
            days_before = (conversion_time - tp_time).total_seconds() / 86400.0
            weight = math.exp(-decay_rate * days_before)
            weights.append(weight)

        total_weight = sum(weights)
        if total_weight == 0:
            continue

        for i, tp in enumerate(sorted_tp):
            channel = tp["channel"]
            share = safe_divide(weights[i], total_weight) * revenue
            credits[channel] = credits.get(channel, 0.0) + share

    return credits


def position_based_attribution(journeys: List[Dict]) -> Dict[str, float]:
    """Position-based: 40% first, 40% last, 20% split among middle touchpoints."""
    credits: Dict[str, float] = {}
    for journey in journeys:
        if not journey.get("converted", False):
            continue
        touchpoints = journey.get("touchpoints", [])
        if not touchpoints:
            continue

        revenue = journey.get("revenue", 1.0)
        sorted_tp = sorted(touchpoints, key=lambda t: parse_timestamp(t["timestamp"]))

        if len(sorted_tp) == 1:
            channel = sorted_tp[0]["channel"]
            credits[channel] = credits.get(channel, 0.0) + revenue
        elif len(sorted_tp) == 2:
            first_channel = sorted_tp[0]["channel"]
            last_channel = sorted_tp[-1]["channel"]
            credits[first_channel] = credits.get(first_channel, 0.0) + revenue * 0.5
            credits[last_channel] = credits.get(last_channel, 0.0) + revenue * 0.5
        else:
            first_channel = sorted_tp[0]["channel"]
            last_channel = sorted_tp[-1]["channel"]
            credits[first_channel] = credits.get(first_channel, 0.0) + revenue * 0.4
            credits[last_channel] = credits.get(last_channel, 0.0) + revenue * 0.4

            middle_count = len(sorted_tp) - 2
            middle_share = safe_divide(revenue * 0.2, middle_count)
            for tp in sorted_tp[1:-1]:
                channel = tp["channel"]
                credits[channel] = credits.get(channel, 0.0) + middle_share

    return credits


def run_model(model_name: str, journeys: List[Dict], half_life: float = 7.0) -> Dict[str, float]:
    """Dispatch to the appropriate attribution model."""
    if model_name == "first-touch":
        return first_touch_attribution(journeys)
    elif model_name == "last-touch":
        return last_touch_attribution(journeys)
    elif model_name == "linear":
        return linear_attribution(journeys)
    elif model_name == "time-decay":
        return time_decay_attribution(journeys, half_life)
    elif model_name == "position-based":
        return position_based_attribution(journeys)
    else:
        raise ValueError(f"Unknown model: {model_name}. Choose from: {', '.join(MODELS)}")


def compute_summary(journeys: List[Dict]) -> Dict[str, Any]:
    """Compute summary statistics about the journey data."""
    total_journeys = len(journeys)
    converted = sum(1 for j in journeys if j.get("converted", False))
    total_revenue = sum(j.get("revenue", 0.0) for j in journeys if j.get("converted", False))
    all_channels = set()
    for j in journeys:
        for tp in j.get("touchpoints", []):
            all_channels.add(tp["channel"])

    return {
        "total_journeys": total_journeys,
        "converted_journeys": converted,
        "conversion_rate": round(safe_divide(converted, total_journeys) * 100, 2),
        "total_revenue": round(total_revenue, 2),
        "channels_observed": sorted(all_channels),
    }


def format_text(results: Dict[str, Any]) -> str:
    """Format results as human-readable text."""
    lines: List[str] = []
    lines.append("=" * 70)
    lines.append("MULTI-TOUCH ATTRIBUTION ANALYSIS")
    lines.append("=" * 70)

    summary = results["summary"]
    lines.append("")
    lines.append("SUMMARY")
    lines.append(f"  Total Journeys:     {summary['total_journeys']}")
    lines.append(f"  Converted:          {summary['converted_journeys']}")
    lines.append(f"  Conversion Rate:    {summary['conversion_rate']}%")
    lines.append(f"  Total Revenue:      ${summary['total_revenue']:,.2f}")
    lines.append(f"  Channels Observed:  {', '.join(summary['channels_observed'])}")

    for model_name, credits in results["models"].items():
        lines.append("")
        lines.append("-" * 70)
        lines.append(f"MODEL: {model_name.upper()}")
        lines.append("-" * 70)

        if not credits:
            lines.append("  No conversions to attribute.")
            continue

        total_credit = sum(credits.values())
        sorted_channels = sorted(credits.items(), key=lambda x: x[1], reverse=True)

        lines.append(f"  {'Channel':<25} {'Revenue Credit':>15} {'Share':>10}")
        lines.append(f"  {'-'*25} {'-'*15} {'-'*10}")

        for channel, credit in sorted_channels:
            pct = safe_divide(credit, total_credit) * 100
            lines.append(f"  {channel:<25} ${credit:>13,.2f} {pct:>8.1f}%")

        lines.append(f"  {'TOTAL':<25} ${total_credit:>13,.2f} {'100.0%':>10}")

    # Comparison table
    if len(results["models"]) > 1:
        lines.append("")
        lines.append("=" * 70)
        lines.append("CROSS-MODEL COMPARISON")
        lines.append("=" * 70)

        all_channels = set()
        for credits in results["models"].values():
            all_channels.update(credits.keys())
        all_channels_sorted = sorted(all_channels)

        model_names = list(results["models"].keys())
        header = f"  {'Channel':<20}"
        for mn in model_names:
            short = mn.replace("-", " ").title()
            header += f" {short:>14}"
        lines.append(header)
        lines.append(f"  {'-'*20}" + f" {'-'*14}" * len(model_names))

        for ch in all_channels_sorted:
            row = f"  {ch:<20}"
            for mn in model_names:
                val = results["models"][mn].get(ch, 0.0)
                row += f" ${val:>12,.2f}"
            lines.append(row)

    lines.append("")
    return "\n".join(lines)


def main() -> None:
    """Main entry point for the attribution analyzer."""
    parser = argparse.ArgumentParser(
        description="Multi-touch attribution analyzer for marketing campaigns.",
        epilog="Example: python attribution_analyzer.py data.json --model linear --format json",
    )
    parser.add_argument(
        "input_file",
        help="Path to JSON file containing journey/touchpoint data",
    )
    parser.add_argument(
        "--model",
        choices=MODELS,
        default=None,
        help="Run a specific attribution model (default: run all 5 models)",
    )
    parser.add_argument(
        "--half-life",
        type=float,
        default=7.0,
        help="Half-life in days for time-decay model (default: 7)",
    )
    parser.add_argument(
        "--format",
        choices=["json", "text"],
        default="text",
        dest="output_format",
        help="Output format (default: text)",
    )

    args = parser.parse_args()

    # Load input data
    try:
        with open(args.input_file, "r") as f:
            data = json.load(f)
    except FileNotFoundError:
        print(f"Error: File not found: {args.input_file}", file=sys.stderr)
        sys.exit(1)
    except json.JSONDecodeError as e:
        print(f"Error: Invalid JSON in {args.input_file}: {e}", file=sys.stderr)
        sys.exit(1)

    journeys = data.get("journeys", [])
    if not journeys:
        print("Error: No 'journeys' array found in input data.", file=sys.stderr)
        sys.exit(1)

    # Determine which models to run
    models_to_run = [args.model] if args.model else MODELS

    # Run models
    model_results: Dict[str, Dict[str, float]] = {}
    for model_name in models_to_run:
        credits = run_model(model_name, journeys, args.half_life)
        model_results[model_name] = {ch: round(v, 2) for ch, v in credits.items()}

    # Build output
    results: Dict[str, Any] = {
        "summary": compute_summary(journeys),
        "models": model_results,
    }

    if args.output_format == "json":
        print(json.dumps(results, indent=2))
    else:
        print(format_text(results))


if __name__ == "__main__":
    main()
