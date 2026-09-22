# Architecture Decision Records

This directory holds the Architecture Decision Records (ADRs) of the
`@n8n/engine` package. An ADR is a short, dated record of one important
technical decision: the context, the decision, the alternatives, and the
consequences.

The company process is defined in the Notion page
[Engineering Technical Decisions][process] and its sub-page
[Architecture Decision Records][adr-page].
This README applies that process to this package and records the conventions
that the reviews of the first records settled.

## When to write an ADR

Write an ADR when the reason for a decision can matter in the future. The
test from the company process: if an engineer challenges this choice in 12
months, will the original context and alternatives help them?

Write one record for each decision. The test: can this decision be reversed on
its own? If yes, it gets its own file. Do not put two independent decisions
into one record.

Do not write an ADR for an implementation detail, a refactor, or a choice that
follows an existing decision.

## File name

Use this format:

```text
ADR-YYYYMMDD-<short-decision-title>.md
```

The date is the date of the decision. The title states the decision, not the
topic: `use-postgresql-advisory-locks`, not `database-locking`.

Do not rename a record after it is merged. Links depend on the file name.
Refer to a record by its full file name, for example
`ADR-20260828-trigger-settlement-before-execution`, not by a number.

## Template

```markdown
# <Decision title>

Date: YYYY-MM-DD

Status: Active

Decision Owner: <owning team>

Source: <RFC, issue, project, incident, or other source>

Supersedes: <full file name; omit if not relevant>

Superseded by: <full file name; omit if not relevant>

## Context

## Decision

## Alternatives Considered

## Consequences

## Links

RFC:
Documentation:
Related ADRs:
```

## Status

Use one of three values:

- **Active.** The decision stands.
- **Superseded.** A newer record replaced the decision. Link to it in
  `Superseded by`.
- **Deprecated.** The decision no longer applies and no record replaces it.

There is no Draft or Proposed status. The pull request holds that state while
the record is written and checked.

The status says whether the decision stands. It does not say whether the code
exists. Implementation state belongs in Context (see below), never in the
status line.

## What goes where

**Context.** The problem and the constraints at the date of the record. Write
facts in a neutral voice. Facts about the state of the code are correct here,
because the record is dated and the reader reads Context as of that date. For
example: "Engine v2 does not apply timeouts yet." Aim for fewer than 150
words.

**Decision.** What we decided, and the main reason. Use the present tense and
the active voice: "The engine suspends the step." When the chosen mechanism is
the decision, describe it here. Do not write implementation state here. A
sentence such as "the engine does not do this yet" goes stale exactly where a
reader takes the text as the current contract.

**Alternatives Considered.** Each option we did not select, and why. Use the
conditional mood for what an alternative would do: "This option would need a
column." The indicative mood ("this option needs a column") reads as a
description of shipped code.

**Consequences.** What follows from the decision: benefits, trade-offs,
constraints, and operational effects. Not how the decision is implemented, and
not the order in which the work lands. This is the one section that may grow
after the record is merged. A consequence that the team learned later belongs
here. A changed decision does not.

**Links.** The RFC, the ticket or design document, and related records by full
file name.

## Changing a decision

A merged record is history. Do not edit its Context, Decision, or Alternatives
to reflect a later change. Write a new record instead.

Therefore a change to a record rides the pull request that merges the record.
In a stack, the change belongs in the first pull request that carries the
record, not in the follow-up that implements it. A decision can merge before
its code. That is normal, and not a reason to move or edit the record.

When a new decision replaces an old one:

1. Write a new record. Explain the new context.
2. Set `Supersedes` in the new record and `Superseded by` in the old one.
3. Set the old record's status to `Superseded`.

When a decision no longer applies and nothing replaces it, set its status to
`Deprecated`.

## Style

- Write in ASD-STE100 Simplified Technical English, as `AGENTS.md` requires:
  short sentences, the active voice, one idea for each sentence.
- Wrap lines at 80 columns. Keep each entry under `Links` on one line, even
  when it is longer.
- Keep the record short. A reader should understand the decision in a few
  minutes without the pull request or the design document.
- Use a Mermaid diagram when a picture says it better than prose.

## Process

1. The decision is made: in an RFC, a design review, a team discussion, or a
   pull request.
2. The Decision Owner, or a delegate, writes the record.
3. Open a pull request. The review checks that the record is accurate and
   clear. It does not reopen the decision.
4. Merge. The record is `Active`.
5. Implementation pull requests link to the record they implement.

[process]: https://app.notion.com/p/n8n/3bd5b6e0c94f804bac20ecc31500ce37
[adr-page]: https://app.notion.com/p/n8n/3bf5b6e0c94f8046b204c4b50533ec8b
