# The Creative Strategy Loop

Generation (Modes 1–3) answers "make me ads." This reference answers the question that comes first: **which ads are worth making, in what order, at what production cost** — and the retro that turns each month's results into next month's plan. It's the standing operating loop of a creative strategist, run by an agent with a human deciding.

```
Signals → Concepts (evidence-ranked) → Roadmap (tiered, capacity-checked) → Briefs → [Modes 1–3 produce] → Monthly retro → back into the icebox
```

---

## Step 1: Read the Three Signals

Creative direction comes from synthesis across three independent signal sources. One source alone misleads: the account tells you what worked *among things you've tried*, customers tell you why they buy *in their words*, and organic content tells you what the audience *chooses to watch when nobody's paying*.

| Signal | What to pull | How |
|---|---|---|
| **Account performance** | Winners/losers by angle, hook, format; funnel metrics per concept (see [hook-system.md](hook-system.md) diagnostic funnel); fatigue state | `google-ads` / `meta-ads` / `linkedin-ads` / `tiktok-ads` CLIs (see Tool Integrations in SKILL.md) |
| **Customer/brand** | Verbatim pain/desire/objection language; unexpected use cases; who's *actually* buying vs. who's targeted | The Grounded Inputs corpus (`inputs/reviews/`, `inputs/comments/`), sales-call notes, support themes — per **customer-research** |
| **External organic** | What the niche watches unpaid: top organic content, its hooks, formats, vocabulary; competitor ads running long enough to be presumed working | **scraping**, the social listening tooling in **social**, ad libraries, **competitor-profiling** |

**Cadence:** a monthly deep dive (60–90 min, all three sources, feeds the monthly roadmap) plus a weekly ~20-minute refresh (what changed: new winners/losers, new review themes, anything spiking organically). Research beyond what the next decision needs is busywork — every synthesis session should end in concepts, not notes.

**Trust rule:** every insight the agent surfaces must carry its receipt — which review, which ad's metrics, which organic post. An insight without a source doesn't enter the icebox. (Same grounding rules as everything else in this skill.)

---

## Step 2: Turn Signals into Evidence-Ranked Concepts

A **concept** is one testable creative hypothesis: *segment × motivation × angle × format*, with its evidence attached. "UGC for moms" is not a concept; "new-parent insomniacs (per 40+ reviews mentioning 3am feeds) × 'quiet enough to not wake the baby' × before/after demo × POV night-shot video" is.

Rank every concept by the strongest evidence supporting it:

| Tier | Evidence | Weight |
|---|---|---|
| 1 | Your own account: a converting ad with the same angle/segment | Strongest — iterate and extend |
| 2 | Your customers verbatim: recurring review/call language | Strong — build new creative on it |
| 3 | Competitor creative running 60+ days (presumed working) | Good — adapt the angle, never the ad |
| 4 | Organic engagement in the niche (unpaid views/saves on the theme) | Moderate — validate cheaply first |
| 5 | Cross-niche pattern (worked in an adjacent category) | Weak — icebox until corroborated |
| 6 | Team hunch, no external signal | Weakest — low-fi test or drop |

Higher evidence earns roadmap *priority* — an earlier slot in the slate. Production tier is a separate call, set by validation strength, existing assets, capacity, and risk: even a tier-2 customer-language concept starts low-fidelity until it shows a funnel signal. Hunches aren't banned — they're just cheap and last.

---

## Step 3: Branch on Account State

The right creative mix depends on which of two states the account is in. Diagnose before roadmapping — a plan built for the wrong state wastes the month.

**Exploration state** — nothing (or nothing new) is working:
- Go **wide, not deep**: mostly net-new concepts across different segments and angles; keep iterations to a small minority — iterating on losers multiplies losers
- **Redefine "win" per-metric**: with no full-funnel winners, a single-metric improvement (a hold-rate lift, a CPC drop, a CVR bump) on any test is a hit worth pulling on — see the diagnostic funnel
- Iterate **only on hits**; everything else stays exploratory
- Common root causes to check while testing: the creative is boring (safe, seen-before), the message is overcomplicated, the offer/UVP is unclear, or CPMs are punishing a too-narrow audience

**Scaling state** — one or more concepts are converting profitably:
- Go **deep on the winner** while it's open: a winner-led slate of visually-distinct variations of the winning concept (same message, new execution — near-duplicates mostly cannibalize the original's reach and teach you nothing new, so variations must look meaningfully different), plus a remix lane (tonal/emotional re-executions of it) and sub-angle probes drilling *into* the winning segment; tune the split to budget, fatigue speed, and production velocity
- Keep a small exploration allocation alive even mid-scale — winners fatigue, and the next winner is rarely an iteration of the current one
- Speed matters more in this state: a scaling window is finite

---

## Step 4: The Roadmap Artifact

Maintain one living document (suggested: `roadmap.md` beside the Grounded Inputs corpus) with three horizons:

```
## Icebox        — every concept, evidence tier + source attached, nothing scheduled
## This quarter  — 2-4 themes chosen from the icebox (the bets), with why-now
## This month    — the slate: concept | evidence tier | production tier | owner | status
```

Each monthly-slate concept gets a **production tier**:

| Tier | Cost | What it is | Use for |
|---|---|---|---|
| **T1 — Iteration** | Hours | New hook/caption/crop on an existing asset | Extending proven winners |
| **T2 — Remix** | Days | New creative from existing footage/assets/AI generation | Concepts with decent evidence or a first low-fi signal |
| **T3 — Production** | Weeks | Net-new shoot, creators, full build | Only angles with own-account proof or a prior low-fi funnel signal (fidelity ladder in [hook-system.md](hook-system.md)) |

**Capacity check — the rule that keeps roadmaps honest:** count what the team (or the AI pipeline) can produce *at quality* this month, and roadmap to that number. A 20-concept slate against 8 concepts of real capacity doesn't produce 20 ads; it produces 20 compromised ones and a burned-out team. Cut by evidence rank until the slate fits.

From the slate, generate **one brief per concept** (segment, motivation + verbatim source, angle, format, hook matrix rows, production tier, success metric) and hand each to Modes 1–3 for production.

---

## Step 5: The Monthly Creative Retro

Last step of the loop, first input of the next one. One artifact per month (suggested: `retros/YYYY-MM.md`):

```
## Winners     — concept, the funnel numbers, and the WHY (which element earned it)
## Losers      — concept, where in the funnel it died, hypothesis for why
## Metric wins — full-funnel losers with one strong metric (these are leads, not losses)
## Learnings   — pattern-level notes → written back into the icebox as new/revised concepts
## Kills       — concepts retired from the icebox, with reason
## Next slate  — first draft of next month, updated evidence ranks
```

Retro rules:

- **Judge concepts, not ads.** Three executions of one concept failing says the concept is wrong; one failing says the execution was.
- **Read the funnel, not the ROAS column.** The diagnostic funnel says *what* to fix; ROAS alone says only *that* something is broken.
- **Enough data before verdicts** — respect the impression/spend thresholds in Common Mistakes and the **ads** skill's decision systems; a two-day read is a coin flip.
- **Every learning lands somewhere**: icebox update, evidence re-rank, or kill. A retro that changes nothing in the roadmap was a meeting, not a retro.

To run this loop on a schedule (retro on the 1st, weekly refresh Mondays, daily batches via Mode 3), see the creative loops in **marketing-loops**.

---

## Failure Modes

- **Roadmapping without a diagnosis** — a slate built before reading the three signals is a wish list; testing without a diagnosis isn't strategy
- **Iteration-heavy slates in exploration state** — polishing losers while the real problem (angle, offer, audience) goes untested
- **Ignoring capacity** — the plan the team can't produce at quality is a plan to produce slop
- **Evidence-free concepts jumping the queue** — the loudest stakeholder's hunch ships as a T3 shoot while tier-2 customer language sits in the icebox
- **Retro as theater** — winners celebrated, nothing re-ranked, icebox untouched
- **Scaling-state complacency** — 100% of the slate on winner variations; when the winner fatigues, the pipeline is empty
