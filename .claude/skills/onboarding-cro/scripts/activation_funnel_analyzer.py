#!/usr/bin/env python3
"""
Activation Funnel Analyzer for Onboarding CRO

Analyzes user onboarding funnel data to identify drop-off points
and estimate the impact of improving each step.

Usage:
  python3 activation_funnel_analyzer.py                    # Demo mode
  python3 activation_funnel_analyzer.py funnel.json        # From data
  python3 activation_funnel_analyzer.py funnel.json --json  # JSON output

Input format (JSON):
{
  "steps": [
    {"name": "Signup completed", "users": 1000},
    {"name": "Email verified", "users": 850},
    {"name": "Profile setup", "users": 620},
    {"name": "First action", "users": 310},
    {"name": "Aha moment", "users": 180},
    {"name": "Activated (Day 7)", "users": 120}
  ]
}
"""

import json
import sys
import os


def analyze_funnel(data):
    """Analyze onboarding funnel for drop-offs and improvement potential."""
    steps = data["steps"]

    if len(steps) < 2:
        return {"error": "Need at least 2 funnel steps"}

    total_start = steps[0]["users"]
    analysis = []
    worst_step = None
    worst_drop = 0

    for i in range(len(steps)):
        step = steps[i]
        users = step["users"]
        rate_from_start = (users / total_start * 100) if total_start > 0 else 0

        if i == 0:
            step_analysis = {
                "step": step["name"],
                "users": users,
                "rate_from_start": round(rate_from_start, 1),
                "drop_rate": 0,
                "dropped_users": 0,
                "is_worst": False
            }
        else:
            prev_users = steps[i - 1]["users"]
            dropped = prev_users - users
            drop_rate = (dropped / prev_users * 100) if prev_users > 0 else 0

            step_analysis = {
                "step": step["name"],
                "users": users,
                "rate_from_start": round(rate_from_start, 1),
                "drop_rate": round(drop_rate, 1),
                "dropped_users": dropped,
                "is_worst": False
            }

            if drop_rate > worst_drop:
                worst_drop = drop_rate
                worst_step = i

        analysis.append(step_analysis)

    if worst_step is not None:
        analysis[worst_step]["is_worst"] = True

    # Calculate improvement potential
    final_users = steps[-1]["users"]
    overall_conversion = (final_users / total_start * 100) if total_start > 0 else 0

    improvements = []
    if worst_step is not None:
        worst = analysis[worst_step]
        # What if we halved the drop-off at the worst step?
        current_drop_rate = worst["drop_rate"] / 100
        improved_drop_rate = current_drop_rate / 2
        prev_users = steps[worst_step - 1]["users"]
        gained_users = int(prev_users * (current_drop_rate - improved_drop_rate))

        # Propagate improvement through remaining steps
        cascade_rate = 1.0
        for j in range(worst_step + 1, len(steps)):
            if steps[j - 1]["users"] > 0:
                cascade_rate *= steps[j]["users"] / steps[j - 1]["users"]

        additional_activated = int(gained_users * cascade_rate)

        improvements.append({
            "action": f"Halve drop-off at '{worst['step']}'",
            "current_drop": f"{worst['drop_rate']}%",
            "target_drop": f"{worst['drop_rate'] / 2:.1f}%",
            "users_saved": gained_users,
            "additional_activated": additional_activated,
            "impact_on_overall": f"+{(additional_activated / total_start * 100):.1f}pp"
        })

    # Score
    score = min(100, max(0, int(overall_conversion * 5)))  # 20% activation = 100
    if overall_conversion < 5:
        score = max(0, int(overall_conversion * 10))

    return {
        "steps": analysis,
        "summary": {
            "total_start": total_start,
            "total_activated": final_users,
            "overall_conversion": round(overall_conversion, 1),
            "worst_step": analysis[worst_step]["step"] if worst_step else None,
            "worst_drop_rate": round(worst_drop, 1),
            "score": score
        },
        "improvements": improvements
    }


def format_report(result):
    """Format human-readable report."""
    lines = []
    lines.append("")
    lines.append("=" * 65)
    lines.append("  ONBOARDING FUNNEL — ACTIVATION ANALYSIS")
    lines.append("=" * 65)
    lines.append("")

    summary = result["summary"]
    score = summary["score"]
    bar = "█" * (score // 5) + "░" * (20 - score // 5)

    lines.append(f"  ACTIVATION SCORE: {score}/100")
    lines.append(f"  [{bar}]")
    lines.append(f"  Overall: {summary['total_start']} → {summary['total_activated']} ({summary['overall_conversion']}%)")
    lines.append("")

    # Funnel visualization
    lines.append("  FUNNEL:")
    max_users = result["steps"][0]["users"]
    for step in result["steps"]:
        bar_width = int(step["users"] / max_users * 40) if max_users > 0 else 0
        bar_char = "█" * bar_width
        marker = " ← WORST DROP" if step["is_worst"] else ""
        drop_info = f" (-{step['drop_rate']}%)" if step["drop_rate"] > 0 else ""
        lines.append(f"  {bar_char} {step['users']:>5} | {step['step']}{drop_info}{marker}")

    lines.append("")

    # Step-by-step breakdown
    lines.append("  STEP BREAKDOWN:")
    lines.append(f"  {'Step':<25} {'Users':>7} {'From Start':>12} {'Drop':>8} {'Lost':>7}")
    lines.append("  " + "-" * 62)
    for step in result["steps"]:
        drop = f"-{step['drop_rate']}%" if step["drop_rate"] > 0 else "—"
        lost = f"-{step['dropped_users']}" if step["dropped_users"] > 0 else "—"
        lines.append(f"  {step['step']:<25} {step['users']:>7} {step['rate_from_start']:>10.1f}% {drop:>8} {lost:>7}")
    lines.append("")

    # Improvement potential
    if result["improvements"]:
        lines.append("  💡 IMPROVEMENT POTENTIAL:")
        for imp in result["improvements"]:
            lines.append(f"     Action: {imp['action']}")
            lines.append(f"     Drop: {imp['current_drop']} → {imp['target_drop']}")
            lines.append(f"     Users saved at step: +{imp['users_saved']}")
            lines.append(f"     Additional activated: +{imp['additional_activated']}")
            lines.append(f"     Impact on overall rate: {imp['impact_on_overall']}")
        lines.append("")

    return "\n".join(lines)


SAMPLE_DATA = {
    "steps": [
        {"name": "Signup completed", "users": 1000},
        {"name": "Email verified", "users": 840},
        {"name": "Profile setup", "users": 580},
        {"name": "First project created", "users": 290},
        {"name": "Invited teammate", "users": 145},
        {"name": "Aha moment (Day 3)", "users": 95},
        {"name": "Activated (Day 7)", "users": 72}
    ]
}


def main():
    use_json = "--json" in sys.argv
    args = [a for a in sys.argv[1:] if a != "--json"]

    if args and os.path.isfile(args[0]):
        with open(args[0]) as f:
            data = json.load(f)
    else:
        if not args:
            print("[Demo mode — analyzing sample SaaS onboarding funnel]")
        data = SAMPLE_DATA

    result = analyze_funnel(data)

    if use_json:
        print(json.dumps(result, indent=2))
    else:
        print(format_report(result))


if __name__ == "__main__":
    main()
