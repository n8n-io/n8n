#!/usr/bin/env python3
"""
Funnel Analyzer - Conversion funnel analysis with bottleneck detection.

Analyzes marketing/sales funnels to identify:
  - Stage-to-stage conversion rates and drop-off percentages
  - Biggest bottleneck (largest absolute and relative drops)
  - Overall funnel conversion rate
  - Segment comparison when multiple segments are provided

Usage:
    python funnel_analyzer.py funnel_data.json
    python funnel_analyzer.py funnel_data.json --format json
"""

import argparse
import json
import sys
from typing import Any, Dict, List, Optional


def safe_divide(numerator: float, denominator: float, default: float = 0.0) -> float:
    """Safely divide two numbers, returning default if denominator is zero."""
    if denominator == 0:
        return default
    return numerator / denominator


def analyze_funnel(stages: List[str], counts: List[int]) -> Dict[str, Any]:
    """Analyze a single funnel and return stage-by-stage metrics.

    Args:
        stages: Ordered list of funnel stage names (top to bottom).
        counts: Corresponding counts at each stage.

    Returns:
        Dictionary with stage metrics, bottleneck info, and overall conversion.
    """
    if len(stages) != len(counts):
        raise ValueError("Number of stages must match number of counts.")
    if not stages:
        raise ValueError("Funnel must have at least one stage.")

    stage_metrics: List[Dict[str, Any]] = []
    max_dropoff_abs = 0
    max_dropoff_rel = 0.0
    bottleneck_abs: Optional[str] = None
    bottleneck_rel: Optional[str] = None

    for i, (stage, count) in enumerate(zip(stages, counts)):
        metric: Dict[str, Any] = {
            "stage": stage,
            "count": count,
            "cumulative_conversion": round(safe_divide(count, counts[0]) * 100, 2),
        }

        if i > 0:
            prev_count = counts[i - 1]
            dropoff = prev_count - count
            conversion_rate = safe_divide(count, prev_count) * 100
            dropoff_rate = 100 - conversion_rate

            metric["from_previous"] = stages[i - 1]
            metric["conversion_rate"] = round(conversion_rate, 2)
            metric["dropoff_count"] = dropoff
            metric["dropoff_rate"] = round(dropoff_rate, 2)

            # Track biggest absolute drop-off
            if dropoff > max_dropoff_abs:
                max_dropoff_abs = dropoff
                bottleneck_abs = f"{stages[i-1]} -> {stage}"

            # Track biggest relative drop-off
            if dropoff_rate > max_dropoff_rel:
                max_dropoff_rel = dropoff_rate
                bottleneck_rel = f"{stages[i-1]} -> {stage}"
        else:
            metric["conversion_rate"] = 100.0
            metric["dropoff_count"] = 0
            metric["dropoff_rate"] = 0.0

        stage_metrics.append(metric)

    overall_conversion = safe_divide(counts[-1], counts[0]) * 100

    return {
        "stage_metrics": stage_metrics,
        "overall_conversion_rate": round(overall_conversion, 2),
        "total_entries": counts[0],
        "total_conversions": counts[-1],
        "total_lost": counts[0] - counts[-1],
        "bottleneck_absolute": {
            "transition": bottleneck_abs,
            "dropoff_count": max_dropoff_abs,
        },
        "bottleneck_relative": {
            "transition": bottleneck_rel,
            "dropoff_rate": round(max_dropoff_rel, 2),
        },
    }


def compare_segments(segments: Dict[str, Dict[str, Any]], stages: List[str]) -> Dict[str, Any]:
    """Compare funnel performance across segments.

    Args:
        segments: Dict mapping segment name to {"counts": [...]}.
        stages: Shared stage names for all segments.

    Returns:
        Comparison data with per-segment analysis and relative rankings.
    """
    segment_results: Dict[str, Dict[str, Any]] = {}

    for seg_name, seg_data in segments.items():
        counts = seg_data.get("counts", [])
        if len(counts) != len(stages):
            raise ValueError(
                f"Segment '{seg_name}' has {len(counts)} counts but {len(stages)} stages."
            )
        segment_results[seg_name] = analyze_funnel(stages, counts)

    # Rank segments by overall conversion rate
    ranked = sorted(
        segment_results.items(),
        key=lambda x: x[1]["overall_conversion_rate"],
        reverse=True,
    )
    rankings = [
        {
            "rank": i + 1,
            "segment": name,
            "overall_conversion_rate": result["overall_conversion_rate"],
            "total_entries": result["total_entries"],
            "total_conversions": result["total_conversions"],
        }
        for i, (name, result) in enumerate(ranked)
    ]

    # Stage-by-stage comparison
    stage_comparison: List[Dict[str, Any]] = []
    for i, stage in enumerate(stages):
        stage_data: Dict[str, Any] = {"stage": stage}
        for seg_name in segments:
            metrics = segment_results[seg_name]["stage_metrics"][i]
            stage_data[seg_name] = {
                "count": metrics["count"],
                "conversion_rate": metrics["conversion_rate"],
            }
        stage_comparison.append(stage_data)

    return {
        "segment_results": segment_results,
        "rankings": rankings,
        "stage_comparison": stage_comparison,
    }


def format_single_funnel_text(analysis: Dict[str, Any], title: str = "FUNNEL") -> str:
    """Format a single funnel analysis as human-readable text."""
    lines: List[str] = []
    lines.append(f"  {title}")
    lines.append(f"  {'='*60}")
    lines.append(f"  Total Entries:      {analysis['total_entries']:,}")
    lines.append(f"  Total Conversions:  {analysis['total_conversions']:,}")
    lines.append(f"  Total Lost:         {analysis['total_lost']:,}")
    lines.append(f"  Overall Conversion: {analysis['overall_conversion_rate']}%")
    lines.append("")

    lines.append(f"  {'Stage':<20} {'Count':>10} {'Conv Rate':>12} {'Drop-off':>12} {'Cumulative':>12}")
    lines.append(f"  {'-'*20} {'-'*10} {'-'*12} {'-'*12} {'-'*12}")

    for m in analysis["stage_metrics"]:
        stage = m["stage"]
        count = m["count"]
        conv = f"{m['conversion_rate']:.1f}%"
        drop = f"-{m['dropoff_count']:,} ({m['dropoff_rate']:.1f}%)" if m["dropoff_count"] > 0 else "-"
        cumul = f"{m['cumulative_conversion']:.1f}%"
        lines.append(f"  {stage:<20} {count:>10,} {conv:>12} {drop:>12} {cumul:>12}")

    lines.append("")
    bn_abs = analysis["bottleneck_absolute"]
    bn_rel = analysis["bottleneck_relative"]
    lines.append(f"  BOTTLENECK (Absolute): {bn_abs['transition']} (lost {bn_abs['dropoff_count']:,})")
    lines.append(f"  BOTTLENECK (Relative): {bn_rel['transition']} ({bn_rel['dropoff_rate']}% drop-off)")

    return "\n".join(lines)


def format_text(results: Dict[str, Any]) -> str:
    """Format full results as human-readable text output."""
    lines: List[str] = []
    lines.append("=" * 70)
    lines.append("FUNNEL CONVERSION ANALYSIS")
    lines.append("=" * 70)

    if "stage_comparison" in results:
        # Multi-segment output
        lines.append("")
        lines.append("SEGMENT RANKINGS")
        lines.append(f"  {'Rank':>4} {'Segment':<25} {'Conversion':>12} {'Entries':>10} {'Conversions':>12}")
        lines.append(f"  {'-'*4} {'-'*25} {'-'*12} {'-'*10} {'-'*12}")
        for r in results["rankings"]:
            lines.append(
                f"  {r['rank']:>4} {r['segment']:<25} {r['overall_conversion_rate']:>11.2f}% "
                f"{r['total_entries']:>10,} {r['total_conversions']:>12,}"
            )

        lines.append("")
        for seg_name, seg_result in results["segment_results"].items():
            lines.append("")
            lines.append(format_single_funnel_text(seg_result, title=f"SEGMENT: {seg_name.upper()}"))

        # Stage comparison table
        lines.append("")
        lines.append("-" * 70)
        lines.append("STAGE-BY-STAGE COMPARISON")
        lines.append("-" * 70)
        seg_names = list(results["segment_results"].keys())
        header = f"  {'Stage':<20}"
        for sn in seg_names:
            header += f" {sn:>20}"
        lines.append(header)
        lines.append(f"  {'-'*20}" + f" {'-'*20}" * len(seg_names))

        for sc in results["stage_comparison"]:
            row = f"  {sc['stage']:<20}"
            for sn in seg_names:
                data = sc[sn]
                row += f" {data['count']:>8,} ({data['conversion_rate']:>5.1f}%)"
            lines.append(row)

    else:
        # Single funnel output
        lines.append("")
        lines.append(format_single_funnel_text(results))

    lines.append("")
    return "\n".join(lines)


def main() -> None:
    """Main entry point for the funnel analyzer."""
    parser = argparse.ArgumentParser(
        description="Analyze conversion funnels with bottleneck detection and segment comparison.",
        epilog="Example: python funnel_analyzer.py funnel_data.json --format json",
    )
    parser.add_argument(
        "input_file",
        help="Path to JSON file containing funnel data",
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

    # Determine mode: single funnel vs. segment comparison
    if "segments" in data:
        # Multi-segment mode
        stages = data.get("funnel", {}).get("stages", data.get("stages", []))
        if not stages:
            print("Error: 'stages' list required for segment comparison.", file=sys.stderr)
            sys.exit(1)
        segments = data["segments"]
        if not segments:
            print("Error: 'segments' dict is empty.", file=sys.stderr)
            sys.exit(1)
        results = compare_segments(segments, stages)
    elif "funnel" in data:
        # Single funnel mode
        funnel = data["funnel"]
        stages = funnel.get("stages", [])
        counts = funnel.get("counts", [])
        if not stages or not counts:
            print("Error: 'funnel' must contain 'stages' and 'counts' arrays.", file=sys.stderr)
            sys.exit(1)
        results = analyze_funnel(stages, counts)
    else:
        print("Error: Input must contain 'funnel' or 'segments' key.", file=sys.stderr)
        sys.exit(1)

    if args.output_format == "json":
        print(json.dumps(results, indent=2))
    else:
        print(format_text(results))


if __name__ == "__main__":
    main()
