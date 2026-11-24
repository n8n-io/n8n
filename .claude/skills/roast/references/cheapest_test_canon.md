# Cheapest Test Canon — validate demand before you build a thing

The most important output of `/roast` is not the verdict — it's the cheapest 48-hour test. A verdict
is an opinion; a test turns the riskiest assumption into a number. This file documents the canon
behind `cheapest_test_designer.py`: which test fits which risk, and why each is framed to produce a
falsifiable pass/fail signal rather than vibes.

## The principle: find the riskiest assumption and test only that

- **Riskiest-assumption-first.** Every idea rests on a stack of assumptions; only one or two are both
  load-bearing AND unproven. Discovery should attack those first. This is the core of Marc Andreessen
  / Steve Blank "customer development" (Blank, *The Four Steps to the Epiphany*, 2005) and of design
  thinking's "desirability/feasibility/viability" triage (IDEO; Tim Brown, *Change by Design*, 2009).
- **Build-Measure-Learn.** Eric Ries, *The Lean Startup* (2011): the unit of progress is validated
  learning, and the goal of an MVP is to test a hypothesis with the least effort. The cheapest test is
  an MVP for a single assumption, not a small version of the whole product.
- **Falsifiability.** A test only counts if a result could prove you wrong (Popper, *The Logic of
  Scientific Discovery*, 1959). "I talked to users and they liked it" is not falsifiable. "10%+ of
  cold traffic gave me an email" is.

## The risk → test map

| Risk | Test | Canon |
|---|---|---|
| **Demand** (will anyone want it?) | Smoke-test landing page + paid traffic; measure visitor→signup | Ries (MVP / smoke test); the classic Dropbox demo-video test |
| **Price** (will they pay, how much?) | Pre-sell — real payment, paid pilot, or signed LOI before building | Blank customer development; "the only validation that counts is a credit card" (Amy Hoy, *Stacking the Bricks*) |
| **Feasibility** (can it be delivered?) | Concierge / Wizard-of-Oz — deliver the outcome by hand, no product | Ries (concierge MVP); Manning & Bodine on Wizard-of-Oz prototyping |
| **Differentiation** (why you over the incumbent / nothing?) | 5 head-to-head buyer interviews with switchers | Christensen, *Competing Against Luck* (2016), jobs-to-be-done; Rob Fitzpatrick, *The Mom Test* (2013) |
| **Channel** (can you reach them affordably?) | Single-channel reachability spike; measure reply/click at sane cost | Weinberg & Mares, *Traction* (2015), bullseye framework |
| **Retention** (will they come back?) | One-week concierge probe; watch unprompted repeat use | Ries (cohort behavior over vanity metrics); Ellis on PMF retention |

## Why each test is framed pass/fail

The tool ships an explicit PASS and FAIL signal for every test because the failure mode of "go
validate it" advice is that the founder runs a soft version, gets warm-but-meaningless feedback, and
proceeds anyway. Rob Fitzpatrick's *The Mom Test* (2013) is the canonical treatment: people lie to be
nice, so you must design the question (and the success threshold) so a polite non-answer reads as a
fail. Concretely:

- **A real charge beats a survey.** "I would pay" is free to say. A declined payment link is data.
- **A stranger beats a friend.** Friends inflate. The pass bar is a commitment from someone with no
  reason to be kind.
- **Behavior beats opinion.** Did they come back / click / pay — not did they say they would.

## The 48-hour constraint is the point

Time-boxing forces the test to be small enough to actually run before motivation fades and cheap
enough that the answer arrives before money is committed. A test that takes a month to set up is a
mini-build, not a de-risking experiment — and the whole purpose is to find out you're wrong *before*
you build. This is the "fail fast, fail cheap" discipline (Ries; Blank) made operational.

## Sources

1. Eric Ries, *The Lean Startup*, Crown Business, 2011 (MVP, concierge MVP, Build-Measure-Learn).
2. Steve Blank, *The Four Steps to the Epiphany*, 2005 (customer development, riskiest assumption).
3. Rob Fitzpatrick, *The Mom Test*, 2013 (talking to customers without getting lied to).
4. Clayton Christensen et al., *Competing Against Luck*, HarperBusiness, 2016 (jobs-to-be-done).
5. Gabriel Weinberg & Justin Mares, *Traction*, Portfolio, 2015 (bullseye channel testing).
6. Tim Brown, *Change by Design*, HarperBusiness, 2009 (desirability/feasibility/viability).
7. Karl Popper, *The Logic of Scientific Discovery*, 1959 (falsifiability of a test).
