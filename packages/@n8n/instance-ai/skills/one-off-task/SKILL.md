---
name: one-off-task
description: >-
  Load before calling run-one-off-task. Use for tasks that run once and need
  no trigger, canvas, or persistence: "create a Google Sheet with these
  columns", one-time data transfers, backfills, bulk cleanups, reports over
  external data, audits. Teaches how to write the task contract (goal,
  constraints, verification), the credential approval loop, and the
  destructive-write gate. Recurring or trigger-driven work belongs in a
  workflow via workflow-builder instead.
recommended_tools:
  - run-one-off-task
  - credentials
  - ask-user
---

# One-Off Task

You delegate run-once work to an ephemeral sandbox. A coding harness inside
the sandbox writes and executes SDK code against the provider's API, verifies
the result by reading it back, and returns a structured report. The sandbox is
destroyed when the task ends. You are the planner: you write the task
contract. You never write the code yourself.

## Routing

- **Run-once work → this tool.** Creating a resource, a one-time transfer,
  a backfill, a bulk edit, a report, an audit. If the user would delete the
  workflow right after it ran once, it is a one-off task.
- **Recurring or trigger-driven work → workflow.** "Every Monday…", "when a
  form is submitted…", anything that must keep running. Route to
  `workflow-builder`. Do not sandbox it.
- **User override wins.** If the user explicitly asks for a workflow for
  run-once work (or vice versa), follow the user.
- **Ambiguous task → ask first.** If the goal, the target resource, or the
  scope of a bulk change is unclear, ask a clarifying question before
  launching. A sandbox run costs real time and tokens.

## Writing the task contract

The contract is everything the harness knows about the task. Write it like a
briefing for a competent engineer with no other context:

- **goal** — one task, concretely stated in user terms. Include identifiers
  the harness needs (spreadsheet name, channel, date ranges). Do not include
  credential values or IDs.
- **constraints** — hard limits beyond the goal. **Default to read-only
  whenever the task allows it**: for reports, audits, and lookups always pass
  a constraint like "read-only: do not create, modify, or delete anything".
  For writes, scope them ("only create, never overwrite existing files").
- **verification** — what read-back must show for the task to count as done.
  Be concrete: "the sheet exists and contains the 4 requested columns", not
  "the operation succeeded". The harness is required to verify by reading the
  resource back, and its report carries the evidence.
- **credentials** — only credentials the user explicitly approved for this
  task, with their id, name, and type from the `credentials` tool. Approval
  is per credential, per task — never inject something because it might be
  useful.
- **credentialCatalog** — names and types (never IDs or values) of other
  credentials the user could approve, so a mid-task request names a real
  credential instead of guessing.
- **priorReport** — for follow-ups ("do that again, but…"), pass the previous
  task's report so the harness reuses what was already verified.

## The credential loop

When the tool returns `outcome: "needs_credential"`, the task is paused and
its sandbox stays alive for a bounded wait (the outcome's guidance states the
timeout). Act immediately:

1. For `request.kind: "existing"` — ask the user to approve injecting that
   credential (it is named from the catalog you passed).
2. For `request.kind: "new"` — run the existing credential setup flow
   (`credentials` tool, action `"setup"`) using the recipe fields from the
   request; the user pastes secrets into the masked card, never into chat.
3. Call `run-one-off-task` again with:
   - `resume: { sandboxRef, sessionId }` exactly as returned,
   - the **full** `credentials` list including the newly approved credential,
   - the returned `progressSummary` as `priorReport`.

The relaunch resumes the harness session with its full prior context; only
the new environment variable changed. If the user declines or stalls past the
wait timeout, the sandbox is destroyed and the task reports incomplete — tell
the user they can restart it later.

## Destructive writes need a shown plan

Before launching a task that deletes, overwrites, or bulk-edits existing data
(dedupe, archive, rename, cleanup), show the user the plan through the
existing confirmation mechanism and get approval first — state what will be
changed, roughly how many items, and what cannot be undone. Creation of new
resources does not need this gate; destruction and modification of existing
data always does.

## Reading the outcome

- `completed` — present the report as the result: what was done, the
  verification evidence, and the artifact links. Lead with the links.
- `failed` — the report says why and lists what already ran. Tell the user
  what exists now, then propose a fix or a retry.
- `interrupted` — the harness stopped without a valid report: external state
  is unknown. Say so honestly, point at the streamed activity for what ran,
  and tell the user which resources to check. Never claim success.

Keep the final report in the conversation: a follow-up ("do that again next
month") starts a fresh task with the old report as `priorReport` — there is
no idle sandbox to come back to.
