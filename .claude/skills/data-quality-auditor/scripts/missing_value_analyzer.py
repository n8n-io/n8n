#!/usr/bin/env python3
"""
missing_value_analyzer.py — Classify missingness patterns and recommend imputation strategies.

Usage:
    python3 missing_value_analyzer.py --file data.csv
    python3 missing_value_analyzer.py --file data.csv --threshold 0.05
    python3 missing_value_analyzer.py --file data.csv --format json
"""

import argparse
import csv
import json
import sys
from collections import defaultdict


NULL_STRINGS = {"", "null", "none", "n/a", "na", "nan", "nil", "undefined", "missing"}


def load_csv(filepath: str) -> tuple[list[str], list[dict]]:
    with open(filepath, newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        rows = list(reader)
        headers = reader.fieldnames or []
    return headers, rows


def is_null(val: str) -> bool:
    return val.strip().lower() in NULL_STRINGS


def compute_null_mask(headers: list[str], rows: list[dict]) -> dict[str, list[bool]]:
    return {col: [is_null(row.get(col, "")) for row in rows] for col in headers}


def null_stats(mask: list[bool]) -> dict:
    total = len(mask)
    count = sum(mask)
    return {"count": count, "pct": round(count / total * 100, 2) if total else 0}


def classify_mechanism(col: str, mask: list[bool], all_masks: dict[str, list[bool]]) -> str:
    """
    Heuristic classification of missingness mechanism:
    - MCAR: nulls appear randomly, no correlation with other columns
    - MAR:  nulls correlate with values in other observed columns
    - MNAR: nulls correlate with the missing column's own unobserved value (can't fully detect)

    Returns one of: "MCAR (likely)", "MAR (likely)", "MNAR (possible)", "Insufficient data"
    """
    null_indices = {i for i, v in enumerate(mask) if v}
    if not null_indices:
        return "None"

    n = len(mask)
    if n < 10:
        return "Insufficient data"

    # Check correlation with other columns' nulls
    correlated_cols = []
    for other_col, other_mask in all_masks.items():
        if other_col == col:
            continue
        other_null_indices = {i for i, v in enumerate(other_mask) if v}
        if not other_null_indices:
            continue
        overlap = len(null_indices & other_null_indices)
        union = len(null_indices | other_null_indices)
        jaccard = overlap / union if union else 0
        if jaccard > 0.5:
            correlated_cols.append(other_col)

    # Check if nulls are clustered (time/positional pattern) — proxy for MNAR
    sorted_indices = sorted(null_indices)
    if len(sorted_indices) > 2:
        gaps = [sorted_indices[i + 1] - sorted_indices[i] for i in range(len(sorted_indices) - 1)]
        avg_gap = sum(gaps) / len(gaps)
        clustered = avg_gap < n / len(null_indices) * 0.5  # nulls appear closer together than random
    else:
        clustered = False

    if correlated_cols:
        return f"MAR (likely) — co-occurs with nulls in: {', '.join(correlated_cols[:3])}"
    elif clustered:
        return "MNAR (possible) — nulls are spatially clustered, may reflect a systematic gap"
    else:
        return "MCAR (likely) — nulls appear random, no strong correlation detected"


def recommend_strategy(pct: float, col_type: str) -> str:
    if pct == 0:
        return "No action needed"
    if pct < 1:
        return "Drop rows — impact is negligible"
    if pct < 10:
        strategies = {
            "int": "Impute with median + add binary indicator column",
            "float": "Impute with median + add binary indicator column",
            "string": "Impute with mode or 'Unknown' category + add indicator",
            "bool": "Impute with mode",
        }
        return strategies.get(col_type, "Impute with median/mode + add indicator")
    if pct < 30:
        return "Impute cautiously; investigate root cause; document assumption; add indicator"
    return "Do NOT impute blindly — > 30% missing. Escalate to domain owner or consider dropping column"


def infer_type(values: list[str]) -> str:
    non_null = [v for v in values if not is_null(v)]
    counts = {"int": 0, "float": 0, "bool": 0, "string": 0}
    for v in non_null[:200]:  # sample for speed
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
    return max(counts, key=lambda k: counts[k]) if any(counts.values()) else "string"


def compute_cooccurrence(headers: list[str], masks: dict[str, list[bool]], top_n: int = 5) -> list[dict]:
    """Find column pairs where nulls most frequently co-occur."""
    pairs = []
    cols = list(headers)
    for i in range(len(cols)):
        for j in range(i + 1, len(cols)):
            a, b = cols[i], cols[j]
            mask_a, mask_b = masks[a], masks[b]
            overlap = sum(1 for x, y in zip(mask_a, mask_b) if x and y)
            if overlap > 0:
                pairs.append({"col_a": a, "col_b": b, "co_null_rows": overlap})
    pairs.sort(key=lambda x: -x["co_null_rows"])
    return pairs[:top_n]


def print_report(headers: list[str], rows: list[dict], masks: dict, threshold: float):
    total = len(rows)
    print("=" * 64)
    print("MISSING VALUE ANALYSIS REPORT")
    print("=" * 64)
    print(f"Rows: {total}  |  Columns: {len(headers)}")

    results = []
    for col in headers:
        mask = masks[col]
        stats = null_stats(mask)
        if stats["pct"] / 100 < threshold and stats["count"] > 0:
            continue
        raw_vals = [row.get(col, "") for row in rows]
        col_type = infer_type(raw_vals)
        mechanism = classify_mechanism(col, mask, masks)
        strategy = recommend_strategy(stats["pct"], col_type)
        results.append({
            "column": col,
            "null_count": stats["count"],
            "null_pct": stats["pct"],
            "col_type": col_type,
            "mechanism": mechanism,
            "strategy": strategy,
        })

    fully_complete = [col for col in headers if null_stats(masks[col])["count"] == 0]
    print(f"\nFully complete columns: {len(fully_complete)}/{len(headers)}")

    if not results:
        print(f"\nNo columns exceed the null threshold ({threshold * 100:.1f}%).")
    else:
        print(f"\nColumns with missing values (threshold >= {threshold * 100:.1f}%):\n")
        for r in sorted(results, key=lambda x: -x["null_pct"]):
            indicator = "🔴" if r["null_pct"] > 30 else ("🟡" if r["null_pct"] > 10 else "🟢")
            print(f"  {indicator} {r['column']}")
            print(f"     Nulls: {r['null_count']} ({r['null_pct']}%)  |  Type: {r['col_type']}")
            print(f"     Mechanism: {r['mechanism']}")
            print(f"     Strategy:  {r['strategy']}")
            print()

    cooccur = compute_cooccurrence(headers, masks)
    if cooccur:
        print("-" * 64)
        print("NULL CO-OCCURRENCE (top pairs)")
        print("-" * 64)
        for pair in cooccur:
            print(f"  {pair['col_a']} + {pair['col_b']}  →  {pair['co_null_rows']} rows both null")

    print("\n" + "=" * 64)


def main():
    parser = argparse.ArgumentParser(description="Analyze missing values in a CSV dataset.")
    parser.add_argument("--file", required=True, help="Path to CSV file")
    parser.add_argument("--threshold", type=float, default=0.0,
                        help="Only show columns with null fraction above this (e.g. 0.05 = 5%%)")
    parser.add_argument("--format", choices=["text", "json"], default="text")
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
        print("Error: CSV file is empty.", file=sys.stderr)
        sys.exit(1)

    masks = compute_null_mask(headers, rows)

    if args.format == "json":
        output = []
        for col in headers:
            mask = masks[col]
            stats = null_stats(mask)
            raw_vals = [row.get(col, "") for row in rows]
            col_type = infer_type(raw_vals)
            mechanism = classify_mechanism(col, mask, masks)
            strategy = recommend_strategy(stats["pct"], col_type)
            output.append({
                "column": col,
                "null_count": stats["count"],
                "null_pct": stats["pct"],
                "col_type": col_type,
                "mechanism": mechanism,
                "strategy": strategy,
            })
        print(json.dumps({"total_rows": len(rows), "columns": output}, indent=2))
    else:
        print_report(headers, rows, masks, args.threshold)


if __name__ == "__main__":
    main()
