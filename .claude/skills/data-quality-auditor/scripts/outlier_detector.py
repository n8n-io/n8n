#!/usr/bin/env python3
from __future__ import annotations
"""
outlier_detector.py — Multi-method outlier detection for numeric columns.

Methods:
  iqr     — Interquartile Range (robust, non-parametric, default)
  zscore  — Standard Z-score (assumes normal distribution)
  mzscore — Modified Z-score via Median Absolute Deviation (robust to skew)

Usage:
    python3 outlier_detector.py --file data.csv
    python3 outlier_detector.py --file data.csv --method iqr
    python3 outlier_detector.py --file data.csv --method zscore --threshold 2.5
    python3 outlier_detector.py --file data.csv --columns col1,col2
    python3 outlier_detector.py --file data.csv --format json
"""

import argparse
import csv
import json
import math
import sys


NULL_STRINGS = {"", "null", "none", "n/a", "na", "nan", "nil", "undefined", "missing"}


def load_csv(filepath: str) -> tuple[list[str], list[dict]]:
    with open(filepath, newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        rows = list(reader)
        headers = reader.fieldnames or []
    return headers, rows


def is_null(val: str) -> bool:
    return val.strip().lower() in NULL_STRINGS


def to_float(val: str) -> float | None:
    try:
        return float(val.strip())
    except (ValueError, AttributeError):
        return None


def median(nums: list[float]) -> float:
    s = sorted(nums)
    n = len(s)
    mid = n // 2
    return s[mid] if n % 2 else (s[mid - 1] + s[mid]) / 2


def percentile(nums: list[float], p: float) -> float:
    """Linear interpolation percentile."""
    s = sorted(nums)
    n = len(s)
    if n == 1:
        return s[0]
    idx = p / 100 * (n - 1)
    lo = int(idx)
    hi = lo + 1
    frac = idx - lo
    if hi >= n:
        return s[-1]
    return s[lo] + frac * (s[hi] - s[lo])


def mean(nums: list[float]) -> float:
    return sum(nums) / len(nums)


def std(nums: list[float], mu: float) -> float:
    if len(nums) < 2:
        return 0.0
    variance = sum((x - mu) ** 2 for x in nums) / (len(nums) - 1)
    return math.sqrt(variance)


# --- Detection methods ---

def detect_iqr(nums: list[float], multiplier: float = 1.5) -> dict:
    q1 = percentile(nums, 25)
    q3 = percentile(nums, 75)
    iqr = q3 - q1
    lower = q1 - multiplier * iqr
    upper = q3 + multiplier * iqr
    outliers = [x for x in nums if x < lower or x > upper]
    return {
        "method": "IQR",
        "q1": round(q1, 4),
        "q3": round(q3, 4),
        "iqr": round(iqr, 4),
        "lower_bound": round(lower, 4),
        "upper_bound": round(upper, 4),
        "outlier_count": len(outliers),
        "outlier_pct": round(len(outliers) / len(nums) * 100, 2),
        "outlier_values": sorted(set(round(x, 4) for x in outliers))[:10],
    }


def detect_zscore(nums: list[float], threshold: float = 3.0) -> dict:
    mu = mean(nums)
    sigma = std(nums, mu)
    if sigma == 0:
        return {"method": "Z-score", "outlier_count": 0, "outlier_pct": 0.0,
                "note": "Zero variance — all values identical"}
    zscores = [(x, abs((x - mu) / sigma)) for x in nums]
    outliers = [x for x, z in zscores if z > threshold]
    return {
        "method": "Z-score",
        "mean": round(mu, 4),
        "std": round(sigma, 4),
        "threshold": threshold,
        "outlier_count": len(outliers),
        "outlier_pct": round(len(outliers) / len(nums) * 100, 2),
        "outlier_values": sorted(set(round(x, 4) for x in outliers))[:10],
    }


def detect_modified_zscore(nums: list[float], threshold: float = 3.5) -> dict:
    """Iglewicz-Hoaglin modified Z-score using Median Absolute Deviation."""
    med = median(nums)
    mad = median([abs(x - med) for x in nums])
    if mad == 0:
        return {"method": "Modified Z-score (MAD)", "outlier_count": 0, "outlier_pct": 0.0,
                "note": "MAD is zero — consider Z-score instead"}
    mzscores = [(x, 0.6745 * abs(x - med) / mad) for x in nums]
    outliers = [x for x, mz in mzscores if mz > threshold]
    return {
        "method": "Modified Z-score (MAD)",
        "median": round(med, 4),
        "mad": round(mad, 4),
        "threshold": threshold,
        "outlier_count": len(outliers),
        "outlier_pct": round(len(outliers) / len(nums) * 100, 2),
        "outlier_values": sorted(set(round(x, 4) for x in outliers))[:10],
    }


def classify_outlier_risk(pct: float, col: str) -> str:
    """Heuristic: flag whether outliers are likely data errors or legitimate extremes."""
    if pct > 10:
        return "High outlier rate — likely systematic data quality issue or wrong data type"
    if pct > 5:
        return "Elevated outlier rate — investigate source; may be mixed populations"
    if pct > 1:
        return "Moderate — review individually; could be legitimate extremes or entry errors"
    if pct > 0:
        return "Low — verify extreme values against source; likely legitimate but worth checking"
    return "Clean — no outliers detected"


def analyze_column(col: str, nums: list[float], method: str, threshold: float) -> dict:
    if len(nums) < 4:
        return {"column": col, "status": "Skipped — fewer than 4 numeric values"}

    if method == "iqr":
        result = detect_iqr(nums, multiplier=threshold if threshold != 3.0 else 1.5)
    elif method == "zscore":
        result = detect_zscore(nums, threshold=threshold)
    elif method == "mzscore":
        result = detect_modified_zscore(nums, threshold=threshold)
    else:
        result = detect_iqr(nums)

    result["column"] = col
    result["total_numeric"] = len(nums)
    result["risk_assessment"] = classify_outlier_risk(result.get("outlier_pct", 0), col)
    return result


def print_report(results: list[dict]):
    print("=" * 64)
    print("OUTLIER DETECTION REPORT")
    print("=" * 64)

    clean = [r for r in results if r.get("outlier_count", 0) == 0 and "status" not in r]
    flagged = [r for r in results if r.get("outlier_count", 0) > 0]
    skipped = [r for r in results if "status" in r]

    print(f"\nColumns analyzed: {len(results) - len(skipped)}")
    print(f"Clean:   {len(clean)}")
    print(f"Flagged: {len(flagged)}")
    if skipped:
        print(f"Skipped: {len(skipped)} ({', '.join(r['column'] for r in skipped)})")

    if flagged:
        print("\n" + "-" * 64)
        print("FLAGGED COLUMNS")
        print("-" * 64)
        for r in sorted(flagged, key=lambda x: -x.get("outlier_pct", 0)):
            pct = r.get("outlier_pct", 0)
            indicator = "🔴" if pct > 5 else "🟡"
            print(f"\n  {indicator} {r['column']} ({r['method']})")
            print(f"     Outliers: {r['outlier_count']} / {r['total_numeric']} rows ({pct}%)")
            if "lower_bound" in r:
                print(f"     Bounds: [{r['lower_bound']}, {r['upper_bound']}]  |  IQR: {r['iqr']}")
            if "mean" in r:
                print(f"     Mean: {r['mean']}  |  Std: {r['std']}  |  Threshold: ±{r['threshold']}σ")
            if "median" in r:
                print(f"     Median: {r['median']}  |  MAD: {r['mad']}  |  Threshold: {r['threshold']}")
            if r.get("outlier_values"):
                vals = ", ".join(str(v) for v in r["outlier_values"][:8])
                print(f"     Sample outlier values: {vals}")
            print(f"     Assessment: {r['risk_assessment']}")

    if clean:
        cols = ", ".join(r["column"] for r in clean)
        print(f"\n🟢 Clean columns: {cols}")

    print("\n" + "=" * 64)


def main():
    parser = argparse.ArgumentParser(description="Detect outliers in numeric columns of a CSV dataset.")
    parser.add_argument("--file", required=True, help="Path to CSV file")
    parser.add_argument("--method", choices=["iqr", "zscore", "mzscore"], default="iqr",
                        help="Detection method (default: iqr)")
    parser.add_argument("--threshold", type=float, default=None,
                        help="Method threshold (IQR multiplier default 1.5; Z-score default 3.0; mzscore default 3.5)")
    parser.add_argument("--columns", help="Comma-separated columns to check (default: all numeric)")
    parser.add_argument("--format", choices=["text", "json"], default="text")
    args = parser.parse_args()

    # Set default thresholds per method
    if args.threshold is None:
        args.threshold = {"iqr": 1.5, "zscore": 3.0, "mzscore": 3.5}[args.method]

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

    selected = args.columns.split(",") if args.columns else headers
    missing_cols = [c for c in selected if c not in headers]
    if missing_cols:
        print(f"Error: columns not found: {', '.join(missing_cols)}", file=sys.stderr)
        sys.exit(1)

    results = []
    for col in selected:
        raw = [row.get(col, "") for row in rows]
        nums = [n for v in raw if not is_null(v) and (n := to_float(v)) is not None]
        results.append(analyze_column(col, nums, args.method, args.threshold))

    if args.format == "json":
        print(json.dumps(results, indent=2))
    else:
        print_report(results)


if __name__ == "__main__":
    main()
