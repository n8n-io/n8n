# Adversarial Panel Canon — why five hostile lenses beat one polite reviewer

The `/roast` skill exists because a single reviewer — human or model — converges toward agreement.
LLMs are trained to be helpful and tend toward sycophancy; founders are too close to their own idea
to see its fatal flaw. The fix is not a smarter single critic but a **structured, diverse,
adversarial panel** whose disagreement is the product. This file documents the canon behind that
design and why the five seats are the ones they are.

## The core problem: agreement is the default failure mode

- **Sycophancy in LLMs.** Anthropic's research on sycophancy (Sharma et al., *Towards Understanding
  Sycophancy in Language Models*, 2023) shows assistants tend to tell users what they want to hear,
  especially on subjective judgment calls — exactly the regime an idea-validation prompt lives in.
  A panel with explicitly hostile mandates is a structural counter to that pull.
- **Groupthink.** Irving Janis, *Victims of Groupthink* (1972), documents how cohesive groups
  suppress dissent and converge on bad decisions; his remedy includes assigning a designated critical
  evaluator and a devil's advocate. The Critic seat is that role, made mandatory.
- **Confirmation bias.** The founder seeks evidence for the idea. Karl Popper's falsificationism
  (*The Logic of Scientific Discovery*, 1959) reframes the task: the goal is to try to *refute* the
  idea, and what survives refutation is what you can trust. The Critic and the Customer are the
  refutation engines.

## Why a *diverse* panel, not five critics

Redundant critics find the same flaws. The five seats are chosen to be **non-overlapping lenses** so
each surfaces failure modes the others are blind to:

| Seat | Lens | Failure mode it catches |
|---|---|---|
| The Critic | Red team / pre-mortem | The fatal flaw, the fastest path to death |
| The Champion | Bull case / opportunity | Under-ambition; the 10x version left on the table |
| The Analyst | First principles, no web | Broken logic, incentives that don't line up, math that can't work |
| The Investigator | External evidence | Contradiction by what already exists in the market |
| The Customer | Voice of the buyer | "Nice idea, I still wouldn't pay" |

- **Red teaming.** The U.S. intelligence and security communities formalized red teaming precisely
  because internal teams cannot critique their own plans objectively (Micah Zenko, *Red Team: How to
  Succeed by Thinking Like the Enemy*, 2015). The Critic is a one-seat red team.
- **Pre-mortem.** Gary Klein's pre-mortem technique (*Performing a Project Premortem*, Harvard
  Business Review, 2007) asks the team to assume the project has already failed and explain why —
  shown to increase the number of identified risks. The Critic's mandate ("assume this idea fails")
  is a pre-mortem.
- **Dialectical inquiry & devil's advocacy.** Schwenk and Cosier's research on strategic decision
  aids (e.g. Cosier & Schwenk, *Agreement and Thinking Alike*, Academy of Management Executive, 1990)
  finds that structured conflict — dialectical inquiry (thesis vs. counter-thesis) and devil's
  advocacy — produces better assumptions and recommendations than consensus-seeking. The
  Champion/Critic pairing is a dialectic; the Customer is the reality test.
- **Wisdom of crowds requires independence.** James Surowiecki, *The Wisdom of Crowds* (2004), shows
  aggregated judgments beat individual experts **only when the judges are independent and diverse**.
  This is why Step 2 fires all five in parallel with the same brief but no shared context — they must
  not anchor on each other. (The same independence principle drives "Phase 2 isolation" in this
  repo's `c-level-advisor` board-meeting protocol.)

## The Analyst/Investigator split is deliberate

One seat is **forbidden from using the web** (first principles only); the other is **required to**.
This separates two distinct questions that a single reviewer blurs:

- *Does the logic hold even in theory?* (Analyst) — protects against ideas that are internally
  incoherent regardless of market.
- *Does the real world agree?* (Investigator) — protects against ideas that are logically elegant but
  already disproven by existing competitors or absent demand.

An idea that fails the Analyst is broken in principle. An idea that fails the Investigator is broken
in practice. You want to know which.

## The Customer is the heaviest seat for a reason

Marc Andreessen's "market wins" thesis and Sean Ellis's product/market-fit work both reduce to one
question the founder is worst-placed to answer honestly: *will the buyer actually pay?* Role-playing
the buyer in first person (a standard technique in jobs-to-be-done customer research; see Clayton
Christensen et al., *Competing Against Luck*, 2016) surfaces the real objection — which is almost
always "I'll just keep doing nothing," the most underrated competitor.

## Sources

1. Sharma et al., *Towards Understanding Sycophancy in Language Models*, Anthropic, 2023.
2. Irving L. Janis, *Victims of Groupthink*, Houghton Mifflin, 1972.
3. Karl Popper, *The Logic of Scientific Discovery*, 1959 (falsificationism).
4. Micah Zenko, *Red Team: How to Succeed by Thinking Like the Enemy*, Basic Books, 2015.
5. Gary Klein, *Performing a Project Premortem*, Harvard Business Review, 2007.
6. James Surowiecki, *The Wisdom of Crowds*, Doubleday, 2004 (independence + diversity conditions).
7. Cosier & Schwenk, *Agreement and Thinking Alike: Ingredients for Poor Decisions*, Academy of
   Management Executive, 1990 (dialectical inquiry vs. devil's advocacy vs. consensus).
