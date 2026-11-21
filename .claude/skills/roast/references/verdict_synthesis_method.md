# Verdict Synthesis Method — how five scores become one call (and why averaging is wrong)

The Judge's job is to turn five 1-10 scores into one GO / RESHAPE / KILL decision. The temptation is
to average them. That is the wrong method, and `verdict_synthesizer.py` encodes a better one. This
file documents the weighting, the veto gates, the tension detection, and the confidence rule — and
cites why each is built the way it is.

## Why a simple average is wrong

A mean treats all five dimensions as interchangeable and lets strengths paper over a fatal weakness.
An idea scoring Champion 9 / Customer 2 averages to a respectable ~6 — but "nobody will pay" is not
offset by "the upside is huge." Two principles override the mean:

1. **Non-compensatory decisions.** In decision theory, some attributes are *compensatory* (a high
   value on one can offset a low value on another) and some are *non-compensatory* (a low value is
   disqualifying regardless of the rest). Buying a buyer's willingness to pay is non-compensatory.
   See Hogarth, *Judgement and Choice* (1987), and the conjunctive/elimination-by-aspects models of
   Amos Tversky (*Elimination by Aspects*, Psychological Review, 1972).
2. **The weakest link dominates.** For an idea to ship, demand AND feasibility AND a reason to switch
   must all clear a bar. This is a "weakest-link" (O-ring) structure — Michael Kremer's *The O-Ring
   Theory of Economic Development* (Quarterly Journal of Economics, 1993) formalizes why one failed
   component can sink a whole system regardless of how strong the others are.

## The weighting (compensatory layer)

Within the non-disqualifying range, the dimensions are not equal:

```
customer 0.30 | critic 0.25 | investigator 0.20 | analyst 0.15 | champion 0.10
```

- **Customer heaviest (0.30).** Willingness to pay is the single hardest, most predictive signal
  (Andreessen, "The Only Thing That Matters," 2007; Ellis's PMF survey work). It is also the one
  founders fool themselves about most.
- **Critic second (0.25).** Surviving a hostile pre-mortem is strong evidence of robustness (Klein,
  HBR 2007).
- **Champion lightest (0.10).** The advocate is the *least* trustworthy single signal precisely
  because its job is to argue one side — discounting it guards against the bull talking you in. This
  asymmetry mirrors the dialectical-inquiry finding that the affirmative case must be discounted
  against its counter (Cosier & Schwenk, 1990).

## The veto gates (non-compensatory layer)

Three gates can cap the verdict below GO no matter how high the composite, encoding the
non-compensatory dimensions:

| Gate | Trigger | Rationale |
|---|---|---|
| Demand | Customer ≤ 3 | No buyer = no business. Eric Ries, *The Lean Startup* (2011): build only what someone has shown they want. |
| Fatal flaw | Critic ≤ 2 | A landed pre-mortem objection is structural, not cosmetic. |
| Broken logic | Analyst ≤ 2 | If the mechanism can't work in theory, the market can't save it. |

Gates only ever **downgrade** a verdict; they never lift one. A vetoed GO becomes a RESHAPE, and a
vetoed idea with an already-weak composite becomes a KILL.

## Tension detection (the part the tool hands back to the Judge)

The tool finds the widest gap between any two panelists. A large spread (≥ 4 points) means the panel
fundamentally disagrees, and that disagreement — not the average — is the decision. This operational-
izes dialectical inquiry: the value is in the clash of thesis and antithesis, which the Judge must
resolve in prose rather than smooth over (Cosier & Schwenk, 1990; Mason & Mitroff, *Challenging
Strategic Planning Assumptions*, 1981).

## Confidence from agreement, not from the score

Confidence is derived from panel **agreement**, not from how high the composite is:

- tight panel (range ≤ 2) → high confidence
- split panel (range 3-5) → medium
- wide split (range > 5) → low
- a gate-downgraded GO is never high confidence

This reflects the wisdom-of-crowds result that an aggregate is trustworthy in proportion to the
independence and convergence of its judges (Surowiecki, *The Wisdom of Crowds*, 2004). A 7/10 that
five reviewers agree on is a different fact than a 7/10 hiding a 9-vs-2 brawl.

## What the tool does NOT do

It does not write the verdict prose, the money read, or the cheapest test. Those require judgment the
arithmetic can't supply. The tool fixes the *call and the confidence* so they're reproducible; the
Judge supplies the reasoning. This division — deterministic scoring, human-written synthesis — is the
same "algorithm over AI" discipline used across this repo's scoring skills.

## Sources

1. Amos Tversky, *Elimination by Aspects: A Theory of Choice*, Psychological Review, 1972.
2. Robin Hogarth, *Judgement and Choice*, Wiley, 1987 (compensatory vs. non-compensatory models).
3. Michael Kremer, *The O-Ring Theory of Economic Development*, QJE, 1993 (weakest-link systems).
4. Gary Klein, *Performing a Project Premortem*, Harvard Business Review, 2007.
5. Eric Ries, *The Lean Startup*, Crown Business, 2011 (validated demand before build).
6. Cosier & Schwenk, *Agreement and Thinking Alike*, Academy of Management Executive, 1990; with
   Mason & Mitroff, *Challenging Strategic Planning Assumptions*, Wiley, 1981 (dialectical inquiry).
