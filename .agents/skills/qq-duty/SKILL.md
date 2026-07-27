---
name: n8n:qq-duty
description: >-
  Runs an n8n Quality Queue (QQ) duty session, defaulting to active AI bugs with
  SLA status, ranks the queue, investigates the first issue, and continues
  issue by issue with a durable checkpoint. Use when the user says “I want to
  do QQ”, “start QQ duty”, “work the QQ queue”, “let's get started with QQ”, or
  asks what to investigate next. Requires Linear access; an explicit board or
  filter overrides the default queue.
---

# QQ duty session

Orchestrate a queue session; delegate each issue's investigation to
`n8n:qq-issue-resolution`. Default to read-only.

## Select the queue scope

Select the queue in this order:

1. An explicit board, view, or complete filter set in the user's request.
2. The active QQ session's saved scope for follow-ups such as “next.”
3. The default AI QQ queue:
   - Team is `AI`.
   - Labels include `bug`, including descendant labels under `bug`.
   - SLA status is not empty.

The default is a logical filter definition, not a dependency on a saved-view
URL. A user can therefore say “start QQ” in a new task without supplying a
link. Record the default scope as `AI bugs with SLA status` in checkpoints.

If the user explicitly requests a different queue but does not provide enough
information to identify or reconstruct it, ask exactly one question and stop:

> Which Linear board, view, or complete filter set should I use for this QQ session?

Do not reuse a scope from a different session when the user explicitly asks for
a different queue. Save the selected scope so follow-ups do not ask again.

## Acquire the board issue list

Do not invoke `n8n:qq-issue-resolution` or load individual issue context until
the board snapshot has produced issue identifiers.

Use this acquisition ladder:

1. Use the Linear integration if it can enumerate the saved view directly.
2. Otherwise, reconstruct the view with structured issue-list filters when
   they came from the selected default, were supplied by the user, or were read
   from the view. Record the exact reconstructed query. When the connector
   cannot express every selected predicate, query the narrowest supported
   superset and apply the remaining predicates to the returned issue fields.
   This is an exact reconstruction only if every predicate can be evaluated
   from the returned data.
3. If exact filters are still unknown, immediately open the supplied view in an
   available signed-in browser. Read the visible filters and collect all issue
   identifiers, following pagination or scrolling as needed.
4. If the browser reaches authentication, ask the user to sign in, then retry
   the same view. If no signed-in browser is available, ask the user to paste or
   export the filtered issue list, or explicitly approve a named approximate
   connector query.

Do not merely announce a switch to the browser: perform it in the same turn.
Do not silently substitute a broader team query.

For hierarchical labels such as “bug including child labels,” resolve the label
tree first or query the team-wide superset and filter returned labels against
the parent plus descendants. Do not assume a connector's parent-label filter
includes children. For “SLA status is not empty,” use the returned SLA status
field when available; otherwise use the presence of `slaStartedAt`/risk/breach
timestamps as the inclusion marker and disclose that mapping.

Examples:

- Bare “start QQ” uses the default `AI` team + `bug` label tree + SLA status
  present scope; it does not ask for a board link.
- Explicit “AI team Triage” can be queried as `team = AI, state = Triage`.
- “AI team + bug label tree + SLA status present” can be acquired from the
  narrowest supported AI/bug query, then filtered by bug descendants and
  non-null SLA metadata.
- A saved-view URL alone does not establish any filters.

A board snapshot succeeds only when it returns issue identifiers or a verified
empty state with the view filters visible. Navigation, an authentication page,
or a board title without issue rows is not a snapshot. Report which acquisition
method and filters produced the list.

## Establish the session

Record:

- board/view and visible filters;
- default mutation policy (`read-only` unless explicitly changed);
- queue snapshot time;
- active issues and their status, priority, SLA, assignee, labels, and update
  time;
- resolved/skipped issues and the next-candidate shortlist.

Security labels override normal reporting. Refer to private issues only by
identifier and neutral status outside their authorized context.

## Scan and rank the queue

Inspect active Triage items first. If Triage is empty, rank the board's active
bugs by least SLA time remaining.

Use this order:

1. breached or immediate SLA risk;
2. Urgent/High issues with supported impact;
3. duplicate groups, already-fixed issues, and obvious ownership mismatches
   that can remove incorrect SLA pressure;
4. tickets waiting on reporter information;
5. remaining issues by impact, age, and confidence.

Treat Flaky's priority, estimate, and ownership as hypotheses to verify. Note
new or changed items since the previous session checkpoint.

## Investigate the first issue automatically

Choose the highest-ranked issue and explain the choice in one or two sentences.
Do not ask the user to select it unless two candidates are materially tied and
the choice would change the work.

Immediately invoke `n8n:qq-issue-resolution` for that issue. It must check full
ticket context, similar issues, team ownership, source and release history,
reproducibility, priority/SLA, and the exact Linear disposition.

Do not mutate Linear, GitHub, or code merely because the session started. Draft
comments and state changes until the user grants the required permission.

## Checkpoint after every issue

After the investigation, return:

```markdown
## QQ checkpoint

- Board: <view>
- Investigated: <ID> — <verdict>
- Recommended Linear action: <state/owner/SLA action>
- Mutations: <read-only or exact changes>
- Remaining active issues: <count>
- Next: <ID> — <one-line reason>
```

Stop after the checkpoint unless the user asked to continue without pausing.

When the user says “next”, “continue”, or names another issue:

1. reuse the session board and mutation policy;
2. refresh the chosen issue and any queue items changed since the checkpoint;
3. skip issues already resolved or removed from the board;
4. run `n8n:qq-issue-resolution` for the next issue;
5. emit a new checkpoint.

If the user supplies a different board, start a new session and replace the old
checkpoint.

## Session quality bar

The session is not a sequence of summaries. Every investigated issue must end
with a defensible disposition, ownership evidence, SLA recommendation, remaining
uncertainty, and one concrete next action. Always preserve useful findings for
the next person.
