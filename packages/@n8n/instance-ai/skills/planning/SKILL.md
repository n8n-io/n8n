---
name: planning
dependencies:
  tools:
    - workflow_builder_create_tasks
description: >-
  ONLY for coordinated multi-artifact work: multiple workflows with
  dependencies, shared data-table schema/migration across tasks, or user
  explicitly asked to review plan first. If workflow_builder_create_tasks not
  visible, load via load_tool (search "create tasks"). NOT for new one-off
  workflows, single-workflow edits, verification-only requests, standalone
  data-table ops — use workflow-builder or data-table-manager.
recommended_tools:
  - workflow_builder_create_tasks
  - workflow_builder_workflows
  - workflow_builder_nodes
  - workflow_builder_credentials
  - data_tables
  - parse-file
  - research
  - workflow_builder_ask_user
---
# Planning

Skill for designing dependency-aware task graph in orchestrator, submit via `workflow_builder_create_tasks`. No spawning other agent, no incremental plan item tools.

If `workflow_builder_create_tasks` not visible, load via `load_tool` (search "create tasks") before call.

## When NOT to use this skill

Stop, use `workflow-builder` + `workflow_builder_build_workflow` instead when request is:

- New or one-off single workflow, even if sounds large or unfamiliar
- Edit to one existing workflow (nodes, expressions, credentials, schedule, Code)
- Verification, setup, or credential collection for workflow just built
- Workflow-local data table whose schema ships with same workflow
- Standalone data-table list/schema/query/create/mutation work

No calling `workflow_builder_create_tasks` just for approval, verification, or checklist for single workflow. Workflow verification automatic from structured build outcomes after `workflow_builder_build_workflow`.

## When to use this skill

Planning only for work needing coordination: multiple workflows, dependencies between workflows, shared data-table schema or migration work across tasks, multiple durable artifacts, broad best-practice research across many sources, genuinely ambiguous business-process architecture not resolvable with one `workflow_builder_build_workflow` call, or explicit user request to review plan first.

If shared data tables involved, load `data-table-manager` before this skill, carry relevant table guidance into workflow task specs. Clear single-workflow builds and existing-workflow edits use `workflow-builder` with `workflow_builder_build_workflow` directly. Standalone data-table work uses `data-table-manager` with direct `data_tables` and `parse-file` calls.

## Knowledge Base

**Consult knowledge base before planning.** Lives in sandbox workspace. Read with workspace tools, not `load_skill`. Paths in `knowledge-base/` relative to workspace root. Read relevant `.md` guides and templates for each technique request involves (`knowledge-base/index.json`, `knowledge-base/best-practices/index.json`, linked files). Use `workspace_execute_command` with `rg` or `find` under `knowledge-base/templates/` to locate matching SDK examples — never load `templates/index.json` wholesale. Skip only for trivial mechanical edits already reviewed in this thread.

## Method

1. Decide plan-worthiness by coordination need, not by whether workflow new.
2. Discover what materially affects plan with normal tools: `workflow_builder_nodes(action="suggested")`, `workflow_builder_credentials(action="list")`, `data_tables(action="list")`, `parse-file`, `workflow_builder_workflows`, and `research` when relevant.

3. Prefer reasonable assumptions over questions. Ask user only when answer would materially change plan and not discoverable.
4. Build dependency-aware graph. Producers before consumers. Independent tasks no depend on each other.
5. Put single workflow-local table requirements inside that workflow task spec. No separate data-table tasks unless table work is durable artifact shared across tasks.
6. Add checkpoint tasks only for exceptional semantic checks normal workflow verification can't cover.
7. Load `workflow_builder_create_tasks` via `load_tool` if needed, then call `workflow_builder_create_tasks` with `planningContext.source: "planning-skill"`, concise `summary`, optional `assumptions`, `postBuildRunRequested: true` only when user explicitly asked to run, execute, or test workflow after building, and final task graph.
8. After calling `workflow_builder_create_tasks`, no visible text. Approval card is user-visible surface.

## Task Graph Rules

- Use task kinds exactly as supported: `build-workflow` and `checkpoint`.
- Each task `id` stable, referenced by dependency edges.
- Each `title` short, user-facing.
- Each `spec` = complete executor briefing for that task. Executor may not see broader planning notes.
- For `build-workflow` tasks, `spec` = structured executor briefing, not freeform prose. Include these labels in order: `Outcome`, `Trigger mode`, `External systems`, `Required effects`, `Required branches`, `Required data`, `Explicit constraints`, `Empty/invalid behavior`, `Done when`.
- In `Required effects`, list every observable action user asked for, e.g. send email, send Telegram, write Google Sheets, create Notion pages, upsert Data Table rows, post one Slack summary.
- In `Required branches`, state partial-failure behavior when multiple effects start from same trigger, and whether no-results or invalid-input paths need explicit notification, fallback, log, or no-op.
- In `Required data`, name fields needed by later conditions, filters, ranking, response messages, or downstream effects; note when fields must stay available after side-effect nodes that replace item JSON.
- In `Explicit constraints`, preserve concrete user-provided resource names, channels, tables, labels, URLs, required node families or mechanisms. If user explicitly says use node family or mechanism like HTTP Request, webhook, form, MCP, or service-native node, treat as hard requirement unless impossible or contradicts other stated requirement. No moving those values to assumptions, replacing with placeholders, or silently swapping for more convenient alternative.
- In `Empty/invalid behavior`, distinguish data invalidating whole item from data affecting only one requested effect. For multi-effect intake workflows, no turning field into workflow-wide rejection requirement merely because one message or side effect uses it.
- In `Done when`, write observable acceptance checks, incl. final actions and branch behavior. No node-by-node wiring or fake user data.
- If `build-workflow` task's final deliverable is supporting sub-workflow, set `isSupportingWorkflow: true` on that task. Not for helper sub-workflows that are only intermediate artifacts inside larger main workflow task.
- For `checkpoint` tasks, write structured semantic verification instructions: `Verify trigger mode`, `Verify external systems`, `Verify required effects`, `Verify required branches`, `Verify required data`, `Verify explicit constraints`, `Verify empty/invalid behavior`, `Pass condition`. Checkpoints exceptional; use structure only when checkpoint actually warranted.

## Assumptions And Questions

- Never ask about tool-discoverable things: available credentials, existing data tables, workflow names, node availability, attached-file structure.
- Never ask implementation details (node choices, column names, trigger mechanics) when sensible default exists.
- Never ask user timezone when current date/time section includes it. Use that timezone for schedule times, cron assumptions, digest windows.
- Never default resource identifiers user didn't mention: Slack channels, calendars, spreadsheets, folders, databases, recipient lists. Leave for builder to resolve or collect via setup.
- Trust already-collected briefing context. If conversation or task briefing has already-collected answers or already-discovered resources, treat as authoritative; no re-asking purpose, trigger, integrations, schedule, model, resource, or credential choices listed there.
- Question asked at most once. Once user answered, deferred ("later"), or skipped, never re-present. On skip or deferral, record sensible assumption in `planningContext.assumptions` where default exists (e.g. default morning time for digest), else leave detail for builder or setup — no blocking, no re-asking.
- If exactly one matching credential exists, assume it, mention credential name in `planningContext.assumptions`.
- If no matching credential, plan normally. Builder will mock or leave unresolved, route setup after verification.
- If multiple matching credentials and user named none, ask once with `workflow_builder_ask_user` since choice not discoverable.
- Use credential-backed resource investigation only when it changes plan, e.g. validating named Slack channel affecting architecture. No turning resource lookup into credential-choice question unless multiple-credentials rule applies.

## Checkpoints

Workflow verification automatic from structured build outcomes. No routine "verify this workflow" checkpoint tasks per workflow.

Checkpoint tasks = exceptional semantic checks. Use for cross-workflow contracts, confirming report combines upstream data correctly, validating business invariant across deliverables, or checking condition normal runtime verification can't cover.

No checkpoints for routine verification-only work.

## Revisions

If user rejects plan with requested changes, revise surgically, load `workflow_builder_create_tasks` via `load_tool` if needed, call `workflow_builder_create_tasks` again in same orchestrator run with `planningContext.source: "planning-skill"`.

If user denies plan outright, stop. No calling `workflow_builder_create_tasks` again in same message group.