#!/usr/bin/env python3
"""
funnel_drop_analyzer.py — Signup Funnel Drop-Off Analyzer
100% stdlib, no pip installs required.

Usage:
    python3 funnel_drop_analyzer.py                            # demo mode
    python3 funnel_drop_analyzer.py --steps steps.json
    python3 funnel_drop_analyzer.py --steps steps.json --json
    echo '[{"step":"Visit","count":10000}]' | python3 funnel_drop_analyzer.py --stdin

steps.json format:
    [
      {"step": "Landing Page Visit", "count": 10000},
      {"step": "Clicked Sign Up",    "count": 4200},
      {"step": "Filled Form",        "count": 2800},
      {"step": "Email Verified",     "count": 1900},
      {"step": "Onboarding Done",    "count": 1100}
    ]
"""

import argparse
import json
import math
import sys


# ---------------------------------------------------------------------------
# Recommendation engine
# ---------------------------------------------------------------------------

RECOMMENDATIONS = {
    "high_drop": {
        "threshold": 0.50,   # >50% drop
        "landing_page": [
            "Value proposition may be unclear — run a 5-second test.",
            "Add social proof (testimonials, logos, user count) above the fold.",
            "Ensure CTA button is prominent and benefit-focused ('Start Free' not 'Submit').",
        ],
        "clicked_sign_up": [
            "CTA label or placement may not resonate — A/B test button copy and colour.",
            "Users may not trust the product — add trust badges and reviews near CTA.",
            "Consider a sticky header CTA for long landing pages.",
        ],
        "filled_form": [
            "Form has too many fields — reduce to email + password minimum.",
            "Try progressive disclosure: collect extra info post-signup.",
            "Add inline validation so errors appear in real-time, not on submit.",
            "Show a progress indicator if multi-step.",
        ],
        "email_verified": [
            "Verification email may land in spam — check SPF/DKIM/DMARC.",
            "Send a plain-text follow-up 30 min after signup nudging verification.",
            "Consider SMS or magic-link alternatives to email verification.",
            "Reduce time-to-value: show a useful screen before requiring verification.",
        ],
        "default": [
            "Significant drop detected — instrument with session recordings (Hotjar/FullStory).",
            "Run exit surveys at this step to capture qualitative reasons.",
            "Check for UI bugs or broken flows on mobile.",
        ],
    },
    "medium_drop": {
        "threshold": 0.25,   # 25–50% drop
        "default": [
            "Moderate friction — review copy and UX at this step.",
            "Ensure mobile experience is frictionless (test on real devices).",
            "Add micro-copy explaining why information is requested.",
        ],
    },
    "healthy": {
        "default": [
            "Step conversion is healthy — focus optimisation effort elsewhere.",
        ],
    },
}


def classify_step_name(name: str) -> str:
    """Map step name to a known category for targeted recommendations."""
    n = name.lower()
    if any(k in n for k in ["land", "visit", "page", "home"]):
        return "landing_page"
    if any(k in n for k in ["cta", "click", "signup", "sign up", "register", "start"]):
        return "clicked_sign_up"
    if any(k in n for k in ["form", "fill", "detail", "info", "enter"]):
        return "filled_form"
    if any(k in n for k in ["email", "verif", "confirm", "activate"]):
        return "email_verified"
    return "default"


def get_recommendation(step_name: str, drop_rate: float) -> list:
    if drop_rate > RECOMMENDATIONS["high_drop"]["threshold"]:
        bucket = RECOMMENDATIONS["high_drop"]
        cat = classify_step_name(step_name)
        return bucket.get(cat, bucket["default"])
    elif drop_rate > RECOMMENDATIONS["medium_drop"]["threshold"]:
        return RECOMMENDATIONS["medium_drop"]["default"]
    else:
        return RECOMMENDATIONS["healthy"]["default"]


# ---------------------------------------------------------------------------
# Core analysis
# ---------------------------------------------------------------------------

def analyze_funnel(steps: list) -> dict:
    """
    Analyse a funnel step list and return full metrics + recommendations.

    Each step: {"step": <str>, "count": <int>}
    """
    if not steps:
        raise ValueError("steps list is empty")
    if len(steps) < 2:
        raise ValueError("Need at least 2 steps to analyse a funnel")

    top_count = steps[0]["count"]
    if top_count <= 0:
        raise ValueError("Top-of-funnel count must be > 0")

    step_metrics = []
    worst_step = None
    worst_drop_rate = -1.0

    for i, s in enumerate(steps):
        name  = s["step"]
        count = s["count"]

        cumulative_rate = count / top_count

        if i == 0:
            step_to_step_rate = 1.0
            drop_count        = 0
            drop_rate         = 0.0
            recommendations   = ["Top of funnel — all visitors enter here."]
        else:
            prev_count        = steps[i - 1]["count"]
            step_to_step_rate = count / prev_count if prev_count > 0 else 0.0
            drop_count        = prev_count - count
            drop_rate         = 1 - step_to_step_rate
            recommendations   = get_recommendation(name, drop_rate)

            if drop_rate > worst_drop_rate:
                worst_drop_rate = drop_rate
                worst_step      = name

        step_metrics.append({
            "step":               name,
            "count":              count,
            "step_conversion_pct":   round(step_to_step_rate * 100, 2),
            "step_drop_pct":         round(drop_rate * 100, 2),
            "drop_count":            drop_count,
            "cumulative_conversion_pct": round(cumulative_rate * 100, 2),
            "recommendations":    recommendations,
        })

    # Overall funnel health score (0-100)
    overall_conv = steps[-1]["count"] / top_count
    score = _funnel_score(step_metrics, overall_conv)

    return {
        "summary": {
            "total_steps":               len(steps),
            "top_of_funnel_count":        top_count,
            "bottom_of_funnel_count":     steps[-1]["count"],
            "overall_conversion_pct":     round(overall_conv * 100, 2),
            "worst_performing_step":      worst_step,
            "worst_step_drop_pct":        round(worst_drop_rate * 100, 2),
            "funnel_health_score":        score,
            "funnel_health_label":        _score_label(score),
        },
        "steps": step_metrics,
        "top_priority": _top_priority(step_metrics),
    }


def _funnel_score(step_metrics: list, overall_conv: float) -> int:
    """
    Score = 100 * overall_conversion adjusted for worst-step severity.
    - Base: log-scale overall conversion (capped at a 10% target = 100 pts)
    - Penalty: each step with >60% drop deducts points
    """
    target_conv = 0.10  # 10% overall = score 100
    base = min(100, math.log1p(overall_conv) / math.log1p(target_conv) * 100)

    penalty = 0
    for m in step_metrics[1:]:
        if m["step_drop_pct"] > 60:
            penalty += 10
        elif m["step_drop_pct"] > 40:
            penalty += 5

    score = max(0, round(base - penalty))
    return score


def _score_label(s: int) -> str:
    if s >= 80: return "Excellent"
    if s >= 60: return "Good"
    if s >= 40: return "Fair"
    if s >= 20: return "Poor"
    return "Critical"


def _top_priority(step_metrics: list) -> dict:
    """Return the single highest-impact step to fix first."""
    # Pick step with largest absolute drop count (not just rate)
    candidates = step_metrics[1:]
    if not candidates:
        return {}
    top = max(candidates, key=lambda m: m["drop_count"])
    return {
        "step":             top["step"],
        "drop_count":       top["drop_count"],
        "drop_pct":         top["step_drop_pct"],
        "why":              "Largest absolute visitor loss — highest revenue impact.",
        "quick_wins":       top["recommendations"],
    }


# ---------------------------------------------------------------------------
# Pretty-print
# ---------------------------------------------------------------------------

def pretty_print(result: dict) -> None:
    s   = result["summary"]
    tp  = result["top_priority"]

    print("\n" + "=" * 65)
    print("  SIGNUP FUNNEL DROP-OFF ANALYZER")
    print("=" * 65)

    print(f"\n📊  FUNNEL OVERVIEW")
    print(f"  Top of funnel      : {s['top_of_funnel_count']:,} visitors")
    print(f"  Bottom of funnel   : {s['bottom_of_funnel_count']:,} converted")
    print(f"  Overall conversion : {s['overall_conversion_pct']}%")
    print(f"  Funnel health      : {s['funnel_health_score']}/100  ({s['funnel_health_label']})")
    print(f"  Worst step         : {s['worst_performing_step']}  "
          f"({s['worst_step_drop_pct']}% drop)")

    print(f"\n{'Step':<28} {'Count':>8}  {'Step Conv':>10}  {'Step Drop':>10}  {'Cumul Conv':>10}")
    print("─" * 75)
    for m in result["steps"]:
        bar = "█" * int(m["cumulative_conversion_pct"] / 5)
        print(f"  {m['step']:<26} {m['count']:>8,}  "
              f"{m['step_conversion_pct']:>9.1f}%  "
              f"{m['step_drop_pct']:>9.1f}%  "
              f"{m['cumulative_conversion_pct']:>9.1f}%  {bar}")

    print(f"\n🚨  TOP PRIORITY FIX: {tp.get('step', 'N/A')}")
    print(f"  Lost visitors : {tp.get('drop_count', 0):,}  ({tp.get('drop_pct', 0)}% drop)")
    print(f"  Why fix first : {tp.get('why', '')}")
    print("  Quick wins:")
    for qw in tp.get("quick_wins", []):
        print(f"    • {qw}")

    print(f"\n💡  STEP-BY-STEP RECOMMENDATIONS")
    for m in result["steps"][1:]:
        if m["step_drop_pct"] > 10:
            print(f"\n  [{m['step']}]  ↓{m['step_drop_pct']}% drop")
            for r in m["recommendations"]:
                print(f"    • {r}")

    print()


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------

DEMO_STEPS = [
    {"step": "Landing Page Visit",   "count": 12000},
    {"step": "Clicked Sign Up CTA",  "count": 4560},
    {"step": "Filled Registration",  "count": 2800},
    {"step": "Email Verified",       "count": 1540},
    {"step": "Onboarding Completed", "count":  880},
    {"step": "First Core Action",    "count":  420},
]


def parse_args():
    parser = argparse.ArgumentParser(
        description="Analyse signup funnel drop-off by step (stdlib only).",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=__doc__,
    )
    parser.add_argument("--steps",  type=str, default=None,
                        help="Path to JSON file with funnel steps")
    parser.add_argument("--stdin",  action="store_true",
                        help="Read steps JSON from stdin")
    parser.add_argument("--json",   action="store_true",
                        help="Output results as JSON")
    return parser.parse_args()


def main():
    args  = parse_args()
    steps = None

    if args.stdin:
        steps = json.load(sys.stdin)
    elif args.steps:
        with open(args.steps) as f:
            steps = json.load(f)
    else:
        print("🔬  DEMO MODE — using sample SaaS signup funnel\n")
        steps = DEMO_STEPS

    result = analyze_funnel(steps)

    if args.json:
        print(json.dumps(result, indent=2))
    else:
        pretty_print(result)


if __name__ == "__main__":
    main()
