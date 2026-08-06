# Architecture Decision Records

An ADR records a decision **that was actually made** — by whom, in what context, with what consequences we accepted — so the same lesson does not get paid for twice.

## Index

| # | Title | Date | Status | Tags |
| --- | --- | --- | --- | --- |
| [001](./001-generated-frontend-source-resolution-mapping.md) | Derive the frontend source-resolution mapping from the filesystem | 2026-08-06 | Accepted | frontend, build, modularization |

## What gets an ADR

Any one of these qualifies:

- Hard or expensive to reverse.
- Shapes future work — others will build on the assumption.
- Was genuinely contested; the losing option was real.
- A decision **not** to do something ("we evaluated X and stayed on Y"). These prevent the most expensive re-litigations.

Not ADR material: implementation details inside one owner's lane, reversible defaults, taste.

## Rules

- **File within a day of the decision.** The record may trail the decision; memory of *why* decays fastest right after the relief of deciding.
- **Numbers are sequential and never reused.** `NNN-kebab-slug.md`.
- **Every ADR states the costs it accepted.** An ADR with only upside is a press release, and it makes the revisit triggers meaningless.
- **Revisit triggers are written at filing time**, while judgment is still cold.
- **ADRs are append-only.** Never edit an ADR's substance to match new reality — that turns the archive into retroactive fiction. Typo and link fixes are fine.
- **Changed your mind? Write a new one.** The new ADR gets `Supersedes: ADR-NNN`; the old one's status flips to `Superseded` and gains `Superseded by:`. The chain is the memory.
- **Statuses:** `Proposed` → `Accepted` → `Superseded` | `Deprecated` (no longer applies, nothing replaced it).

## Template

```markdown
# ADR-NNN: <decision in a short noun phrase>

Date: YYYY-MM-DD · Status: Accepted

- **Decided by:** <who actually made the call>
- **Implemented by:** <PR link>
- **Supersedes:** — · **Superseded by:** —

## Context
What was true when we decided: constraints, measurements, the options that were live.
Enough that a stranger in a year understands why this was reasonable.

## Options considered
Each option with its strongest case stated fairly, then why it lost.

## Decision
One sentence, active voice: "We will …"

## Consequences
**Good** — what this buys.
**Bad** — the costs we accepted. Required.
**Neutral** — what changed without being better or worse.

## Revisit triggers
Concrete, checkable conditions that mean "reopen this".
```
