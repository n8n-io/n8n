---
name: planning
description: >-
  ONLY for coordinated multi-artifact work: multiple workflows with dependencies,
  shared data-table schema/migration across tasks, or the user explicitly asked
  to review a plan first. Do NOT use for new one-off workflows, single-workflow
  edits, verification-only requests, or standalone data-table ops — use
  workflow-builder or data-table-manager instead.
recommended_tools:
  - create-tasks
  - workflows
  - nodes
  - credentials
  - data-tables
  - parse-file
  - research
  - ask-user
---

# Planning

Use this skill to design a dependency-aware task graph in the orchestrator and
submit it with `create-tasks`. Do not spawn another agent and do not use
incremental plan item tools.

## When NOT to use this skill

Stop and use `workflow-builder` + `build-workflow` instead when the request is:

- A new or one-off single workflow, even if it sounds large or unfamiliar
- An edit to one existing workflow (nodes, expressions, credentials, schedule, Code)
- Verification, setup, or credential collection for a workflow you just built
- A workflow-local data table whose schema ships with that same workflow
- Standalone data-table list/schema/query/create/mutation work

Do not call `create-tasks` just to get approval, verification, or a checklist for
a single workflow. Workflow verification is automatic from structured build
outcomes after `build-workflow`.

## When to use this skill

Planning is only for work that needs coordination: multiple workflows,
dependencies between workflows, shared data-table schema or migration work across
tasks, multiple durable artifacts, broad best-practice research across many
sources, genuinely ambiguous business-process architecture that cannot be
resolved with one `build-workflow` call, or an explicit user request to review a
plan first.

If shared data tables are involved, load `data-table-manager` before this skill
and carry the relevant table guidance into workflow task specs. Clear
single-workflow builds and existing-workflow edits use `workflow-builder` with
`build-workflow` directly. Standalone data-table work uses `data-table-manager`
with direct `data-tables` and `parse-file` calls.

## Method

1. Decide whether the request is plan-worthy by coordination need, not by
   whether a workflow is new.
2. Discover what materially affects the plan with normal tools:
   `nodes(action="suggested")`, `credentials(action="list")`,
   `data-tables(action="list")`, `parse-file`, `workflows`, and `research`
   when relevant.
3. Prefer reasonable assumptions over questions. Ask the user only when the
   answer would materially change the plan and cannot be discovered.
4. Build a dependency-aware graph. Producers must come before consumers.
   Independent tasks should not depend on each other.
5. Put single workflow-local table requirements inside that workflow task spec.
   Do not create separate data-table tasks unless the table work is a durable
   artifact shared across tasks.
6. Add checkpoint tasks only for exceptional semantic checks that normal
   workflow verification cannot cover.
7. Call `create-tasks` with `planningContext.source: "planning-skill"`,
   a concise `summary`, optional `assumptions`, `postBuildRunRequested: true`
   only when the user explicitly asked to run, execute, or test a workflow
   after building it, and the final task graph.
8. After calling `create-tasks`, do not write visible text. The approval card is
   the user-visible surface.

## Task Graph Rules

- Use task kinds exactly as supported: `build-workflow` and `checkpoint`.
- Each task `id` must be stable and referenced by dependency edges.
- Each `title` should be short and user-facing.
- Each `spec` must be the complete executor briefing for that task. The task
  executor may not see your broader planning notes.
- For `build-workflow` tasks, make `spec` a structured executor briefing, not
  freeform prose. Include these labels in this order: `Outcome`,
  `Trigger mode`, `External systems`, `Required effects`, `Required branches`,
  `Required data`, `Explicit constraints`, `Empty/invalid behavior`, and
  `Done when`.
- In `Required effects`, list every observable action the user asked for, such
  as send email, send Telegram, write Google Sheets, create Notion pages, upsert
  Data Table rows, or post one Slack summary.
- In `Required branches`, state partial-failure behavior when multiple effects
  start from the same trigger, and state whether no-results or invalid-input
  paths need an explicit notification, fallback, log, or no-op.
- In `Required data`, name fields needed by later conditions, filters, ranking,
  response messages, or downstream effects, and note when those fields must
  remain available after side-effect nodes that replace item JSON.
- In `Explicit constraints`, preserve concrete user-provided resource names,
  channels, tables, labels, URLs, and required node families or mechanisms. If
  the user explicitly says to use a node family or mechanism such as HTTP
  Request, webhook, form, MCP, or a service-native node, treat that as a hard
  requirement unless it is impossible or contradicts another stated requirement.
  Do not move those values to assumptions, replace them with placeholders, or
  silently swap them for a more convenient alternative.
- In `Empty/invalid behavior`, distinguish data that invalidates the whole item
  from data that only affects one requested effect. For multi-effect intake
  workflows, do not turn a field into a workflow-wide rejection requirement
  merely because one message or side effect uses it.
- In `Done when`, write observable acceptance checks, including final actions
  and branch behavior. Do not write node-by-node wiring or fake user data.
- If a `build-workflow` task's final deliverable is a supporting sub-workflow,
  set `isSupportingWorkflow: true` on that task. Do not set it for helper
  sub-workflows that are only intermediate artifacts inside a larger main
  workflow task.
- For `checkpoint` tasks, write structured semantic verification instructions:
  `Verify trigger mode`, `Verify external systems`, `Verify required effects`,
  `Verify required branches`, `Verify required data`,
  `Verify explicit constraints`, `Verify empty/invalid behavior`, and
  `Pass condition`. Checkpoints are exceptional; use this structure only when a
  checkpoint is actually warranted.

## Assumptions And Questions

- Never ask about things tools can discover, such as available credentials,
  existing data tables, workflow names, node availability, or attached-file
  structure.
- Never ask for implementation details such as node choices, column names, or
  trigger mechanics when a sensible default exists.
- Never ask for the user's timezone when the current date/time section includes
  it. Use that timezone for schedule times, cron assumptions, and digest windows.
- Never default resource identifiers the user did not mention, such as Slack
  channels, calendars, spreadsheets, folders, databases, or recipient lists.
  Leave them for the builder to resolve or collect through setup.
- Trust already-collected briefing context. If the conversation or task briefing
  includes already-collected answers or already-discovered resources, treat them
  as authoritative and do not ask again for purpose, trigger, integrations,
  schedule, model, resource, or credential choices already listed there.
- A question is asked at most once. Once the user has answered, deferred
  ("later"), or skipped it, never re-present it. On a skip or deferral, record a
  sensible assumption in `planningContext.assumptions` where a default exists
  (for example a default morning time for a digest), otherwise leave the detail
  for the builder or setup — do not block on it and do not ask again.
- If exactly one matching credential exists, assume it and mention the
  credential name in `planningContext.assumptions`.
- If no matching credential exists, plan normally. The builder will mock or
  leave it unresolved and route setup after verification.
- If multiple matching credentials exist and the user did not name one, ask once
  with `ask-user` because the choice cannot be discovered.
- Use credential-backed resource investigation only when it changes the plan,
  for example validating a named Slack channel that affects the architecture. Do
  not turn resource lookup into a credential-choice question unless the
  multiple-credentials rule applies.

## Checkpoints

Workflow verification is automatic from structured build outcomes. Do not add
routine "verify this workflow" checkpoint tasks for every workflow.

Checkpoint tasks are exceptional semantic checks. Use them for cross-workflow
contracts, confirming a report combines upstream data correctly, validating a
business invariant across deliverables, or checking a condition that cannot be
covered by normal runtime verification.

Do not add checkpoints for routine verification-only work.

## Revisions

If the user rejects the plan with requested changes, revise surgically and call
`create-tasks` again in the same orchestrator run with
`planningContext.source: "planning-skill"`.

If the user denies the plan outright, stop. Do not call `create-tasks` again in
the same message group.
