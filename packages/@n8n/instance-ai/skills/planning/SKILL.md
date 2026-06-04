---
name: planning
description: >-
  Designs dependency-aware execution plans for multi-workflow, multi-artifact,
  shared data-table, broad research, or ambiguous architecture requests. Use
  before create-tasks for initial plan-worthy work.
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
submit it with `create-tasks`. Do not spawn another agent, do not delegate the
planning step, and do not use incremental plan item tools.

Planning is for work that needs coordination: multiple workflows, dependencies
between workflows, shared data-table schema or migration work, multiple durable
artifacts, broad best-practice research, ambiguous business-process
architecture, or an explicit user request to review a plan first.

Clear single-workflow builds and existing-workflow edits use the
`workflow-builder` skill with `build-workflow` directly. Standalone data-table
work uses the `data-table-manager` skill with direct `data-tables` and
`parse-file` calls.

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

- Use task kinds exactly as supported: `build-workflow`, `delegate`, and
  `checkpoint`.
- Each task `id` must be stable and referenced by dependency edges.
- Each `title` should be short and user-facing.
- Each `spec` must be the complete executor briefing for that task. The task
  executor may not see your broader planning notes.
- For `build-workflow` tasks, describe outcomes, key behaviours, integrations,
  data-table requirements, schedules in the user's timezone, setup expectations,
  credential assumptions, and verification-relevant trigger/input details. Do
  not write node-by-node wiring or fake user data.
- If a `build-workflow` task's final deliverable is a supporting sub-workflow,
  set `isSupportingWorkflow: true` on that task. Do not set it for helper
  sub-workflows that are only intermediate artifacts inside a larger main
  workflow task.
- For `delegate` tasks, include all context the background task needs and list
  only the tools it should use.
- For `checkpoint` tasks, write the semantic validation goal, the exact
  evidence to inspect, and a plain pass/fail condition.

## Assumptions And Questions

- Never ask about things tools can discover, such as available credentials,
  existing data tables, workflow names, node availability, or attached-file
  structure.
- Never ask for implementation details such as node choices, column names, or
  trigger mechanics when a sensible default exists.
- Never default resource identifiers the user did not mention, such as Slack
  channels, calendars, spreadsheets, folders, databases, or recipient lists.
  Leave them for the builder to resolve or collect through setup.
- If exactly one matching credential exists, assume it and mention the
  credential name in `planningContext.assumptions`.
- If no matching credential exists, plan normally. The builder will mock or
  leave it unresolved and route setup after verification.
- If multiple matching credentials exist and the user did not name one, ask once
  with `ask-user` because the choice cannot be discovered.

## Checkpoints

Workflow verification is automatic from structured build outcomes. Do not add
routine "verify this workflow" checkpoint tasks for every workflow.

Checkpoint tasks are exceptional semantic checks. Use them for cross-workflow
contracts, confirming a report combines upstream data correctly, validating a
business invariant across deliverables, or checking a condition that cannot be
covered by normal runtime verification.

Do not add checkpoints for delegate tasks, and do not list `tools` on checkpoint
tasks.

## Revisions

If the user rejects the plan with requested changes, revise surgically and call
`create-tasks` again in the same orchestrator run with
`planningContext.source: "planning-skill"`.

If the user denies the plan outright, stop. Do not call `create-tasks` again in
the same message group.
