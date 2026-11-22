# Custom Nodes and Actions, Plan 4: Usage and Rollout

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** An administrator sees which workflows use each version of a custom action, cannot delete an action or node that workflows use, and the n8n team gets telemetry, a module README, an end-to-end test, and a preview branch that colleagues can check out and run with no setup.

**Architecture:** The workflow dependency index records one new dependency type, `customAction`, for each node that stores a `customActionId`. The custom-nodes service reads those rows (scoped to the workflows the user can read), turns the stored `operation` into a version with `readPin`, and serves a usage view and a delete guard. The preview branch is a separate local branch with one extra commit that turns the module on by default and seeds demo definitions.

**Tech Stack:** TypeScript, TypeORM through `@n8n/db`, Vue 3 module, Vitest, Playwright (`packages/quality/testing/playwright`).

**Spec:** `.agents/specs/2026-11-22-custom-nodes-and-actions-design.md` (sections 9, 12, 19, 20).

**Test cases:** Jason's approval of this plan confirms the test cases listed here (`AGENTS.md`).

**Execution mode:** as in Plan 3: a real instance check after Tasks 2 and 3, a task review for Task 1 (shared index code), one whole-plan review at the end.

## Global Constraints

- All constraints of Plans 1 to 3 stay valid (`AGENTS.md`; no `any`; no `as` outside tests; TypeORM only in persistence files; module off by default and inert; no attribution lines; no pushes without Jason's word).
- `version-pin.ts` stays the only code that parses the `operation` value. The index stores the raw `operation` string; it never parses it.
- The usage view and the delete guard show only workflows the user can read. For other workflows they show a count, never a name.
- The index change bumps `WORKFLOW_DEPENDENCY_INDEX_VERSION` from 2 to 3. Every workflow is reindexed once on the next start.
- The preview commit never merges to `master`. Pull requests are cut without it.
- Telemetry follows the `n8n:telemetry` skill. No definition content (URLs, headers, names of inputs) in telemetry.

## Decisions in this plan

1. **What the index records.** For a node whose `parameters.customActionId` is a non-empty string, one row: `dependencyType: 'customAction'`, `dependencyKey: <customActionId>`, `dependencyInfo: { nodeId, nodeType, operation }`. A node that stores only `operation` (written before Plan 3) is not indexed. Draft and published rows follow the existing `publishedVersionId` rule.
2. **Delete guard scope.** Deleting an action, or a custom node with actions, is refused while any workflow (draft or published, not archived) uses it. The error names the readable workflows and counts the others. There is no force option in this plan.
3. **Usage counts on the list.** `GET /custom-nodes/actions` and `GET /custom-nodes` add `usage: { total: number; onOlderVersion: number }` per action, counted over readable workflows.
4. **Execution telemetry.** Execution counts per parent node type are sent only if an existing per-node execution event can carry a flag without a change in `packages/core`. Else this is recorded as a follow-up.

## Review Focus

1. A member asks for usage of an action used in a workflow they cannot read. Expected: a count, no workflow name or id. Test in Task 2.
2. A workflow is archived. Expected: it no longer blocks a delete and no longer shows in usage. Test in Task 2.
3. A workflow is published on version 1 and its draft moved to version 2. Expected: both versions list it, with draft or published marked. Test in Task 2.
4. With the module off, the indexer still records `customAction` rows, and nothing reads them. Expected: no error and no route. Test in Task 1.
5. The reindex after the version bump on a large instance. Expected: it runs in the existing background staleness scan, not in the request path. Check in Task 1 review.

---

### Task 0: Prepare (controller)
Build, record the baseline of the module tests, the workflow-index tests, and the dependency repository tests.

### Task 1: Index `customAction` dependencies (shared index code)

**Files:** `packages/@n8n/db/src/entities/workflow-dependency-entity.ts` (type, version 3 and its comment), `packages/@n8n/db/src/repositories/workflow-dependency.repository.ts` (one use-case method), `packages/cli/src/modules/workflow-index/workflow-index.service.ts` (`addCustomActionDependencies`), their tests.

**Produces:**
```ts
// workflow-dependency.repository.ts
/** Rows of `customAction` dependencies for the given action ids, joined to readable, not archived workflows. */
findCustomActionUsage(
	user: User,
	actionIds: string[],
): Promise<Array<{ actionId: string; operation: string; workflowId: string; workflowName: string; projectId: string | null; projectName: string | null; published: boolean }>>;
/** Count of not archived workflows (all, not only readable) that use each action id. */
countCustomActionUsage(actionIds: string[]): Promise<Map<string, number>>;
```
Tests: the indexer adds one row per node with `customActionId` and none without; draft and published rows; a bump to version 3 marks rows of version 2 stale (existing staleness test pattern); `findCustomActionUsage` returns only readable workflows and skips archived ones; `countCustomActionUsage` counts all not archived workflows.
Commit: `feat(core): Index custom action dependencies of workflows (no-changelog)`.
Review: a task review runs after this task.

### Task 2: Usage API and delete guard

**Files:** `@n8n/api-types` custom-nodes schema (usage types), `packages/cli/src/modules/custom-nodes/` service and controller, tests.

**Produces:**
- `GET /custom-nodes/actions/:id/usage` (scope `customNode:list`) → `{ versions: Array<{ version: number; workflows: Array<{ id: string; name: string; projectName: string | null; draft: boolean; published: boolean }>; hiddenCount: number }> }`. The version comes from `readPin(operation)`; a row whose pin does not parse is counted under no version and ignored.
- `usage: { total, onOlderVersion }` on each action in `GET /custom-nodes` and `GET /custom-nodes/actions` (decision 3).
- `deleteAction` and `deleteNode` throw a `UserError` (HTTP 400 through the existing mapping, or 409 if a conflict mapping fits better; pick one and test it) when usage exists: "This action is used in N workflows: <names>. Remove it from these workflows first." with readable names and a count for the rest.
Tests: Review Focus 1 to 3; delete refused with names and hidden count; delete allowed when unused or only archived; the list counts; 403 without scope; 404 with the module off.
Commit: `feat(core): Add usage view and delete guard for custom actions (no-changelog)`.
Controller after this task: instance check through the API.

### Task 3: Usage in the editor

**Files:** the module's history dialog, settings view, store, api client, `en.json`.

**Produces:** the history dialog lists, for each version, the workflows that use it (name, project, draft or published, a link that opens the workflow in a new tab) and "N more workflows you cannot see". The settings list shows "N workflows on older versions" when `onOlderVersion > 0`. A refused delete shows the server message in the confirm dialog.
Tests: usage rendering, hidden count, link target, older-version badge, refused delete message.
Commit: `feat(editor): Show where custom actions are used (no-changelog)`.
Controller after this task: browser check.

### Task 4: Telemetry

**Files:** module service (or the module's event relay), the telemetry catalog if the skill requires a registration, tests. Use the `n8n:telemetry` skill.

**Produces:** events for custom node created, custom action created (with `parent_node_type` or `custom_node`), custom action saved (with `edit_kind`), custom action deleted, rollback. Decision 4 for execution counts.
Tests: each event fires once with the documented properties and without definition content.
Commit: `feat(core): Add telemetry for custom nodes and actions (no-changelog)`.

### Task 5: Module README

**Files:** `packages/cli/src/modules/custom-nodes/README.md`.

**Produces:** a short operator and developer README: how to turn the module on (all instance types), what an administrator can do, the security model (who can create, credential domain rules, secrets), versions and the upgrade notice, known limits, and switching off (workflows that use custom actions fail). Simplified Technical English. No customer names.
Commit: `docs: Add a README for the custom nodes module (no-changelog)`.

### Task 6: End-to-end test

**Files:** a Playwright spec under `packages/quality/testing/playwright/tests/e2e/` (folder name of the implementer's choice, following the folder conventions), page-object additions, fixtures. Read `packages/quality/testing/playwright/AGENTS.md` first.

**Produces:** one test for the main flow with the module on: create a workflow with a Webhook trigger in the same instance as the mock target; add an HTTP Request node pointing to that webhook URL; save it as a custom action on a custom node through the wizard; add the custom action from the nodes panel in a new workflow; execute; check the output. If the test container setup cannot turn on a module, report it and ask before changing shared fixtures.
Commit: `test: Add an end-to-end test for custom actions (no-changelog)`.

### Task 7: Preview branch (controller)

1. Create the local branch `custom-nodes-preview` from the head of `custom-nodes-and-actions`.
2. One commit `chore: Turn on custom nodes and seed demo definitions for the preview (no-changelog)`: add `custom-nodes` to `defaultModules` in `packages/@n8n/backend-common/src/modules/module-registry.ts`, and a seed that runs once on start when no definitions exist: one custom node for a public API without authentication, and one custom action each on two eligible parent nodes. The seed code lives only in this commit.
3. Build, start a fresh instance with no environment variables, and check that the feature shows and the seed works.
4. Push only after Jason says so.

### Task 8: Close-out (controller)
Whole-plan review, one fix wave, spec update (section 21), final report.

## Known limits that this plan accepts

- Nodes that store only `operation` (written before Plan 3) do not appear in usage and do not block a delete.
- The reindex after the version bump runs once per instance and touches every workflow.
- There is no bulk upgrade (spec section 6).
