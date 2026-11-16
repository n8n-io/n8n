---
name: decision-council
description: Test an important decision from five different points of view, let each view criticise the others, then give one clear verdict. Use when the user asks for "le conseil", "conseil de décision", "passe ça au conseil", "council this", "teste cette décision", or when the user hesitates between real options with money, time or customers at stake (PitUp launch, price, hiring, a big bet, a new product). Do not use for facts, simple yes/no questions or writing tasks. Our own skill (2026-11-16), inspired by the "LLM council" idea of Andrej Karpathy; no third-party text.
---

# Decision council

One answer from one point of view hides its blind spots. The council makes five
points of view work on the same decision, makes them criticise each other, and ends
with one verdict the user can act on.

## When to run it

Run it for a decision where a wrong choice costs money, time, customers or trust:
"launch PitUp in Kenya or Kampemba first?", "price delivery at 2,000 or 3,000 FC?",
"hire a courier or pay per delivery?", "stake on this ticket or not?".

Do not run it for facts ("what time is the match?"), for writing ("write a WhatsApp
message") or when the answer is already clear. Then answer directly and say why.

## Step 1. Frame the decision (before any advisor speaks)

Write 4 lines:
1. **The decision**, as a question with its real options (add "do nothing" if it is one).
2. **The goal** behind it (more orders? less risk? save time?).
3. **Facts known**, with their source, and **assumptions**, marked as such.
4. **Constraints**: money available, deadline, people, place (Lubumbashi realities:
   mobile money, roads, power cuts, WhatsApp as the main channel).

If a missing fact would change the verdict, ask for it once. Otherwise go on and list it
as an open question.

## Step 2. Five advisors

Each advisor answers alone, without reading the others. Each gives: its recommendation,
its 2 or 3 strongest reasons, and the one thing that would make it change its mind.

| Advisor | Looks at |
|---|---|
| **The operator** | Can we do it next week with the people and money we have? What is the first concrete step? |
| **The sceptic** | What goes wrong? Worst realistic case, hidden costs, what we are pretending not to see. |
| **The customer** | A real buyer or shop owner in Lubumbashi: do they want it, trust it, pay for it? |
| **The numbers** | Costs, margin, break-even, the size of the bet compared with what we can afford to lose. |
| **The outsider** | Someone from another trade: what would they do differently? Is there a simpler option nobody listed? |

For a betting decision, replace "the customer" with **the bookmaker**: what margin is in
the price, and is the bet above the fair odds?

## Step 3. Cross-review

Show the five answers again as A to E, without the advisor names. Each advisor reads the
other four and says, in two lines: which answer is the strongest and why, and which one
has the most dangerous gap. Anonymous labels stop an advisor from simply agreeing with
the "expert" role.

## Step 4. Verdict (the chair)

The chair reads everything and writes the result for the user, in French and in plain
words (see `.claude/CLAUDE.md`, rule on reports):

```
**Décision recommandée :** <one sentence>
**Pourquoi :** <2 or 3 reasons, the ones that survived the cross-review>
**Où le conseil n'est pas d'accord :** <the real disagreement, in one or two lines>
**Le risque principal et comment le limiter :** <one line>
**Ce qui ferait changer d'avis :** <the fact or number to watch>
**Prochaine action (cette semaine) :** <one concrete step, cheap to test>
```

Do not average the opinions. If one advisor found a fatal flaw, it wins even alone.
If the council is truly split, say so, and give the cheapest test that would decide.

## How to run it here

- **Default: in this conversation.** Write the five advisors one after the other, each
  starting from the framing only. This costs one answer, not five.
- **Separate agents only when the user asks** ("conseil avec agents", "vrai conseil"):
  then start five agents with the framing and one role each, wait for all five, then do
  steps 3 and 4. Say that this uses more of the usage limit.
- Show the user the verdict first. Put the five full opinions after it, short, for
  those who want the detail.
