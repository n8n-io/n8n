# Minimum Path to Value (MPTV)

**Minimum Path to Value (MPTV)** — the least number of steps to experience *enough* value to make a confident decision.

Not the fastest path to *any* value, and not the full feature tour. It's the shortest route to a moment that's convincing enough for the user to decide "yes, this is for me." Everything else waits.

## Why fewer steps win: Hick's Law

**Hick's Law** — the time and effort to make a decision grows with the number and complexity of choices. Every step, field, and option in onboarding is another decision. More decisions = more hesitation, more drop-off.

MPTV is the deliberate application of Hick's Law to onboarding: strip the path down to the fewest decisions required to reach value.

## The abandonment reality

You have far less time and patience than you think:

- **40–60% of users who sign up for a free trial abandon after a single session** — and never return.
- **75–80% of trial abandonment happens within the first day.**

The decision to stick or bail is made almost immediately. If value isn't reached in the first session, most users are already gone. MPTV exists because the window is that small.

## The process: inventory → remove → reconstruct

Build (or fix) your MPTV in three passes:

1. **Take inventory.** List *every* step between signup and value — every screen, form field, click, confirmation, permission prompt, and empty state. Be exhaustive and honest. Most teams underestimate their own step count by half.

2. **Remove the nonessential.** For each step ask: does the user *have* to do this to reach value right now? If not, cut it, defer it, pre-fill it, or make it skippable. Default to removal. Configuration, profile completeness, advanced settings, and "nice to know" education are almost never essential to first value.

3. **Reconstruct / iterate.** Rebuild the path with only what survived, in value-first order. Then measure and iterate — the first reconstruction is a hypothesis, not a finish line. Watch where users still stall and cut again.

## Benchmark patterns

Products with famously short paths to value:

| Product | MPTV pattern |
|---------|--------------|
| **Stripe** | Get a working payment integration in **~7 lines of code / ~60% activation** — value (a real charge) before any account polish. |
| **Calendly** | **3-step** setup to a shareable, working booking link. Value is a link you can send immediately. |
| **Notion** | **Progressive disclosure** — starts nearly empty, reveals features only as the user needs them. The path to first value (a written page) is trivial; depth unfolds later. |

The pattern across all three: reach a real, usable outcome fast, and hide complexity until it's asked for.

## Applying it

- Define the value moment first (the aha moment — see SKILL.md). MPTV is the path *to* that moment.
- Count your current steps before optimizing. You can't remove what you haven't inventoried.
- Treat every retained step as guilty until proven essential.
- Measure step-completion and time-to-value after each reconstruction; the abandonment stats mean your margin for error is one session.
