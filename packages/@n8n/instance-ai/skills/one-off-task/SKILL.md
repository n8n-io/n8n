---
name: one-off-task
description: >-
  Delegates run-once work to a sandboxed coding sub-agent with the
  run-one-off-task tool: creating an external resource (a sheet, a channel, a
  repo), a one-time data transfer or backfill, a report or analysis over
  external data, or an audit/lookup. Use when the user asks for something to
  happen once, now — not on a schedule, not on a trigger. Never use it for
  recurring or event-driven work.
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

- **Recurring, scheduled, or triggered work → build a workflow.** Anything with
  "every", "whenever", "each time", a webhook, or a trigger is workflow work.
  Refuse to run it as a one-off task and route to the workflow builder.
- **Run-once work → one-off task.** Create a resource, transfer data once,
  backfill history, produce a report, audit existing data.
- The user's explicit choice wins. If they ask for a workflow, build one; if
  they ask to "just do it once", use a one-off task.
- If the request is ambiguous ("sync my contacts"), ask whether this should
  happen once or continuously before choosing.

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

- The task runs in the background; you get a follow-up with the structured
  report (status, actions, verification evidence, artifact links).
- Relay the summary and artifact links to the user. Do not embellish the
  verification evidence.
- If the report status is "partial" or "failed", tell the user exactly what
  was and was not done — half-created resources must be mentioned.
- If the task ended without a structured report, say the external state is
  unknown and offer to check or retry.
- For a follow-up request ("actually, make it 5 columns"), dispatch a new
  one-off task and include the previous report in `conversationContext`.
