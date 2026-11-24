#!/usr/bin/env python3
"""Product metrics calculator: retention, cohort matrix, and funnel conversion."""

import argparse
import csv
import datetime as dt
import json
import sys
from collections import defaultdict


def parse_date(value: str) -> dt.date:
    return dt.date.fromisoformat(value.strip()[:10])


def load_csv(path: str):
    with open(path, "r", encoding="utf-8", newline="") as handle:
        return list(csv.DictReader(handle))


def retention(args: argparse.Namespace) -> int:
    rows = load_csv(args.input)
    cohorts = {}
    activity = defaultdict(set)

    for row in rows:
        user = row[args.user_column].strip()
        cohort_date = parse_date(row[args.cohort_column])
        activity_date = parse_date(row[args.activity_column])
        cohorts[user] = min(cohorts.get(user, cohort_date), cohort_date)
        delta = (activity_date - cohorts[user]).days
        if delta >= 0:
            activity[delta].add(user)

    base_users = len(cohorts)
    if base_users == 0:
        print("No users found.", file=sys.stderr)
        return 1

    results = []
    for period in range(0, args.max_period + 1):
        users = len(activity.get(period, set()))
        rate = users / base_users
        results.append({"period": period, "active_users": users, "retention_rate": round(rate, 4)})

    if getattr(args, "format", "text") == "json":
        print(json.dumps({"base_users": base_users, "periods": results}, indent=2))
    else:
        print("Retention by period")
        print("period,active_users,retention_rate")
        for r in results:
            print(f"{r['period']},{r['active_users']},{r['retention_rate']:.4f}")
    return 0


def cohort(args: argparse.Namespace) -> int:
    rows = load_csv(args.input)
    cohorts = {}
    activity = defaultdict(set)

    for row in rows:
        user = row[args.user_column].strip()
        cohort_date = parse_date(row[args.cohort_column])
        activity_date = parse_date(row[args.activity_column])

        if args.cohort_grain == "month":
            cohort_key = cohort_date.strftime("%Y-%m")
        else:
            cohort_key = f"{cohort_date.isocalendar().year}-W{cohort_date.isocalendar().week:02d}"

        cohorts.setdefault(user, cohort_key)
        age = (activity_date - cohort_date).days
        if age >= 0:
            activity[(cohort_key, age)].add(user)

    cohort_sizes = defaultdict(int)
    for cohort_key in cohorts.values():
        cohort_sizes[cohort_key] += 1

    cohort_keys = sorted(cohort_sizes.keys())
    results = []
    for cohort_key in cohort_keys:
        size = cohort_sizes[cohort_key]
        for age in range(0, args.max_period + 1):
            active = len(activity.get((cohort_key, age), set()))
            rate = (active / size) if size else 0
            results.append({"cohort": cohort_key, "age_days": age, "active_users": active,
                            "cohort_size": size, "retention_rate": round(rate, 4)})

    if getattr(args, "format", "text") == "json":
        print(json.dumps({"cohorts": dict(cohort_sizes), "rows": results}, indent=2))
    else:
        print("cohort,age_days,active_users,cohort_size,retention_rate")
        for r in results:
            print(f"{r['cohort']},{r['age_days']},{r['active_users']},{r['cohort_size']},{r['retention_rate']:.4f}")
    return 0


def funnel(args: argparse.Namespace) -> int:
    rows = load_csv(args.input)
    stages = [item.strip() for item in args.stages.split(",") if item.strip()]
    if not stages:
        print("No stages provided.")
        return 1

    stage_users = {stage: set() for stage in stages}
    for row in rows:
        user = row[args.user_column].strip()
        stage = row[args.stage_column].strip()
        if stage in stage_users:
            stage_users[stage].add(user)

    results = []
    previous_count = None
    first_count = None
    for stage in stages:
        count = len(stage_users[stage])
        if first_count is None:
            first_count = count
        conv_prev = (count / previous_count) if previous_count else 1.0
        conv_first = (count / first_count) if first_count else 0
        results.append({"stage": stage, "users": count,
                        "conversion_from_previous": round(conv_prev, 4),
                        "conversion_from_first": round(conv_first, 4)})
        previous_count = count

    if getattr(args, "format", "text") == "json":
        print(json.dumps({"stages": results}, indent=2))
    else:
        print("stage,users,conversion_from_previous,conversion_from_first")
        for r in results:
            print(f"{r['stage']},{r['users']},{r['conversion_from_previous']:.4f},{r['conversion_from_first']:.4f}")
    return 0


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="Calculate retention, cohort, and funnel metrics from CSV data."
    )
    subparsers = parser.add_subparsers(dest="command", required=True)

    common = {
        "help": "CSV input path",
    }

    fmt_help = "Output format (default: text)"

    retention_parser = subparsers.add_parser("retention", help="Calculate retention by day.")
    retention_parser.add_argument("input", **common)
    retention_parser.add_argument("--user-column", default="user_id")
    retention_parser.add_argument("--cohort-column", default="cohort_date")
    retention_parser.add_argument("--activity-column", default="activity_date")
    retention_parser.add_argument("--max-period", type=int, default=30)
    retention_parser.add_argument("--format", choices=["text", "json"], default="text", help=fmt_help)
    retention_parser.set_defaults(func=retention)

    cohort_parser = subparsers.add_parser("cohort", help="Build cohort retention matrix rows.")
    cohort_parser.add_argument("input", **common)
    cohort_parser.add_argument("--user-column", default="user_id")
    cohort_parser.add_argument("--cohort-column", default="cohort_date")
    cohort_parser.add_argument("--activity-column", default="activity_date")
    cohort_parser.add_argument("--cohort-grain", choices=["week", "month"], default="week")
    cohort_parser.add_argument("--max-period", type=int, default=30)
    cohort_parser.add_argument("--format", choices=["text", "json"], default="text", help=fmt_help)
    cohort_parser.set_defaults(func=cohort)

    funnel_parser = subparsers.add_parser("funnel", help="Calculate funnel conversion by stage.")
    funnel_parser.add_argument("input", **common)
    funnel_parser.add_argument("--user-column", default="user_id")
    funnel_parser.add_argument("--stage-column", default="stage")
    funnel_parser.add_argument("--stages", required=True)
    funnel_parser.add_argument("--format", choices=["text", "json"], default="text", help=fmt_help)
    funnel_parser.set_defaults(func=funnel)

    return parser


def main() -> int:
    parser = build_parser()
    args = parser.parse_args()
    try:
        return args.func(args)
    except FileNotFoundError:
        print(f"Error: file not found: {args.input}", file=sys.stderr)
        return 1
    except KeyError as e:
        print(f"Error: column not found in CSV: {e}", file=sys.stderr)
        return 1
    except Exception as e:
        print(f"Error: {e}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
