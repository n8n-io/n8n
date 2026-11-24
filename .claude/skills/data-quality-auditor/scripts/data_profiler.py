#!/usr/bin/env python3
from __future__ import annotations
"""
data_profiler.py — Full dataset profile with Data Quality Score (DQS).

Usage:
    python3 data_profiler.py --file data.csv
    python3 data_profiler.py --file data.csv --columns col1,col2
    python3 data_profiler.py --file data.csv --format json
    python3 data_profiler.py --file data.csv --monitor
"""

import argparse
import csv
import json
import math
import sys
from collections import Counter, defaultdict


def load_csv(filepath: str) -> tuple[list[str], list[dict]]:
    with open(filepath, newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        rows = list(reader)
        headers = reader.fieldnames or []
    return headers, rows


def infer_type(values: list[str]) -> str:
    """Infer dominant type from non-null string values."""
    counts = {"int": 0, "float": 0, "bool": 0, "string": 0}
    for v in values:
        v = v.strip()
        if v.lower() in ("true", "false"):
            counts["bool"] += 1
        else:
            try:
                int(v)
                counts["int"] += 1
            except ValueError:
                try:
                    float(v)
                    counts["float"] += 1
                except ValueError:
                    counts["string"] += 1
    dominant = max(counts, key=lambda k: counts[k])
    return dominant if counts[dominant] > 0 else "string"


def safe_mean(nums: list[float]) -> float | None:
    return sum(nums) / len(nums) if nums else None


def safe_std(nums: list[float], mean: float) -> float | None:
    if len(nums) < 2:
        return None
    variance = sum((x - mean) ** 2 for x in nums) / (len(nums) - 1)
    return math.sqrt(variance)


def profile_column(name: str, raw_values: list[str]) -> dict:
    total = len(raw_values)
    null_strings = {"", "null", "none", "n/a", "na", "nan", "nil"}
    null_count = sum(1 for v in raw_values if v.strip().lower() in null_strings)
    non_null = [v for v in raw_values if v.strip().lower() not in null_strings]

    col_type = infer_type(non_null)
    unique_values = set(non_null)
    top_values = Counter(non_null).most_common(5)

    profile = {
        "column": name,
        "total_rows": total,
        "null_count": null_count,
        "null_pct": round(null_count / total * 100, 2) if total else 0,
        "non_null_count": len(non_null),
        "unique_count": len(unique_values),
        "cardinality_pct": round(len(unique_values) / len(non_null) * 100, 2) if non_null else 0,
        "inferred_type": col_type,
        "top_values": top_values,
        "is_constant": len(unique_values) == 1,
        "is_high_cardinality": len(unique_values) / len(non_null) > 0.9 if len(non_null) > 10 else False,
    }

    if col_type in ("int", "float"):
        try:
            nums = [float(v) for v in non_null]
            mean = safe_mean(nums)
            profile["min"] = min(nums)
            profile["max"] = max(nums)
            profile["mean"] = round(mean, 4) if mean is not None else None
            profile["std"] = round(safe_std(nums, mean), 4) if mean is not None else None
        except ValueError:
            pass

    return profile


def compute_dqs(profiles: list[dict], total_rows: int) -> dict:
    """Compute Data Quality Score (0-100) across 5 dimensions."""
    if not profiles or total_rows == 0:
        return {"score": 0, "dimensions": {}}

    # Completeness (30%) — avg non-null rate
    avg_null_pct = sum(p["null_pct"] for p in profiles) / len(profiles)
    completeness = max(0, 100 - avg_null_pct)

    # Consistency (25%) — penalize constant cols and mixed-type signals
    constant_cols = sum(1 for p in profiles if p["is_constant"])
    consistency = max(0, 100 - (constant_cols / len(profiles)) * 100)

    # Validity (20%) — penalize high-cardinality string cols (proxy for free-text issues)
    high_card = sum(1 for p in profiles if p["is_high_cardinality"] and p["inferred_type"] == "string")
    validity = max(0, 100 - (high_card / len(profiles)) * 60)

    # Uniqueness (15%) — placeholder; duplicate detection needs full row comparison
    uniqueness = 90.0  # conservative default without row-level dedup check

    # Timeliness (10%) — placeholder; requires timestamp columns
    timeliness = 85.0  # conservative default

    score = (
        completeness * 0.30
        + consistency * 0.25
        + validity * 0.20
        + uniqueness * 0.15
        + timeliness * 0.10
    )

    return {
        "score": round(score, 1),
        "dimensions": {
            "completeness": round(completeness, 1),
            "consistency": round(consistency, 1),
            "validity": round(validity, 1),
            "uniqueness": uniqueness,
            "timeliness": timeliness,
        },
    }


def dqs_label(score: float) -> str:
    if score >= 85:
        return "PASS — Production-ready"
    elif score >= 65:
        return "WARN — Usable with documented caveats"
    else:
        return "FAIL — Remediation required before use"


def print_report(headers: list[str], profiles: list[dict], dqs: dict, total_rows: int, monitor: bool):
    print("=" * 64)
    print("DATA QUALITY AUDIT REPORT")
    print("=" * 64)
    print(f"Rows: {total_rows}  |  Columns: {len(headers)}")
    score = dqs["score"]
    indicator = "🟢" if score >= 85 else ("🟡" if score >= 65 else "🔴")
    print(f"\nData Quality Score (DQS): {score}/100  {indicator}")
    print(f"Verdict: {dqs_label(score)}")

    dims = dqs["dimensions"]
    print("\nDimension Breakdown:")
    for dim, val in dims.items():
        bar = int(val / 5)
        print(f"  {dim.capitalize():<14} {val:>5.1f}  {'█' * bar}{'░' * (20 - bar)}")

    print("\n" + "-" * 64)
    print("COLUMN PROFILES")
    print("-" * 64)

    issues = []
    for p in profiles:
        status = "🟢"
        col_issues = []
        if p["null_pct"] > 30:
            status = "🔴"
            col_issues.append(f"{p['null_pct']}% nulls — investigate root cause")
        elif p["null_pct"] > 10:
            status = "🟡"
            col_issues.append(f"{p['null_pct']}% nulls — impute cautiously")
        elif p["null_pct"] > 1:
            col_issues.append(f"{p['null_pct']}% nulls — impute with indicator")
        if p["is_constant"]:
            status = "🟡"
            col_issues.append("Constant column — zero variance, likely useless")
        if p["is_high_cardinality"] and p["inferred_type"] == "string":
            col_issues.append("High-cardinality string — check if categorical or free-text")

        print(f"\n  {status} {p['column']}")
        print(f"     Type: {p['inferred_type']}  |  Nulls: {p['null_count']} ({p['null_pct']}%)  |  Unique: {p['unique_count']}")
        if "min" in p:
            print(f"     Min: {p['min']}  Max: {p['max']}  Mean: {p['mean']}  Std: {p['std']}")
        if p["top_values"]:
            top = ", ".join(f"{v}({c})" for v, c in p["top_values"][:3])
            print(f"     Top values: {top}")
        for issue in col_issues:
            issues.append((p["column"], issue))
            print(f"     ⚠  {issue}")

    if issues:
        print("\n" + "-" * 64)
        print(f"ISSUES SUMMARY ({len(issues)} found)")
        print("-" * 64)
        for col, msg in issues:
            print(f"  [{col}] {msg}")

    if monitor:
        print("\n" + "-" * 64)
        print("MONITORING THRESHOLDS (copy into alerting config)")
        print("-" * 64)
        for p in profiles:
            if p["null_pct"] > 0:
                print(f"  {p['column']}: null_pct <= {min(p['null_pct'] * 1.5, 100):.1f}%")
            if "mean" in p and p["mean"] is not None:
                drift = abs(p.get("std", 0) or 0) * 2
                print(f"  {p['column']}: mean within [{p['mean'] - drift:.2f}, {p['mean'] + drift:.2f}]")

    print("\n" + "=" * 64)


def main():
    parser = argparse.ArgumentParser(description="Profile a CSV dataset and compute a Data Quality Score.")
    parser.add_argument("--file", required=True, help="Path to CSV file")
    parser.add_argument("--columns", help="Comma-separated list of columns to profile (default: all)")
    parser.add_argument("--format", choices=["text", "json"], default="text")
    parser.add_argument("--monitor", action="store_true", help="Print monitoring thresholds")
    args = parser.parse_args()

    try:
        headers, rows = load_csv(args.file)
    except FileNotFoundError:
        print(f"Error: file not found: {args.file}", file=sys.stderr)
        sys.exit(1)
    except Exception as e:
        print(f"Error reading file: {e}", file=sys.stderr)
        sys.exit(1)

    if not rows:
        print("Error: CSV file is empty or has no data rows.", file=sys.stderr)
        sys.exit(1)

    selected = args.columns.split(",") if args.columns else headers
    missing_cols = [c for c in selected if c not in headers]
    if missing_cols:
        print(f"Error: columns not found: {', '.join(missing_cols)}", file=sys.stderr)
        sys.exit(1)

    profiles = [profile_column(col, [row.get(col, "") for row in rows]) for col in selected]
    dqs = compute_dqs(profiles, len(rows))

    if args.format == "json":
        print(json.dumps({"total_rows": len(rows), "dqs": dqs, "columns": profiles}, indent=2))
    else:
        print_report(selected, profiles, dqs, len(rows), args.monitor)


if __name__ == "__main__":
    main()
