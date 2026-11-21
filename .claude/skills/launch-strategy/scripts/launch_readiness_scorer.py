#!/usr/bin/env python3
"""
launch_readiness_scorer.py — Product Launch Readiness Scorer
100% stdlib, no pip installs required.

Usage:
    python3 launch_readiness_scorer.py                          # demo mode
    python3 launch_readiness_scorer.py --checklist checklist.json
    python3 launch_readiness_scorer.py --checklist checklist.json --json
    python3 launch_readiness_scorer.py --export-template > my_checklist.json

checklist.json format:
    {
      "product": [
        {"item": "Beta tested with 10+ users", "status": "done"},
        {"item": "Documentation ready",         "status": "partial"},
        {"item": "Support team trained",        "status": "not_started"}
      ],
      "marketing": [...],
      "technical": [...]
    }

Valid status values: "done" | "partial" | "not_started"
"""

import argparse
import json
import sys
from datetime import datetime, timezone


# ---------------------------------------------------------------------------
# Default checklist template
# ---------------------------------------------------------------------------

DEFAULT_CHECKLIST = {
    "product": [
        {"item": "Beta tested with real users (≥10)",          "status": "done",        "weight": 3},
        {"item": "Core user journey validated end-to-end",     "status": "done",        "weight": 3},
        {"item": "Known P0/P1 bugs resolved",                  "status": "partial",     "weight": 3},
        {"item": "User-facing documentation complete",         "status": "partial",     "weight": 2},
        {"item": "In-app onboarding / empty states ready",     "status": "done",        "weight": 2},
        {"item": "Support team trained on common Q&A",         "status": "not_started", "weight": 2},
        {"item": "Pricing finalised and live",                  "status": "done",        "weight": 2},
        {"item": "Accessibility basics checked (WCAG AA)",     "status": "not_started", "weight": 1},
        {"item": "Localisation / i18n ready (if applicable)",  "status": "done",        "weight": 1},
        {"item": "Feedback collection mechanism in place",     "status": "partial",     "weight": 1},
    ],
    "marketing": [
        {"item": "Landing page live and conversion-optimised", "status": "done",        "weight": 3},
        {"item": "Email announcement list ready (≥100)",       "status": "done",        "weight": 3},
        {"item": "Press / media kit prepared",                  "status": "partial",     "weight": 2},
        {"item": "Social media assets created",                 "status": "done",        "weight": 2},
        {"item": "Product Hunt / launch platform submission",  "status": "not_started", "weight": 2},
        {"item": "SEO meta tags and OG images set",            "status": "done",        "weight": 2},
        {"item": "Influencer / community outreach planned",    "status": "partial",     "weight": 2},
        {"item": "Launch-day email sequence scheduled",        "status": "not_started", "weight": 2},
        {"item": "Paid ads creative prepared (if applicable)", "status": "not_started", "weight": 1},
        {"item": "Referral / viral loop mechanism designed",   "status": "not_started", "weight": 1},
    ],
    "technical": [
        {"item": "Production monitoring & alerting active",    "status": "done",        "weight": 3},
        {"item": "Load / performance tested at 5× expected",  "status": "partial",     "weight": 3},
        {"item": "Rollback plan documented and rehearsed",     "status": "not_started", "weight": 3},
        {"item": "Database backups verified and automated",    "status": "done",        "weight": 2},
        {"item": "CDN / caching configured",                   "status": "done",        "weight": 2},
        {"item": "Error tracking (Sentry/similar) live",       "status": "done",        "weight": 2},
        {"item": "SSL / HTTPS confirmed on all endpoints",     "status": "done",        "weight": 2},
        {"item": "Analytics events firing correctly",          "status": "partial",     "weight": 2},
        {"item": "Rate limiting / DDoS protection in place",   "status": "partial",     "weight": 2},
        {"item": "Feature flags configured for safe rollout",  "status": "not_started", "weight": 1},
    ],
}

CATEGORY_META = {
    "product":   {"emoji": "🛠 ", "label": "Product Readiness"},
    "marketing": {"emoji": "📣 ", "label": "Marketing Readiness"},
    "technical": {"emoji": "⚙️ ", "label": "Technical Readiness"},
}

STATUS_WEIGHTS = {
    "done":        1.0,
    "partial":     0.5,
    "not_started": 0.0,
}

BLOCKERS_THRESHOLD = 0.0   # not_started items with weight ≥3 are blockers


# ---------------------------------------------------------------------------
# Core scoring
# ---------------------------------------------------------------------------

def score_category(items: list) -> dict:
    """Score a single category 0-100 using weighted item scores."""
    if not items:
        return {"score": 0, "items": [], "blockers": []}

    total_weight  = 0
    earned_weight = 0
    blockers      = []
    scored_items  = []

    for it in items:
        raw_status = it.get("status", "not_started").strip().lower()
        status     = raw_status if raw_status in STATUS_WEIGHTS else "not_started"
        weight     = it.get("weight", 1)
        sw         = STATUS_WEIGHTS[status]
        earned     = sw * weight

        total_weight  += weight
        earned_weight += earned

        scored_items.append({
            "item":           it["item"],
            "status":         status,
            "weight":         weight,
            "points_earned":  earned,
            "points_max":     weight,
        })

        if status == "not_started" and weight >= 3:
            blockers.append(it["item"])

    score = round((earned_weight / total_weight) * 100) if total_weight > 0 else 0
    return {
        "score":          score,
        "score_label":    _score_label(score),
        "items":          scored_items,
        "blockers":       blockers,
        "items_done":     sum(1 for i in scored_items if i["status"] == "done"),
        "items_partial":  sum(1 for i in scored_items if i["status"] == "partial"),
        "items_pending":  sum(1 for i in scored_items if i["status"] == "not_started"),
        "total_items":    len(scored_items),
    }


def score_readiness(checklist: dict) -> dict:
    """Score all categories and produce an overall launch readiness result."""
    categories    = {}
    all_scores    = []
    all_blockers  = []

    for cat, items in checklist.items():
        result            = score_category(items)
        categories[cat]   = result
        all_scores.append(result["score"])
        all_blockers.extend(result["blockers"])

    overall = round(sum(all_scores) / len(all_scores)) if all_scores else 0

    return {
        "overall": {
            "score":          overall,
            "score_label":    _score_label(overall),
            "launch_decision": _launch_decision(overall, all_blockers),
            "blockers":        all_blockers,
            "generated_at":    datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        },
        "categories": {
            cat: {**CATEGORY_META.get(cat, {"emoji": "📋", "label": cat.title()}),
                  **res}
            for cat, res in categories.items()
        },
        "action_plan": _action_plan(categories),
    }


def _launch_decision(score: int, blockers: list) -> str:
    if blockers:
        return f"⛔  NOT READY — {len(blockers)} blocker(s) must be resolved before launch."
    if score >= 80:
        return "✅  LAUNCH READY — all categories are in good shape."
    if score >= 60:
        return "🟡  CONDITIONAL — address partial items but launch is defensible."
    if score >= 40:
        return "🟠  CAUTION — significant gaps; soft launch / waitlist recommended."
    return "🔴  NOT READY — major preparation required across multiple areas."


def _action_plan(categories: dict) -> list:
    """Build a prioritised action list: blockers first, then by score ascending."""
    actions = []
    for cat, res in categories.items():
        label = CATEGORY_META.get(cat, {}).get("label", cat.title())
        for bl in res.get("blockers", []):
            actions.append({
                "priority":  "🚨 BLOCKER",
                "category":  label,
                "action":    bl,
            })
    for cat, res in sorted(categories.items(), key=lambda x: x[1]["score"]):
        label = CATEGORY_META.get(cat, {}).get("label", cat.title())
        for it in res.get("items", []):
            if it["status"] == "partial":
                actions.append({
                    "priority": "⚠️  PARTIAL",
                    "category": label,
                    "action":   f"Complete: {it['item']}",
                })
    return actions[:15]   # top 15 actions


def _score_label(s: int) -> str:
    if s >= 90: return "Excellent"
    if s >= 75: return "Good"
    if s >= 60: return "Fair"
    if s >= 40: return "Poor"
    return "Critical"


# ---------------------------------------------------------------------------
# Pretty-print
# ---------------------------------------------------------------------------

def pretty_print(result: dict) -> None:
    ov = result["overall"]

    print("\n" + "=" * 65)
    print("  🚀  LAUNCH READINESS SCORER")
    print("=" * 65)

    print(f"\n  Overall Score   : {ov['score']}/100  ({ov['score_label']})")
    print(f"  Launch Decision : {ov['launch_decision']}")
    if ov["blockers"]:
        print(f"\n  🚨 BLOCKERS ({len(ov['blockers'])}):")
        for b in ov["blockers"]:
            print(f"    • {b}")

    print(f"\n{'─'*65}")
    print(f"  {'CATEGORY':<30}  {'SCORE':>6}  {'DONE':>5}  {'PARTIAL':>7}  {'PENDING':>7}")
    print(f"{'─'*65}")

    for cat, res in result["categories"].items():
        bar = "█" * (res["score"] // 10) + "░" * (10 - res["score"] // 10)
        print(f"  {res['emoji']} {res['label']:<27}  {res['score']:>5}/100  "
              f"{res['items_done']:>5}  {res['items_partial']:>7}  {res['items_pending']:>7}  {bar}")

    print(f"\n{'─'*65}")
    print(f"  🗂   CATEGORY DETAILS\n")

    for cat, res in result["categories"].items():
        print(f"  {res['emoji']} {res['label']}  — {res['score']}/100  ({res['score_label']})")
        for it in res["items"]:
            icon = {"done": "✅", "partial": "🔶", "not_started": "⬜"}.get(it["status"], "⬜")
            print(f"    {icon} [{it['status']:<11}] (w={it['weight']}) {it['item']}")
        print()

    ap = result["action_plan"]
    if ap:
        print(f"  📋  ACTION PLAN  (top {len(ap)} items)\n")
        for i, a in enumerate(ap, 1):
            print(f"  {i:>2}. {a['priority']}  [{a['category']}]  {a['action']}")

    print(f"\n  Generated: {ov['generated_at']}")
    print()


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------

def parse_args():
    parser = argparse.ArgumentParser(
        description="Score product launch readiness across categories (stdlib only).",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=__doc__,
    )
    parser.add_argument("--checklist",       type=str, default=None,
                        help="Path to JSON checklist file")
    parser.add_argument("--json",            action="store_true",
                        help="Output results as JSON")
    parser.add_argument("--export-template", action="store_true",
                        help="Print the default checklist template as JSON and exit")
    return parser.parse_args()


def main():
    args = parse_args()

    if args.export_template:
        print(json.dumps(DEFAULT_CHECKLIST, indent=2))
        return

    if args.checklist:
        with open(args.checklist) as f:
            checklist = json.load(f)
    else:
        print("🔬  DEMO MODE — using embedded sample checklist\n")
        checklist = DEFAULT_CHECKLIST

    result = score_readiness(checklist)

    if args.json:
        print(json.dumps(result, indent=2))
    else:
        pretty_print(result)


if __name__ == "__main__":
    main()
