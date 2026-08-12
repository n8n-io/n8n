---
name: one-off-task
description: >-
  Executes run-once work immediately, WITHOUT building a workflow, by
  delegating to a sandboxed coding sub-agent (run-one-off-task tool). Load
  when the deliverable is an external artifact or result produced once, now:
  create a spreadsheet, document, channel, repo, or folder structure
  (optionally filled with generated, example, or computed data); a one-time
  data transfer, import, or backfill; a one-off report, analysis, audit, or
  bulk cleanup. Signals: the request names no trigger, no schedule, and no
  recurrence — the user wants the thing to exist, not an automation that
  produces it. For such requests this skill takes precedence over
  workflow-builder: a workflow that would run once is the wrong shape.
  Recurring, scheduled, or event-triggered automation still belongs to
  workflow-builder.
recommended_tools:
  - run-one-off-task
  - credentials
---

# One-Off Tasks

Use this skill to hand run-once work to a sandboxed coding sub-agent via
`run-one-off-task`. The sub-agent writes and runs code against provider SDKs
inside a sandbox, verifies the result by reading it back, and returns a
structured report.

## Routing: workflow or one-off task

The deciding question: is the deliverable an **automation** (something that
runs again later) or an **artifact** (something that exists after running
once)?

- **Artifact, no trigger, no schedule → one-off task.** Create a resource,
  generate and insert data, transfer or import data once, backfill history,
  produce a report, audit or clean up existing data. Do NOT build a workflow
  that would run once and never again — that wastes the user's time on
  trigger/canvas machinery the task does not need.
- **Recurring, scheduled, or triggered work → build a workflow.** Anything
  with "every", "whenever", "each time", "on new X", a webhook, or a trigger
  is workflow work. Refuse to run it as a one-off task and route to the
  workflow builder.
- The user's explicit choice wins in both directions. If they ask for a
  workflow, build one; if they ask to "just do it once", use a one-off task.
- If the request is ambiguous ("sync my contacts"), ask whether this should
  happen once or continuously before choosing.
- If `intent-recognition` is loaded this turn: its workflow/agent anchors
  classify *automation* requests. A run-once artifact request is not an
  automation request — it needs no anchor; execute it as a one-off task.

## Writing the task contract

The `task` string is the sub-agent's entire specification. It must contain:

1. **The goal** — what must exist or be true afterwards, with exact names,
   columns, formats, and targets.
2. **Constraints** — what must not be touched, rate/scope limits, which
   account or folder to operate in.
3. **Verification criteria** — what the sub-agent must read back to prove the
   goal is met (e.g. "read the spreadsheet and confirm it has exactly the
   4 columns, in order"). A successful API response is not verification.
4. **Expected artifacts** — which links the report should contain.

## Credentials

- Identify which existing credentials fit the task (use `credentials` with
  action "list" to check). Confirm with the user which credentials the task
  may use before passing their IDs to `run-one-off-task`.
- If a needed credential does not exist, set it up first with
  `credentials(action="setup")`, then pass the new credential's ID.
- The sub-agent receives credential *names* and env var names only; values are
  injected into its sandbox environment by the host and never appear in the
  conversation.

## Destructive work

For tasks that modify or delete existing data in bulk (cleanup, dedupe,
renames), state the exact scope in the contract and get the user's explicit
confirmation of that scope before dispatching.

## Handling the result

- The task runs in the background. `run-one-off-task` returns only a task ID —
  it contains no results. After dispatching, tell the user the task is running
  and end your turn. **Never report completion, artifacts, URLs, or numbers
  before the `background-task-completed` follow-up delivers the structured
  report** — anything you state earlier is invented.
- From the report, relay the summary and artifact links to the user. Do not
  embellish the verification evidence.
- If the report status is "partial" or "failed", tell the user exactly what
  was and was not done — half-created resources must be mentioned.
- If the task ended without a structured report, say the external state is
  unknown and offer to check or retry.
- For a follow-up request ("actually, make it 5 columns"), dispatch a new
  one-off task and include the previous report in `conversationContext`.
