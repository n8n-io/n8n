#!/usr/bin/env python3
"""
ad_health_scorer.py — Weighted 0-100 ad account health score with multi-platform support.

Scores ad accounts across platform-specific categories with severity multipliers
and budget-weighted cross-platform aggregation.

Severity multipliers:
  critical = 5x weight (blocks revenue or burns budget)
  high     = 3x weight (significant impact)
  medium   = 1.5x weight (optimization opportunity)
  low      = 0.5x weight (backlog polish)

Platform category weights:
  Google:   Conversion Tracking 25%, Wasted Spend 20%, Structure 15%, Keywords 15%, Ads 15%, Settings 10%
  Meta:     Pixel/CAPI 30%, Creative 30%, Structure 20%, Audience 20%
  LinkedIn: Technical 25%, Targeting 25%, Creative 25%, Budget 25%
  TikTok:   Pixel 25%, Creative 30%, Targeting 25%, Budget 20%

Cross-platform aggregation:
  Aggregate Score = Σ(Platform_Score × Platform_Budget_Share)

Grade bands (calibrated wider — ad accounts naturally score lower):
  A = 90-100, B = 75-89, C = 60-74, D = 40-59, F = <40

Usage:
    python ad_health_scorer.py --checks checks.json
    python ad_health_scorer.py --checks checks.json --platform google --budget 5000
    python ad_health_scorer.py --multi platforms.json   # multi-platform aggregation
    python ad_health_scorer.py --demo
    python ad_health_scorer.py --demo --json
"""
from __future__ import annotations
import argparse
import json
import sys
from collections import defaultdict
from pathlib import Path

SEVERITY_MULTIPLIER = {"critical": 5.0, "high": 3.0, "medium": 1.5, "low": 0.5}

PLATFORM_WEIGHTS = {
    "google": {
        "conversion_tracking": 0.25,
        "wasted_spend": 0.20,
        "account_structure": 0.15,
        "keywords": 0.15,
        "ads": 0.15,
        "settings": 0.10,
    },
    "meta": {
        "pixel_capi": 0.30,
        "creative": 0.30,
        "structure": 0.20,
        "audience": 0.20,
    },
    "linkedin": {
        "technical": 0.25,
        "targeting": 0.25,
        "creative": 0.25,
        "budget": 0.25,
    },
    "tiktok": {
        "pixel": 0.25,
        "creative": 0.30,
        "targeting": 0.25,
        "budget": 0.20,
    },
}

DEMO_CHECKS = {
    "google": [
        {"category": "conversion_tracking", "check": "Google Ads conversion tag installed", "result": "pass", "severity": "critical"},
        {"category": "conversion_tracking", "check": "Enhanced Conversions enabled", "result": "fail", "severity": "critical", "detail": "Missing enhanced conversions — losing 15-30% attribution"},
        {"category": "conversion_tracking", "check": "Conversion window appropriate", "result": "pass", "severity": "medium"},
        {"category": "wasted_spend", "check": "Negative keyword coverage", "result": "warn", "severity": "high", "detail": "Only 12 negative keywords — review search terms report"},
        {"category": "wasted_spend", "check": "No broad match + manual CPC", "result": "pass", "severity": "critical"},
        {"category": "wasted_spend", "check": "Search terms review (last 30d)", "result": "fail", "severity": "high", "detail": "23% of spend on irrelevant terms"},
        {"category": "account_structure", "check": "Campaign naming convention", "result": "pass", "severity": "low"},
        {"category": "account_structure", "check": "Ad groups ≤ 20 keywords each", "result": "warn", "severity": "medium", "detail": "2 ad groups with 30+ keywords"},
        {"category": "keywords", "check": "No duplicate keywords across campaigns", "result": "pass", "severity": "high"},
        {"category": "keywords", "check": "Quality Score ≥ 6 on top spenders", "result": "warn", "severity": "high", "detail": "3 keywords with QS 4-5"},
        {"category": "ads", "check": "RSA with ≥ 3 headlines", "result": "pass", "severity": "medium"},
        {"category": "ads", "check": "Ad extensions active (sitelinks, callouts)", "result": "fail", "severity": "medium", "detail": "No callout extensions"},
        {"category": "settings", "check": "Location targeting correct", "result": "pass", "severity": "high"},
        {"category": "settings", "check": "Ad schedule aligned with business hours", "result": "pass", "severity": "low"},
    ],
    "meta": [
        {"category": "pixel_capi", "check": "Meta Pixel installed", "result": "pass", "severity": "critical"},
        {"category": "pixel_capi", "check": "Conversions API (CAPI) active", "result": "fail", "severity": "critical", "detail": "No server-side events — degraded attribution post-iOS14"},
        {"category": "creative", "check": "Creative diversity (≥ 3 formats)", "result": "warn", "severity": "high", "detail": "Only static images — add video and carousel"},
        {"category": "creative", "check": "No creative fatigue (CTR stable)", "result": "pass", "severity": "high"},
        {"category": "structure", "check": "CBO enabled", "result": "pass", "severity": "medium"},
        {"category": "audience", "check": "Lookalike seed ≥ 1000 users", "result": "pass", "severity": "medium"},
    ],
}


def score_platform(checks, platform):
    weights = PLATFORM_WEIGHTS.get(platform, {})
    by_category = defaultdict(list)
    for c in checks:
        by_category[c.get("category", "other")].append(c)

    category_scores = {}
    findings = []
    quick_wins = []

    for cat, cat_checks in by_category.items():
        weighted_pass = 0.0
        weighted_total = 0.0
        for check in cat_checks:
            result = check.get("result", "fail")
            severity = check.get("severity", "medium")
            mult = SEVERITY_MULTIPLIER.get(severity, 1.0)
            score = {"pass": 1.0, "warn": 0.5, "fail": 0.0}.get(result, 0.0)
            weighted_pass += score * mult
            weighted_total += mult
            if result != "pass":
                finding = {
                    "platform": platform,
                    "category": cat,
                    "check": check.get("check", ""),
                    "result": result,
                    "severity": severity,
                    "detail": check.get("detail", ""),
                }
                findings.append(finding)
                # Quick win: high/critical severity + warn (not full fail)
                if severity in ("critical", "high") and result == "warn":
                    quick_wins.append(finding)

        cat_score = (weighted_pass / weighted_total * 100) if weighted_total > 0 else 100
        category_scores[cat] = round(cat_score, 1)

    # Weighted overall
    overall = 0.0
    total_weight = 0.0
    for cat, weight in weights.items():
        if cat in category_scores:
            overall += category_scores[cat] * weight
            total_weight += weight
    overall = (overall / total_weight) if total_weight > 0 else 0.0

    if overall >= 90:
        grade = "A"
    elif overall >= 75:
        grade = "B"
    elif overall >= 60:
        grade = "C"
    elif overall >= 40:
        grade = "D"
    else:
        grade = "F"

    findings.sort(key=lambda f: {"critical": 0, "high": 1, "medium": 2, "low": 3}.get(f["severity"], 99))

    return {
        "platform": platform,
        "overall_score": round(overall, 1),
        "grade": grade,
        "category_scores": category_scores,
        "total_checks": len(checks),
        "passed": sum(1 for c in checks if c.get("result") == "pass"),
        "warnings": sum(1 for c in checks if c.get("result") == "warn"),
        "failures": sum(1 for c in checks if c.get("result") == "fail"),
        "findings": findings,
        "quick_wins": quick_wins,
    }


def aggregate_platforms(platform_results, budgets=None):
    if not budgets:
        # Equal weight
        budgets = {p["platform"]: 1.0 / len(platform_results) for p in platform_results}
    total_budget = sum(budgets.values())
    shares = {k: v / total_budget for k, v in budgets.items()}

    aggregate = 0.0
    for pr in platform_results:
        share = shares.get(pr["platform"], 0)
        aggregate += pr["overall_score"] * share

    return {
        "aggregate_score": round(aggregate, 1),
        "budget_shares": {k: round(v, 2) for k, v in shares.items()},
        "platform_scores": {pr["platform"]: pr["overall_score"] for pr in platform_results},
    }


def print_report(result):
    print(f"Ad Health Score ({result['platform'].upper()}): {result['overall_score']}/100 (Grade: {result['grade']})")
    print(f"Checks: {result['total_checks']} — {result['passed']} pass, {result['warnings']} warn, {result['failures']} fail")
    print()
    print("Category Breakdown:")
    for cat, score in sorted(result["category_scores"].items()):
        bar = "█" * int(score / 5) + "░" * (20 - int(score / 5))
        print(f"  {cat:25s} {bar} {score:5.1f}/100")
    print()
    if result["quick_wins"]:
        print(f"Quick Wins ({len(result['quick_wins'])}):")
        for f in result["quick_wins"]:
            print(f"  ⚡ [{f['severity'].upper()}] {f['check']}: {f['detail']}")
        print()
    if result["findings"]:
        print(f"Findings ({len(result['findings'])}):")
        for f in result["findings"]:
            detail = f" — {f['detail']}" if f["detail"] else ""
            print(f"  [{f['severity'].upper()}/{f['result'].upper()}] {f['check']}{detail}")


def main():
    p = argparse.ArgumentParser(
        description="Compute weighted 0-100 ad account health score with severity multipliers.",
        epilog="Supports Google, Meta, LinkedIn, TikTok. Run with --demo for a sample report.",
    )
    p.add_argument("--checks", help="Path to checks JSON file (array of check objects)")
    p.add_argument("--platform", choices=list(PLATFORM_WEIGHTS.keys()), default="google")
    p.add_argument("--budget", type=float, default=None, help="Monthly budget (for multi-platform weighting)")
    p.add_argument("--multi", help="Path to multi-platform JSON {platform: {checks: [...], budget: N}}")
    p.add_argument("--json", action="store_true", help="JSON output")
    p.add_argument("--demo", action="store_true", help="Run with demo data")
    args = p.parse_args()

    if args.demo:
        results = []
        for platform, checks in DEMO_CHECKS.items():
            results.append(score_platform(checks, platform))
        agg = aggregate_platforms(results, {"google": 3000, "meta": 2000})

        if args.json:
            print(json.dumps({"platforms": results, "aggregate": agg}, indent=2))
        else:
            for r in results:
                print_report(r)
                print()
            print(f"Cross-Platform Aggregate: {agg['aggregate_score']}/100")
            print(f"Budget shares: {agg['budget_shares']}")
        return

    if args.multi:
        data = json.loads(Path(args.multi).read_text())
        results = []
        budgets = {}
        for platform, pdata in data.items():
            results.append(score_platform(pdata["checks"], platform))
            budgets[platform] = pdata.get("budget", 1000)
        agg = aggregate_platforms(results, budgets)
        if args.json:
            print(json.dumps({"platforms": results, "aggregate": agg}, indent=2))
        else:
            for r in results:
                print_report(r)
                print()
            print(f"Cross-Platform Aggregate: {agg['aggregate_score']}/100")
        return

    if args.checks:
        checks = json.loads(Path(args.checks).read_text())
        result = score_platform(checks, args.platform)
        if args.json:
            print(json.dumps(result, indent=2))
        else:
            print_report(result)
        return

    p.print_help()


if __name__ == "__main__":
    main()
