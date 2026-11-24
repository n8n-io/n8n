# Worked Example — A Full Roast

A complete run, brief → panel → verdict → cheapest test, so you can see the shape of the output.

---

## The brief (from `brief_builder.py`)

> The idea: An AI that drafts grant applications for small nonprofits from a 10-minute intake call.
> Target buyer: 1-3 person nonprofits with no dedicated grant writer. How it makes money: $99/mo SaaS,
> annual upsell. The founder's edge: I ran a nonprofit for 8 years and wrote 40+ grants. Constraints:
> bootstrapped, need first paying customer within 30 days.

## The panel (5 reviewers, in parallel)

**The Critic — 4/10.** "Grants are won on relationships and track record, not prose quality. An AI
draft doesn't fix the real bottleneck: a 2-person nonprofit still can't get the program officer to
take their call. Worst case, you automate the *cheap* part and leave the expensive part untouched."

**The Champion — 8/10.** "If you nail this, every small nonprofit in the country is a customer, and
you sit on a dataset of what wins grants that nobody else has. Upsell into reporting, renewals,
donor CRM. This is a wedge into nonprofit back-office, not a one-trick tool."

**The Analyst — 7/10.** "The mechanism is sound: intake → structured draft is a real time-saver, and
the willingness-to-pay logic holds if you save 10+ hours per application. The risk in the logic is
volume — a tiny nonprofit applies to maybe 6 grants a year, so the value-per-month is thin unless you
expand scope."

**The Investigator — 5/10.** "Grantable, Instrumentl, and a wave of GPT wrappers already target this.
Foundations are also signaling they can detect and discount AI-written applications. Demand exists but
it's crowded and the moat is unclear at $99."

**The Customer — 6/10.** "I'd try it — writing grants is the worst part of my month. But $99/mo for 6
applications a year is a hard sell on my budget; I'd want pay-per-application or a free draft first. If
it actually got me one grant, I'd pay anything."

## Synthesis (from `verdict_synthesizer.py --critic 4 --champion 8 --analyst 7 --investigator 5 --customer 6`)

```
Composite: 5.65/10   Verdict: RESHAPE   Confidence: medium
Real tension: Champion 8 vs Critic 4 — a 4-point split. Resolve, don't average.
```

---

## THE VERDICT: RESHAPE
Confidence: medium

**The call in one line:** There's a real, painful job here — but not at $99/mo for 6 applications a
year, and not if you only automate the writing.

**Why:** The panel's tension is Champion-vs-Critic: huge platform upside against the hard truth that
prose isn't the bottleneck and the market is crowded. The Customer breaks the tie — they'd pay
"anything" for a *won* grant but balk at a flat subscription for drafts. That points at the reshape.

**Biggest risk:** You automate the cheap part (writing) and leave the expensive part (winning)
untouched — so churn is brutal after the first unsuccessful cycle.

**Biggest upside:** The proprietary dataset of what actually wins grants, which compounds into a
nonprofit back-office platform no GPT wrapper can copy.

**Money read:** $99/mo flat is the weak point. Pay-per-application ($49/draft) or success-aligned
pricing matches how the buyer experiences value. Time-to-first-dollar is realistic inside 30 days via
pre-sales given the founder's network.

**The cheapest 48-hour test** (`cheapest_test_designer.py --risk price --price 49`): Pre-sell. Offer
10 nonprofits in your network a $49 "we draft your next application" deal — real payment up front,
delivered concierge (by hand, no product). PASS if ≥ 2 strangers-to-you prepay. FAIL if everyone
says "sounds great" and nobody pays.

**If RESHAPE:** Drop the flat SaaS framing. Sell outcomes per application, deliver the first one
concierge to prove you can actually move the win-rate, and let the dataset — not the prose — become
the moat.

Scores: Critic 4/10 · Champion 8/10 · Analyst 7/10 · Investigator 5/10 · Customer 6/10
