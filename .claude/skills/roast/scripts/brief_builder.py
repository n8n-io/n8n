#!/usr/bin/env python3
"""brief_builder.py — Assemble the single shared brief every panelist judges.

The `/roast` skill fires five reviewers in parallel and pastes the SAME brief into each, so all
five judge the same thing. If the brief is thin, the panel argues past each other and the verdict
is noise. This tool enforces the four load-bearing inputs before the panel convenes:

    idea        — what it is, in one or two sentences
    who         — the target buyer
    money       — how it makes money (price + model)
    edge        — the unfair advantage the founder already has
    constraints — budget / timeline / how fast first dollar is needed (optional but recommended)

It returns a normalized one-paragraph brief AND a completeness check that names any missing input,
so the orchestrator knows whether to ask one more clarifying question before spending five subagents.

NO LLM CALLS. String assembly + presence checks.

Usage:
    python brief_builder.py --idea "AI that drafts grant applications for small nonprofits" \\
        --who "1-3 person nonprofits with no grant writer" \\
        --money "$99/mo SaaS" --edge "I ran a nonprofit for 8 years" \\
        --constraints "bootstrapped, need first dollar in 30 days"
    python brief_builder.py --sample
    python brief_builder.py --sample --output-format json
"""

import argparse
import json
import sys
from typing import Any, Dict, List

REQUIRED = ["idea", "who", "money", "edge"]
OPTIONAL = ["constraints"]


def build(idea: str, who: str, money: str, edge: str, constraints: str = "") -> Dict[str, Any]:
    fields = {"idea": idea, "who": who, "money": money, "edge": edge, "constraints": constraints}
    fields = {k: (v or "").strip() for k, v in fields.items()}

    missing = [k for k in REQUIRED if not fields[k]]
    weak = [k for k in REQUIRED if fields[k] and len(fields[k].split()) < 3]

    parts: List[str] = []
    if fields["idea"]:
        parts.append(f"The idea: {fields['idea']}.")
    if fields["who"]:
        parts.append(f"Target buyer: {fields['who']}.")
    if fields["money"]:
        parts.append(f"How it makes money: {fields['money']}.")
    if fields["edge"]:
        parts.append(f"The founder's edge: {fields['edge']}.")
    if fields["constraints"]:
        parts.append(f"Constraints: {fields['constraints']}.")

    brief = " ".join(parts)

    ready = not missing
    if missing:
        readiness = (
            f"NOT READY — missing {', '.join(missing)}. Ask one batched clarifying question "
            "covering the gaps before convening the panel."
        )
    elif weak:
        readiness = (
            f"READY (thin) — {', '.join(weak)} is very short. The panel will run, but a sharper "
            "brief yields a sharper verdict."
        )
    else:
        readiness = "READY — all four load-bearing inputs present. Convene the panel."

    return {
        "fields": fields,
        "brief": brief,
        "missing_required": missing,
        "thin_fields": weak,
        "ready": ready,
        "readiness": readiness,
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
    out: List[str] = []
    out.append("Roast Brief (pasted verbatim into all five panelists)")
    out.append("=" * 60)
    out.append(f"  Status: {r['readiness']}")
    out.append("")
    out.append("  BRIEF:")
    for line in _wrap(r["brief"] or "(empty)", 56):
        out.append(f"    {line}")
    if r["missing_required"]:
        out.append("")
        out.append(f"  Missing: {', '.join(r['missing_required'])}")
    return "\n".join(out)


SAMPLE = dict(
    idea="An AI that drafts grant applications for small nonprofits from a 10-minute intake call",
    who="1-3 person nonprofits with no dedicated grant writer",
    money="$99/mo SaaS, annual upsell",
    edge="I ran a nonprofit for 8 years and wrote 40+ grants",
    constraints="bootstrapped, need first paying customer within 30 days",
)


def main(argv: List[str]) -> int:
    p = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    p.add_argument("--idea", help="What it is, in one or two sentences")
    p.add_argument("--who", help="The target buyer")
    p.add_argument("--money", help="How it makes money (price + model)")
    p.add_argument("--edge", help="The unfair advantage the founder already has")
    p.add_argument("--constraints", default="", help="Budget / timeline / time-to-first-dollar (optional)")
    p.add_argument("--sample", action="store_true", help="Run the embedded sample")
    p.add_argument("--output-format", choices=["human", "json"], default="human")
    args = p.parse_args(argv)

    if args.sample:
        vals = SAMPLE
    elif any(v is not None for v in (args.idea, args.who, args.money, args.edge)):
        vals = dict(idea=args.idea or "", who=args.who or "", money=args.money or "",
                    edge=args.edge or "", constraints=args.constraints or "")
    else:
        p.print_help()
        print("\nerror: provide at least one of --idea/--who/--money/--edge, or --sample",
              file=sys.stderr)
        return 2

    result = build(**vals)
    if args.output_format == "json":
        print(json.dumps(result, indent=2))
    else:
        print(render_human(result))
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
