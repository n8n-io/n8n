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

The file name follows from the title and the date:

```text
ADR-YYYYMMDD-<title in kebab-case>.md
```

The title is the H1 of the record. It states the decision, not the topic:
"Use PostgreSQL advisory locks", not "Database locking". The date is the date
of the decision, and it matches the `Date` field. CI checks both.

Do not rename a record after it is merged. Links depend on the file name.
Refer to a record by its full file name, for example
`ADR-20260828-obtain-trigger-output-before-creating-the-execution`, not by a
number. CI checks that every record ID a record mentions names a file.

## Template

Copy [`docs/ADR_TEMPLATE.md`](../../../../../docs/ADR_TEMPLATE.md) from the
repository root. It is the one template, and CI checks every record against
its structure.

The header has three required fields, `Date`, `Status`, and `Decision Owner`,
in that order, and three optional fields, `Source`, `Supersedes`, and
`Superseded by`. Omit an optional field that has no value. `Source` names
where the decision came from: a ticket, an RFC, or an incident. The body
names none of these. The `RFC` field under `Links` holds the link to the RFC.

## Status

Use one of three values:

- **Active.** The decision stands.
- **Superseded.** A newer record replaced the decision. Link to it in
  `Superseded by`.
- **Deprecated.** The decision no longer applies and no record replaces it.

There is no Draft or Proposed status. The pull request holds that state while
the record is written and checked.

The status says whether the decision stands. It does not say whether the code
exists. Implementation progress belongs nowhere in the record.

## What goes where

**Context.** The problem and the constraints. State the world as it is, in
the present tense: "In engine v1, `putExecutionToWait` sleeps in the process
for a time wait under 65 seconds." Do not date a fact ("at the date of this
record"), do not narrate history ("core has since decided"), and do not phase
work ("the shim's part lands later"). The record is dated once, in its header.
Aim for fewer than 150 words.

**Decision.** What we decided, and the main reason. State the behaviour the
decision guarantees, in the present tense and the active voice: "A wait fires
at its deadline and not before it. A wait fires once, however many replicas
run." Describe the mechanism only when the mechanism is the decision. A sweep
that sleeps until the next deadline is how the engine fires waits today; the
guarantee is what the record decides. Do not write implementation state here.
A sentence such as "the engine does not do this yet" goes stale exactly where
a reader takes the text as the current contract.

**Alternatives Considered.** Each option we did not select, and why. Lead with
the reason: "We rejected it for two reasons." An option that reads as an equal
choice leaves the reader to guess why it lost. Use the conditional mood for
what an alternative would do: "This option would need a column." The
indicative mood ("this option needs a column") reads as a description of
shipped code.

**Consequences.** What follows from the decision: benefits, trade-offs,
constraints, and operational effects. A constraint on the mechanism belongs
here: "One statement must read the step rows and write the status." How the
code meets the constraint today, and the order in which the work lands, do
not. This is the one section that may grow after the record is merged. A
consequence that the team learned later belongs here. A changed decision does
not.

**Links.** Exactly three fields, each on one line: `RFC`, `Documentation`, and
`Related ADRs`. Write `-` when a field has no value. Name related records by
full file name. There is no `Tickets` field.

## Changing a decision

A merged record is history. Do not edit its Context, Decision, or Alternatives
to reflect a later change. Write a new record instead.

Therefore a change to the Context, the Decision, or the Alternatives rides the
pull request that merges the record. In a stack, the change belongs in the
first pull request that carries the record, not in the follow-up that
implements it. A decision can merge before its code. That is normal, and not a
reason to move or edit the record.

When a new decision replaces an old one:

1. Write a new record. Explain the new context.
2. Set `Supersedes` in the new record and `Superseded by` in the old one.
3. Set the old record's status to `Superseded`.

When a decision no longer applies and nothing replaces it, set its status to
`Deprecated`.

## Style

- Write in ASD-STE100 Simplified Technical English, as `AGENTS.md` requires:
  short sentences, the active voice, one idea for each sentence.
- Wrap paragraph lines at 100 columns. CI enforces it. The `Links` fields
  are exempt and stay on one line each.
- Do not reference a ticket in the body. Every sentence must stand without
  the ID: "Send-and-wait nodes need credentials to send their message." The
  `Source` field is the one place for a ticket.
- Use plain words. "Nothing moves a step from `waiting` to `completed` in one
  step" beats "No component completes a waiting step directly".
- Keep the record short. A reader should understand the decision in a few
  minutes without the pull request or the design document.
- Use a Mermaid diagram when a picture says it better than prose.

## Checked by CI

The `adr-conventions` rule of `@n8n/code-health` runs in the Static Analysis
check of every pull request. For every `ADR-*.md` file it checks:

- a `docs/adr` directory at the repository root or at a package root;
- a file name that matches the H1 and the `Date` field;
- the header fields, their order, and one blank line between them;
- a `Decision Owner` from the allowed list in
  `packages/testing/code-health/src/index.ts`;
- a full file name in `Supersedes` and `Superseded by`;
- exactly the five sections, in order, each with content;
- the three `Links` fields, one line each;
- paragraph lines of at most 100 characters outside `Links`;
- that every record ID (`ADR-YYYYMMDD-…`) the record mentions names a file
  in this repository.

Run it locally:

```bash
pnpm --filter=@n8n/code-health check --rule=adr-conventions --ignore-baseline
```

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
