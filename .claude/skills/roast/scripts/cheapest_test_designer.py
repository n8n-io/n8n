#!/usr/bin/env python3
"""cheapest_test_designer.py — Turn the riskiest assumption into a concrete 48-hour test.

The single most important output of `/roast` is the cheapest test: the smallest, fastest thing the
user can do to validate the riskiest assumption BEFORE building anything. This tool maps the risk
category the panel surfaced to a concrete, time-boxed experiment with an explicit pass/fail signal,
so the Judge proposes a falsifiable test instead of "go talk to some users."

Risk categories (the riskiest assumption usually falls into exactly one):
    demand          — will anyone want this at all?
    price           — will they pay, and how much?
    feasibility     — can the thing actually be delivered?
    differentiation — why this over the incumbent or doing nothing?
    channel         — can you reach the buyer affordably?
    retention       — will they come back / keep paying?

Each test is drawn from the lean-startup / demand-testing canon (smoke test, pre-sale, concierge /
Wizard-of-Oz, fake-door) and framed so the result is a number, not a vibe.

NO LLM CALLS. Deterministic lookup keyed by risk category.

Usage:
    python cheapest_test_designer.py --risk demand
    python cheapest_test_designer.py --risk price --price 99
    python cheapest_test_designer.py --sample
    python cheapest_test_designer.py --sample --output-format json
"""

import argparse
import json
import sys
from typing import Any, Dict, List

TESTS: Dict[str, Dict[str, str]] = {
    "demand": {
        "name": "Smoke-test landing page + paid traffic",
        "do": ("Stand up a one-page site stating the promise and a single email-capture CTA. "
               "Send $50-100 of targeted ads (or one post to where the buyer already gathers) at it."),
        "cost": "$50-100 + a few hours",
        "pass": "Visitor->email signup >= 10-15% AND cost-per-signup below your target CAC.",
        "fail": "<5% signup, or signups cost more than the customer is worth. The pull isn't there.",
        "time": "24-48 hours",
    },
    "price": {
        "name": "Pre-sell before you build",
        "do": ("Ask for the money now. A real payment link, a paid pilot, or a counter-signed LOI "
               "with a number on it. A fake pricing page that measures 'Buy' clicks is the weak "
               "version; an actual charge is the strong one."),
        "cost": "$0-50 (Stripe link / form)",
        "pass": "At least one real prepayment or signed commitment from a stranger (not a friend).",
        "fail": "Lots of 'I'd totally use this' and zero wallets out. Interest is not demand.",
        "time": "48 hours of outreach",
    },
    "feasibility": {
        "name": "Concierge / Wizard-of-Oz",
        "do": ("Deliver the outcome by hand for 1-3 real users with no product behind it. You are "
               "the algorithm. Prove the value is real and the work is doable before automating it."),
        "cost": "Your time only",
        "pass": "You can deliver the promised outcome manually and the user finds it worth paying for.",
        "fail": "Even by hand the outcome is weak, or it takes so long the economics can never work.",
        "time": "1-2 days per user",
    },
    "differentiation": {
        "name": "5 head-to-head buyer interviews",
        "do": ("Talk to 5 people who currently use the incumbent or do nothing. Ask what they use, "
               "what they hate, and what would make them switch. Show your wedge and watch the reaction."),
        "cost": "$0-50 in incentives",
        "pass": "A repeated, specific reason to switch that the incumbent structurally can't copy fast.",
        "fail": "They shrug, or 'good enough' keeps winning. A feature is not a wedge.",
        "time": "1-2 days to schedule + run",
    },
    "channel": {
        "name": "Single-channel reachability spike",
        "do": ("Pick ONE channel (cold email batch, one community post, one creator DM) and run it "
               "once. Measure whether you can get the exact buyer to respond at a sane cost."),
        "cost": "$0-100",
        "pass": "A repeatable reply/click rate that implies you can reach buyers below CAC at scale.",
        "fail": "Crickets, or the only way to reach them is a channel you can't afford to repeat.",
        "time": "24-48 hours",
    },
    "retention": {
        "name": "One-week concierge retention probe",
        "do": ("Deliver the value manually to a handful of users for a week and watch unprompted "
               "repeat use. The question isn't 'did they try it' — it's 'did they come back.'"),
        "cost": "Your time only",
        "pass": "Users return without being nudged, or ask for the next session themselves.",
        "fail": "One-and-done. Novelty, not habit. A leaky bucket no growth can outrun.",
        "time": "5-7 days (lightweight)",
    },
}

ALIASES = {
    "willingness-to-pay": "price", "wtp": "price", "pricing": "price",
    "want": "demand", "market": "demand", "pull": "demand",
    "build": "feasibility", "technical": "feasibility", "delivery": "feasibility",
    "moat": "differentiation", "competition": "differentiation", "competitor": "differentiation",
    "distribution": "channel", "reach": "channel", "acquisition": "channel",
    "churn": "retention", "repeat": "retention",
}


def design(risk: str, price: float = None) -> Dict[str, Any]:
    key = risk.strip().lower()
    key = ALIASES.get(key, key)
    if key not in TESTS:
        return {
            "error": f"unknown risk category '{risk}'",
            "valid": sorted(TESTS.keys()),
            "aliases": ALIASES,
        }
    t = dict(TESTS[key])
    note = ""
    if key == "price" and price:
        note = (f"Charge the real number: ${price:g}. If a stranger won't pay ${price:g} today, "
                f"discounting later won't save it — fix the value, not the price.")
    return {
        "risk_category": key,
        "test": t["name"],
        "what_to_do": t["do"],
        "cost": t["cost"],
        "pass_signal": t["pass"],
        "fail_signal": t["fail"],
        "time_box": t["time"],
        "note": note,
    }


def _wrap(text: str, width: int) -> List[str]:
    words, lines, cur = text.split(), [], ""
    for w in words:
        if len(cur) + len(w) + 1 > width:
            lines.append(cur)
            cur = w
        else:
            cur = f"{cur} {w}".strip()
    if cur:
        lines.append(cur)
    return lines


def render_human(r: Dict[str, Any]) -> str:
    if "error" in r:
        return (f"error: {r['error']}\nvalid categories: {', '.join(r['valid'])}")
    out: List[str] = []
    out.append(f"Cheapest 48-Hour Test — risk: {r['risk_category'].upper()}")
    out.append("=" * 60)
    out.append(f"  Test: {r['test']}")
    out.append(f"  Time box: {r['time_box']}   Cost: {r['cost']}")
    out.append("")
    out.append("  Do this:")
    for line in _wrap(r["what_to_do"], 56):
        out.append(f"    {line}")
    out.append("")
    out.append("  PASS if:")
    for line in _wrap(r["pass_signal"], 56):
        out.append(f"    {line}")
    out.append("  FAIL if:")
    for line in _wrap(r["fail_signal"], 56):
        out.append(f"    {line}")
    if r["note"]:
        out.append("")
        for line in _wrap(r["note"], 58):
            out.append(f"  {line}")
    return "\n".join(out)


def main(argv: List[str]) -> int:
    p = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    p.add_argument("--risk", help="Riskiest assumption category: "
                   "demand | price | feasibility | differentiation | channel | retention")
    p.add_argument("--price", type=float, help="Intended price (sharpens the price test)")
    p.add_argument("--sample", action="store_true", help="Run the embedded sample")
    p.add_argument("--output-format", choices=["human", "json"], default="human")
    args = p.parse_args(argv)

    if args.sample:
        risk, price = "price", 99
    elif args.risk:
        risk, price = args.risk, args.price
    else:
        p.print_help()
        print("\nerror: provide --risk <category> or --sample", file=sys.stderr)
        return 2

    result = design(risk, price)
    if args.output_format == "json":
        print(json.dumps(result, indent=2))
    else:
        print(render_human(result))
    return 0 if "error" not in result else 1


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
