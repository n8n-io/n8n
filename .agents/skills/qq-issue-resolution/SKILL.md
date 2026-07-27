---
name: n8n:qq-issue-resolution
description: >-
  Resolves n8n Quality Queue (QQ) issues with evidence-backed triage, ownership,
  reproduction, duplicate/release checks, and a clear Linear disposition. Use
  for QQ duty, AI-team bug queues, SLA triage, or deciding what to do with a
  Linear bug. Requires Linear access; uses gh when GitHub context is linked.
---

# QQ issue resolution

Resolve one QQ issue to a defensible next state. Do not treat Flaky's analysis,
a Sentry title, or a reporter's suspected cause as established fact.

## Requirements

- Use the Linear integration for issues, comments, relations, and attachments.
- Use authenticated `gh` for linked GitHub issues and PRs. If unavailable, stop
  before reaching a final verdict and report the missing evidence.
- Default to read-only. Draft comments and state changes unless the user
  explicitly authorizes posting or updating Linear.

## Workflow

### 1. Select and secure the issue

When choosing work, inspect AI Triage first. Prefer immediate SLA risk, then
High/Urgent issues, then high-leverage cleanup such as duplicate groups or
misrouted tickets.

Invoke `n8n:linear-issue` to collect the complete issue, comments, relations,
media, linked GitHub context, affected-node popularity, and Flaky estimates.

Before exposing details, check for private/security labels. For private tickets,
use only the identifier and a neutral status in reports and public artifacts.

### 2. Build an evidence ledger

Separate findings into:

- **Observed:** stack frames, versions, event counts, workflow data, screenshots,
  comments, source behavior, test output.
- **Inferred:** likely cause, owner, duplicate relationship, expected fix.
- **Missing:** provider payload, current-version reproduction, credentials,
  reporter steps, release containment.

Inspect every attachment. Treat health-check URLs and similar telemetry context
as incidental unless the stack proves they caused the failure.

### 3. Trace the actual boundary

Follow the stack from the external failure into n8n source. Check shared
wrappers and execution boundaries before concluding that the leaf node needs
its own catch or `continueOnFail` handling.

Search git history for earlier fixes and related tickets. For a candidate fix:

1. Verify that it covers the same operation and failure boundary.
2. Check whether the affected release contains the fix.
3. Check the newest available release too; merged does not mean released.
4. Distinguish error classification/reporting fixes from improvements to the
   user-facing message.

Use the release and historical-test commands in [reference.md](reference.md).

### 4. Find similar issues and establish ownership

Search Linear across all teams, including completed and canceled issues, using
the exact error class, provider/status code, top n8n stack frame, affected
operation, and a short symptom phrase. Search GitHub for the same source symbol
and failure boundary.

For each plausible match, compare:

- operation and code boundary, not title alone;
- root cause and required fix;
- affected versions and event timing;
- linked PR, release state, and verification evidence;
- current team, assignee, and prior routing decisions.

Same timestamp, provider, or generic error title is a lead, not proof of a
duplicate. Prefer as canonical the issue with the clearest evidence and active
fix or release tracking.

Determine the likely owner from the failing boundary. Check `.github/CODEOWNERS`,
git history for the affected path, related PR reviewers/authors, and the teams
that resolved genuinely similar Linear issues. Do not route from the ticket's
current team, labels, reporter, or leaf node alone. Shared execution boundaries
may belong to Core, Trust, or another platform team even when an AI node exposes
the symptom.

Record both the proposed owner and the evidence for it. If signals conflict,
draft a cross-team ownership-confirmation comment instead of silently moving the
issue. See [reference.md](reference.md) for the search and ownership checklist.

### 5. Prove or limit the claim

Invoke `n8n:reproduce-bug` when a deterministic automated test can exercise the
reported boundary.

Prefer a focused regression test that:

- injects the observed provider error at the exact callback or operation;
- asserts the correct n8n behavior;
- has an existing happy-path control;
- passes on current master;
- fails on the commit immediately before the candidate fix, when practical.

Do not call a bug fixed merely because a nearby test passes. State exactly what
the test proves and what it cannot prove. Bail out when reproduction requires
real third-party credentials, timing, or inaccessible infrastructure.

### 6. Choose the Linear disposition

Use one primary outcome:

- **Reproducible current bug:** confirm owner, priority, estimate, and SLA; leave
  a regression test and proceed to implementation only when authorized.
- **Already fixed, unreleased:** relate or mark duplicate of the canonical
  ticket, move to `To be released`, remove the active duplicate SLA, and define
  a post-release verification condition.
- **Duplicate active issue:** select a canonical issue, consolidate evidence,
  and remove duplicate SLA pressure.
- **Missing reporter evidence:** draft a precise evidence request; recommend
  `Blocked from pick up` with SLA removed until the reporter responds.
- **Wrong owner:** identify the likely team from the failing boundary and draft
  a concise comment tagging that team.
- **Expected upstream/provider failure:** keep useful user-facing handling work
  separate from Sentry-noise or provider-cause claims.
- **Not reproducible:** document attempts and confidence; do not invent a fix.

Priority follows demonstrated user impact and supported severity, not event
volume alone. Reassess Flaky's priority and estimate against the evidence.

### 7. Close the loop

If code or tests should be submitted, invoke `n8n:create-pr`. Keep public branch
names, commits, test names, and PR text neutral when security hygiene applies.

Always leave a handoff containing:

- verdict and confidence;
- facts versus remaining uncertainty;
- similar issues checked and canonical/duplicate decision;
- ownership, priority, SLA, and estimate recommendation;
- exact next Linear action;
- validation performed and post-release success condition;
- mutations made, or an explicit statement that the run was read-only.

Use the templates in [reference.md](reference.md).

## Quality bar

A QQ issue is resolved only when the next person can act without repeating the
investigation. “Looks fixed,” “probably upstream,” and “needs more info” are not
complete outcomes without supporting evidence and a concrete state transition.
