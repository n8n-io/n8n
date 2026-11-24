---
name: roast
description: Use when someone asks to roast an idea, pressure-test or stress-test an idea, validate a business idea, "convene the panel", get a brutal second opinion before building something, or says "/roast". Spins up a 5-angle panel (Critic, Champion, Analyst, Investigator, Customer) that attacks the idea from every angle, then a Judge returns one GO / RESHAPE / KILL verdict with the cheapest test to de-risk it.
argument-hint: "[the idea to roast]"
license: MIT
metadata:
  version: 1.0.0
  build_pattern: "Path-B persona skill — adversarial panel + deterministic verdict tools"
  distinct_from: "andreessen (single market-first lens, not a panel); c-level boardroom (enterprise C-suite pipeline requiring company-context onboarding); grill-me (interrogates, no verdict)"
---

# Roast — 5-Angle Idea Panel → One Verdict

> **Portability:** Reasoning-led skill with 3 stdlib Python tools. No external APIs, no LLM calls in
> scripts. Works in Claude Code CLI and Claude.ai web. The panel does the depth; the Judge does the call.

## What this does

Claude's default is to agree with you. `/roast` is the opposite. It convenes a panel of five
independent reviewers — **The Critic, The Champion, The Analyst, The Investigator, and The
Customer** — who tear an idea apart and build it up from every angle, then a Judge synthesizes
everything into one honest verdict. Use it before you sink time and money into building the wrong
thing.

The panel is adversarial on purpose. No reviewer is allowed to hedge or be polite. The point is to
surface what you can't see because you're too close to it.

## Step 1 — Frame the idea

If `$ARGUMENTS` contains the idea, start there. Then ask the user a tight set of clarifying
questions so the panel has real context to work with. Ask only what hasn't already been provided.
Keep it to 3-4 questions max, in one batch:

1. **The idea** in one or two sentences (what it is, what it does).
2. **Who it's for** and **how it makes money** (the buyer + the price/model).
3. **Your edge** — relevant skills, audience, or assets you already have.
4. **Constraints** — budget, timeline, how fast you need first dollar.

If the user says "just run it" or gives you enough already, skip the questions and proceed. Don't
over-interrogate. One round, then run the panel.

Assemble the brief with `scripts/brief_builder.py` — it normalizes the four load-bearing inputs into
one paragraph and tells you if anything critical is still missing before you spend five subagents:

```bash
python scripts/brief_builder.py \
  --idea "AI that drafts grant applications for small nonprofits from a 10-min intake call" \
  --who "1-3 person nonprofits with no grant writer" \
  --money "$99/mo SaaS" --edge "I ran a nonprofit for 8 years" \
  --constraints "bootstrapped, first dollar in 30 days"
```

Paste the resulting brief verbatim into every panelist's prompt, so all five judge the same thing.

## Step 2 — Run the 5-angle panel (5 reviewers, in parallel)

Spin up **all five reviewers in parallel in a single message** (one Task call each,
`subagent_type: general-purpose`). Paste the same brief into each, then give each its mandate below.

Each panelist must return: a one-line stance, their 3-5 sharpest points, the single most important
thing the user must hear, and a 1-10 score on their own dimension (1 = walk away, 10 = no-brainer).

**1. The Critic — "What kills this?"**
> You are The Critic on an idea panel. Assume this idea fails. Your job is to find the fatal flaws, the fastest way it dies, and the load-bearing assumptions that are probably wrong. Be ruthless and specific. No hedging, no "but it could work." Attack the weakest points. THE BRIEF: [brief]

**2. The Champion — "What's the 10x upside?"**
> You are The Champion on an idea panel. Make the strongest possible case FOR this idea. Find the biggest upside, the 10x version, the adjacent opportunities and unlock points the founder isn't seeing. Fight for the potential. Be specific about where the real money and leverage could be. THE BRIEF: [brief]

**3. The Analyst — "Does the logic actually hold?"**
> You are The Analyst on an idea panel. Use NO outside research and NO web. Reason purely from first principles: does the core mechanism make sense, do the incentives line up, is the underlying logic sound, does the math even work in theory? Strip it to fundamentals and tell us if it holds together. THE BRIEF: [brief]

**4. The Investigator — "What does the real market say?"**
> You are The Investigator on an idea panel. Use web search. Bring real-world evidence: who the existing competitors are, market size or demand signals, what comparable products charge, whether this is validated by what's already out there or contradicted by it. Cite what you find. Is the real world saying yes or no? THE BRIEF: [brief]

**5. The Customer — "Would I actually pay?"**
> You are The Customer on an idea panel. Role-play the exact target customer described in the brief. React as them, in first person. Would you actually pay for this? What's your real objection? What would make you choose a competitor or just do nothing instead? What price feels right, and what would make you say yes today? Be the honest, slightly skeptical customer, not a cheerleader. THE BRIEF: [brief]

## Step 3 — Call the verdict

Once all five return, YOU act as the Judge. Read every panelist's findings, weigh them, and
synthesize one decisive verdict. **Do not just average the scores.** Run the five scores through the
synthesizer so the call is reproducible weighting, not vibes — then name the real tension between the
reviewers and resolve it in prose:

```bash
python scripts/verdict_synthesizer.py \
  --critic 4 --champion 8 --analyst 7 --investigator 5 --customer 6
```

The tool weights demand (Customer) and survival (Critic) heaviest and the bull (Champion) lightest,
applies hard gates (a Customer who won't pay, or a fatal flaw the Critic landed, vetoes a GO), and
flags the widest disagreement as the tension you must resolve. Use its verdict + confidence as your
spine; write the prose yourself.

Fold in the **economics lens** yourself: rough pricing, realistic time-to-first-dollar, and whether
the user can actually ship this fast given the edge they described. Then design the cheapest test
from the riskiest assumption the panel surfaced:

```bash
python scripts/cheapest_test_designer.py --risk price --price 99
```

Output the verdict in this exact shape:

```
## THE VERDICT: GO / RESHAPE / KILL
Confidence: [low / medium / high]

**The call in one line:** [the decision, plainly]

**Why:** [2-3 sentences resolving the panel's tension]

**Biggest risk:** [the single thing most likely to kill it]
**Biggest upside:** [the strongest reason to do it]

**Money read:** [rough price, time-to-first-dollar, can they ship fast]

**The cheapest 48-hour test:** [the smallest, fastest thing they can do
to validate the riskiest assumption BEFORE building anything]

**If RESHAPE:** [the specific pivot that fixes the fatal flaw while keeping the upside]
```

Then list the five panel scores in one line: `Critic X/10 · Champion X/10 · Analyst X/10 · Investigator X/10 · Customer X/10`.

## Tooling

| Script | Role |
|---|---|
| `scripts/brief_builder.py` | Normalizes the 4 load-bearing inputs into one shared brief; flags missing/thin inputs before the panel convenes. |
| `scripts/verdict_synthesizer.py` | Weights the 5 panel scores (Customer + Critic heaviest, Champion lightest), applies veto gates, flags the real tension → GO / RESHAPE / KILL + confidence. |
| `scripts/cheapest_test_designer.py` | Maps the riskiest assumption (demand/price/feasibility/differentiation/channel/retention) to a concrete 48-hour test with pass/fail signals. |

## References

- [`references/adversarial_panel_canon.md`](references/adversarial_panel_canon.md) — why a diverse adversarial panel beats one reviewer (red-teaming, devil's advocacy, dialectical inquiry; 7 sources)
- [`references/verdict_synthesis_method.md`](references/verdict_synthesis_method.md) — the weighting, the veto gates, and why you must not average (6 sources)
- [`references/cheapest_test_canon.md`](references/cheapest_test_canon.md) — demand testing before building: smoke test, pre-sale, concierge, fake-door (7 sources)

## Assets

- [`assets/roast_brief_worksheet.md`](assets/roast_brief_worksheet.md) — fillable 4-input brief worksheet
- [`assets/example_roast_verdict.md`](assets/example_roast_verdict.md) — a full worked roast (brief → 5 panel scores → tension → verdict → cheapest test)

## Rules

- Every reviewer stays in character. None of them hedges or softens. The value is in the friction.
- The Judge must make an actual call. "It depends" is not a verdict. Pick GO, RESHAPE, or KILL and own it.
- **Do not average the scores.** A high mean can hide a fatal split or a vetoed dimension — run the synthesizer and resolve the tension it names.
- The cheapest 48-hour test is the most important output. It's how the user finds out if they're right without building the whole thing.
- Keep the final verdict skimmable. The panel does the depth; the Judge does the decision.

## Anti-Patterns To Reject

- Softening the verdict to spare feelings ("there's definitely something here…"). If it's a KILL, say KILL.
- Averaging the five scores into a mushy 6/10 and calling it a day.
- Letting the Champion's enthusiasm override a Customer who won't pay or a Critic who found the fatal flaw.
- Ending on advice with no falsifiable test ("go validate it"). Name the test, the cost, and the pass/fail line.
- Running the panel on a one-line brief so all five argue past each other.

## Distinct From (don't reach for the wrong tool)

- **`productivity/andreessen`** — a single market-first operator. `roast` is five independent lenses → a judge. Use andreessen when you specifically want the market-dominates thesis; use roast when you want 360° coverage.
- **`c-level-advisor` boardroom / `/c-level-agents:boardroom`** — an enterprise C-suite pipeline that needs `company-context.md` onboarding and outputs a board memo. `roast` is a zero-setup, solo-founder, 90-second gut check.
- **`engineering/grill-me`** — interrogates a plan one question at a time to reach shared understanding. It does not issue a GO/KILL verdict. Roast judges; grill-me clarifies.

---

**Version:** 1.0.0
**Build pattern:** Path-B persona skill — adversarial panel preserved + deterministic verdict tooling added.
