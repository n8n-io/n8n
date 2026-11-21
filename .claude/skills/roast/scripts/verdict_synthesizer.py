#!/usr/bin/env python3
"""verdict_synthesizer.py — Collapse the 5-angle panel scores into one GO / RESHAPE / KILL verdict.

The `/roast` skill convenes five reviewers — Critic, Champion, Analyst, Investigator, Customer —
each returning a 1-10 score on their own dimension (1 = walk away, 10 = no-brainer). The Judge is
told NOT to simply average them. This tool encodes that discipline so the verdict is reproducible
weighting, not vibes:

  1. Weighted composite (demand and survival count most; the bull counts least):
        customer 0.30 | critic 0.25 | investigator 0.20 | analyst 0.15 | champion 0.10
     The Champion is deliberately the lightest weight — it is the advocate, so it is the least
     trustworthy single signal. The Customer is heaviest — willingness to pay is the hardest test.

  2. Hard gates (this is the "don't just average" part). A single dimension can veto a GO:
        - customer  <= 3  -> demand gate: no buyer. Cannot be GO.
        - critic    <= 2  -> fatal-flaw gate: the attack landed. Cannot be GO.
        - analyst   <= 2  -> broken-logic gate: the mechanism doesn't hold. Cannot be GO.

  3. Tension detection: the widest gap between any two panelists is the "real tension" the Judge
     must resolve in prose. A high composite hiding a 5-point internal disagreement is NOT a
     confident GO.

  4. Confidence from agreement: a tight panel (small range) is high confidence; a split panel
     (wide range) is low confidence even when the average looks clean.

NO LLM CALLS. Pure arithmetic + thresholds. The Judge still writes the prose; this fixes the call.

Usage:
    python verdict_synthesizer.py --critic 4 --champion 8 --analyst 7 --investigator 5 --customer 6
    python verdict_synthesizer.py --sample
    python verdict_synthesizer.py --sample --output-format json
"""

import argparse
import json
import sys
from typing import Any, Dict, List

WEIGHTS = {
    "customer": 0.30,
    "critic": 0.25,
    "investigator": 0.20,
    "analyst": 0.15,
    "champion": 0.10,
}

PANEL_LABEL = {
    "critic": "The Critic (what kills this)",
    "champion": "The Champion (the 10x upside)",
    "analyst": "The Analyst (does the logic hold)",
    "investigator": "The Investigator (what the market says)",
    "customer": "The Customer (would I actually pay)",
}


def _clamp(v: float) -> float:
    return max(1.0, min(10.0, float(v)))


def synthesize(critic: float, champion: float, analyst: float,
               investigator: float, customer: float) -> Dict[str, Any]:
    scores = {
        "critic": _clamp(critic),
        "champion": _clamp(champion),
        "analyst": _clamp(analyst),
        "investigator": _clamp(investigator),
        "customer": _clamp(customer),
    }

    composite = round(sum(scores[k] * WEIGHTS[k] for k in scores), 2)

    # --- Gates: a single dimension can veto a GO ---
    gates: List[str] = []
    if scores["customer"] <= 3:
        gates.append("DEMAND GATE — the Customer would not pay. No upside survives a missing buyer.")
    if scores["critic"] <= 2:
        gates.append("FATAL-FLAW GATE — the Critic's attack landed. A load-bearing assumption is broken.")
    if scores["analyst"] <= 2:
        gates.append("BROKEN-LOGIC GATE — the Analyst found the mechanism doesn't hold even in theory.")

    # --- Base verdict from composite ---
    if composite >= 7.0:
        verdict = "GO"
    elif composite >= 4.5:
        verdict = "RESHAPE"
    else:
        verdict = "KILL"

    # --- Apply gates: gates can only downgrade, never upgrade ---
    gate_downgraded = False
    if gates and verdict == "GO":
        verdict = "RESHAPE"
        gate_downgraded = True
    # A killed-demand idea with a weak composite is a KILL, not a RESHAPE.
    if scores["customer"] <= 2 and composite < 4.5:
        verdict = "KILL"
    if scores["critic"] <= 2 and composite < 4.0:
        verdict = "KILL"

    # --- Tension detection ---
    hi_key = max(scores, key=scores.get)
    lo_key = min(scores, key=scores.get)
    spread = round(scores[hi_key] - scores[lo_key], 2)
    tension = None
    if spread >= 4:
        tension = (
            f"{PANEL_LABEL[hi_key]} scored {scores[hi_key]:.0f} but "
            f"{PANEL_LABEL[lo_key]} scored {scores[lo_key]:.0f} — a {spread:.0f}-point split. "
            "The Judge must resolve this, not average it away."
        )

    # --- Confidence from panel agreement (+ gate friction) ---
    if spread <= 2:
        confidence = "high"
    elif spread <= 5:
        confidence = "medium"
    else:
        confidence = "low"
    if gate_downgraded and confidence == "high":
        confidence = "medium"  # a vetoed GO is never high-confidence

    # --- Headline ---
    if verdict == "GO":
        headline = (
            "The panel cleared it: demand is real, the attack didn't land, and the logic holds. "
            "Ship the cheapest test to confirm the single riskiest assumption, then build."
        )
    elif verdict == "KILL":
        headline = (
            "The panel could not save this in its current form. The weak dimension is structural, "
            "not cosmetic. Kill it or re-aim the same energy at a problem with a real buyer."
        )
    else:  # RESHAPE
        if gate_downgraded:
            headline = (
                "Strong on paper, but a single dimension vetoed the GO. Fix the gated weakness "
                "before anything else — the rest of the upside is downstream of it."
            )
        else:
            headline = (
                "Promising but unproven. The pivot that fixes the weakest dimension while keeping "
                "the upside is the whole game. De-risk, reshape, then re-roast."
            )

    contributions = {k: round(scores[k] * WEIGHTS[k], 2) for k in scores}
    dominant = max(contributions, key=contributions.get)
    drag = min(contributions, key=contributions.get)

    return {
        "scores": {k: scores[k] for k in ("critic", "champion", "analyst", "investigator", "customer")},
        "weights": WEIGHTS,
        "contributions": contributions,
        "dominant_factor": dominant,
        "biggest_drag": drag,
        "composite_score": composite,
        "verdict": verdict,
        "confidence": confidence,
        "gates_triggered": gates,
        "gate_downgraded_go": gate_downgraded,
        "tension": tension,
        "score_spread": spread,
        "headline": headline,
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
    out.append("Roast Verdict Synthesis (5-angle panel -> one call)")
    out.append("=" * 64)
    s = r["scores"]
    out.append(f"  Critic {s['critic']:.0f} · Champion {s['champion']:.0f} · "
               f"Analyst {s['analyst']:.0f} · Investigator {s['investigator']:.0f} · "
               f"Customer {s['customer']:.0f}")
    out.append(f"  Weighted contributions: " +
               " | ".join(f"{k} {v}" for k, v in r["contributions"].items()))
    out.append(f"  Composite: {r['composite_score']}/10   "
               f"(lift: {r['dominant_factor']}, drag: {r['biggest_drag']})")
    out.append("")
    out.append(f"  VERDICT: {r['verdict']}    Confidence: {r['confidence']}")
    out.append("")
    for line in _wrap(r["headline"], 60):
        out.append(f"  {line}")
    if r["gates_triggered"]:
        out.append("")
        out.append("  Gates triggered (these veto a GO):")
        for g in r["gates_triggered"]:
            for j, line in enumerate(_wrap(g, 56)):
                out.append(f"    {'- ' if j == 0 else '  '}{line}")
    if r["tension"]:
        out.append("")
        out.append("  Real tension to resolve:")
        for line in _wrap(r["tension"], 58):
            out.append(f"    {line}")
    out.append("")
    out.append("  Reminder: this fixes the CALL. The Judge still writes the prose,")
    out.append("  the money read, and the cheapest 48-hour test.")
    return "\n".join(out)


SAMPLE = dict(critic=4, champion=8, analyst=7, investigator=5, customer=6)


def main(argv: List[str]) -> int:
    p = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    p.add_argument("--critic", type=float, help="Critic score 1-10 (high = survives the attack)")
    p.add_argument("--champion", type=float, help="Champion score 1-10 (high = big upside)")
    p.add_argument("--analyst", type=float, help="Analyst score 1-10 (high = logic holds)")
    p.add_argument("--investigator", type=float, help="Investigator score 1-10 (high = market agrees)")
    p.add_argument("--customer", type=float, help="Customer score 1-10 (high = would pay)")
    p.add_argument("--sample", action="store_true", help="Run the embedded sample")
    p.add_argument("--output-format", choices=["human", "json"], default="human")
    args = p.parse_args(argv)

    if args.sample:
        vals = SAMPLE
    elif all(v is not None for v in (args.critic, args.champion, args.analyst,
                                     args.investigator, args.customer)):
        vals = dict(critic=args.critic, champion=args.champion, analyst=args.analyst,
                    investigator=args.investigator, customer=args.customer)
    else:
        p.print_help()
        print("\nerror: provide all five scores "
              "(--critic --champion --analyst --investigator --customer) or --sample",
              file=sys.stderr)
        return 2

    result = synthesize(**vals)
    if args.output_format == "json":
        print(json.dumps(result, indent=2))
    else:
        print(render_human(result))
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
