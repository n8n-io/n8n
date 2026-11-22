# Custom Nodes and Actions, Plan 3: Frontend

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** An administrator can create and manage custom nodes and custom actions in the editor, and every user can add them from the nodes panel and use them like built-in actions. The UI shows only when the backend module `custom-nodes` is active.

**Architecture:** A frontend module package `packages/modules/custom-nodes/frontend` (`@n8n/frontend-module-custom-nodes`) holds the API client, store, settings page, wizard, and small entry-point components. The editor has no extension point for the nodes panel or the node settings, so a few small edits in `editor-ui` import components and one composable from the module's `index.ts`. This follows the precedent of `@n8n/frontend-module-type-availability-policies`. The module never imports `editor-ui`.

**Tech Stack:** Vue 3, Pinia, `@n8n/design-system`, `@n8n/i18n`, `@n8n/rest-api-client`, Vitest, Testing Library.

**Spec:** `.agents/specs/2026-11-22-custom-nodes-and-actions-design.md` (sections 6, 8, 11, 18, 19).

**Reference:** the mockup branch `feat/custom-nodes-mockup` has a working UI in `packages/frontend/editor-ui/src/features/customNodes/` (about 2,500 lines). Port what fits; do not copy the 966-line wizard as one file.

**Test cases:** Jason's approval of this plan confirms the test cases listed here (`AGENTS.md`).

**Execution mode (decided with Jason after Plan 2):** a real instance runs as soon as Task 2 is done, and the controller checks each later task in the browser pane. Per-task review only for Task 5 (it changes shared editor code). One whole-plan review at the end.

## Global Constraints

- Read `packages/frontend/AGENTS.md`, `packages/@n8n/module-cli/frontend-module-guide.md`, and the `AGENTS.md` of each folder you change. Root `AGENTS.md` rules apply.
- Scaffold with `pnpm n8n-module-sdk create custom-nodes --stack=frontend`. Module id: `custom-nodes` (it must equal the backend module name).
- The module imports only L0 to L2 packages, with subpaths (for example `@n8n/stores/settings.store`). Never `@/…`, never another `@n8n/frontend-module-*`.
- All UI text through `i18n.baseText()`, keys under `customNodes.` in `packages/frontend/@n8n/i18n/src/locales/en.json`. User-facing text says "action", never "operation". Use the `n8n:content-design` skill for copy and `n8n:ui-design` for components.
- CSS variables only, no pixel spacing. One `data-test-id` value per element. Icons from `updatedIconSet`.
- The editor never builds or parses the `operation` pin value. It writes `pinValues` from the API as they are, and it compares a node's `operation` with `pinValues.operation` strings.
- Every editor edit is inert when `settingsStore.isModuleActive('custom-nodes')` is false.
- Entry points that create or edit definitions show only with the scope `customNode:create` (create) or `customNode:update` (edit). Using a custom action needs no extra scope.
- A stored SVG is shown only through an image element (`<img>` or `N8nNodeIcon` with a URL), never inserted into the page.
- No new dependencies. No demo data in merged code.
- Commits: conventional title with `(no-changelog)`, no attribution lines, author is the local git user. No pushes.
- Checks on changed files, from the package folder: `.ts` → `pnpm exec biome check --write` and `pnpm exec oxlint --quiet`; `.vue` → `pnpm exec prettier --write`, `pnpm exec oxlint --quiet`, `pnpm exec vize lint -c vize-lint.config.mjs`. Tests: `pnpm test <file>`. No full frontend typecheck locally; CI runs it.

## Decisions in this plan

1. **One shared constant.** `CUSTOM_ACTION_RESOURCE_VALUE = '__CUSTOM_ACTION__'` moves to `@n8n/api-types`, and the backend generator imports it. The editor uses it only to recognize a custom selection (subtitle, notice), never to build a pin.
2. **Pin values on selection through one composable.** The module exports `useCustomActionSelection()`. Its `pinValuesFor(nodeTypeName, parameters)` returns the `pinValues` of the action version whose `pinValues.operation` equals `parameters.operation`, or `undefined`. The nodes panel and the node settings merge the result into the parameters they write.
3. **Nodes panel respects option-level display conditions.** `useActionsGeneration.ts` skips an option whose `displayOptions` do not match the default parameters of a new node. The check uses the defaults only, not the option's own value: an old version's option shows only for its own value, so a check that includes that value would always pass. This is a general fix and helps any node that uses option-level conditions.
4. **Canvas subtitle.** When the subtitle contains `CUSTOM_ACTION_RESOURCE_VALUE` or the node's `operation` equals a known `pinValues.operation`, the subtitle is the stored `customActionName`, else empty.
5. **Settings page access.** The page needs `customNode:create`. Members do not see it.
6. **Save as custom action** from the HTTP Request node never copies an `Authorization`, `Cookie`, or `Proxy-Authorization` header, or a query parameter whose name contains `key`, `token`, or `secret`. The wizard tells the administrator to use a credential for secrets (spec §18 finding).
7. **Credential mode "none".** The review step and the error text explain that a credential with the domain setting "None" blocks custom actions and that the owner must allow the action's host.

## Review Focus

1. A user picks an older version that only a pinned node can see. Expected: the nodes panel never lists old versions; the dropdown of a pinned node shows its version once. Test in Task 5.
2. A user selects a custom action in the node settings dropdown. Expected: the node stores all pin values (operation, id, name), not only `operation`. Test in Task 5.
3. With the module off, every changed editor file behaves as before: no extra items, no extra requests. Test in Tasks 5 and 6.
4. A member without `customNode:create` sees no create or edit entry point, but can add and run existing custom actions. Test in Task 6.
5. An SVG icon with markup is uploaded. Expected: the server rejects it, and the UI says why and suggests PNG. Test in Task 4.

---

### Task 0: Prepare (controller)

Build, record the baseline of the custom-nodes backend tests, and start the throwaway instance setup (own data folder, port 5690, local echo server, never `~/.n8n` or port 5678).

### Task 1: Backend gaps for the UI

**Files:** `@n8n/api-types` custom-nodes schema (constant, response types), `packages/cli/src/modules/custom-nodes/` (generator import, service, controller), their tests.

**Produces:**
- `CUSTOM_ACTION_RESOURCE_VALUE` exported from `@n8n/api-types`; `parent-action.generator.ts` uses it.
- `GET /custom-nodes/actions/:id/versions/:version` (scope `customNode:list`) → `{ version: number; draft: CustomActionDraft; revisions: Array<{ revision: number; changeNote?: string; createdAt: string; current: boolean }> }`.
- `GET /custom-nodes/nodes/:id` (scope `customNode:list`) → `CustomNodeResponse`.

Tests (integration): version detail returns the draft of that version and its revisions with the current one marked; 404 for an unknown version; 403 without scope; node detail returns one node; 404 when the module is off.
Commit: `feat(core): Add version detail and node detail routes for custom nodes (no-changelog)`.

### Task 2: Module scaffold, API client, store, settings list

**Files:** `packages/modules/custom-nodes/frontend/**` (new), `editor-ui` registration that the scaffolder makes, `en.json`.

**Produces:**
- `custom-nodes.api.ts`: one function per route of the backend (list nodes, node detail, create node, update node, delete node, set icon, add action to node, list parent actions, list parents, add parent action, save action, version detail, rollback, delete action, preview).
- `custom-nodes.store.ts` (`useCustomNodesStore`): `nodes`, `parentActions`, `parents`, `fetchAll()`, `fetchParents()`, and the write actions. Each write calls `fetchAll()` after success.
- Descriptor `custom-nodes.module.ts`: route `/settings/custom-nodes` (`middleware: ['authenticated', 'rbac', 'custom']`, scope `customNode:create`, custom check `isModuleActive('custom-nodes')`), `settingsPages` entry in section `integrations`, order 30, icon `blocks`.
- `SettingsCustomNodesView.vue`: a list of custom nodes and a list of parent actions, grouped by parent node, each with edit and delete (confirm dialog). Empty state with a "Create" call to action. Icons through `N8nNodeIcon` with the icon URL.

Tests: the store calls the right route for each action and refetches after a write; the view lists nodes and parent actions, opens the delete confirm, and calls delete; the descriptor test (scope and module gate) follows `mcp.module.test.ts`.
Commit: `feat(editor): Add custom nodes settings page (no-changelog)`.
Controller after this task: start the instance with the module, open the page in the browser pane, check the list with data created through the API.

### Task 3: Wizard

**Files:** `packages/modules/custom-nodes/frontend/src/wizard/**`, `en.json`.

**Produces:**
- `useCustomActionDraft()` composable: holds a `CustomActionDraft`, the chosen target (new custom node with base URL and authentication, or an eligible parent node type), validation state from `POST /custom-nodes/preview`, and `fromHttpRequestParameters(params: INodeParameters)`, which maps an HTTP Request node to a draft (port from the mockup's `useCustomNodeDraft.ts`; apply decision 6).
- `CustomActionWizardModal.vue` with one component per step: `ChooseStep` (new custom node or existing node; the list of existing nodes comes from `GET /custom-nodes/parents`), `RequestStep` (method, URL with `{placeholder}` help, fixed headers, query and body), `FieldsStep` (inputs: name, display name, type, required, default, target), `ReviewStep` (shows the request host, the generated fields from the preview response, the issues, and the credential note of decision 7).
- Save: create node, add action to node, add parent action, or save an existing action. After a save of an existing action, show the kind the server returned ("new version", "changes applied", "no changes").
- The modal opens with optional data: `{ mode: 'create' | 'edit', parentNodeType?, actionId?, customNodeId?, httpRequestParameters? }`. The module registers it in `modals` and other code opens it through the `modalOpeners` capability.

Tests: the draft composable (mapping from HTTP Request parameters including decision 6, adding and removing inputs, URL placeholders turn into URL inputs, issues from the preview are mapped to fields); each step renders and emits changes; the review step shows the host; save calls the right store action for each target.
Commit: `feat(editor): Add wizard for custom nodes and custom actions (no-changelog)`.

### Task 4: Versions, revisions, and icons

**Files:** module `src/history/**`, `src/icon/**`, settings view, `en.json`.

**Produces:** a version history panel per action (versions with created date and the newest marked; revisions of a version with change note; rollback with confirm), and an icon upload for a custom node (PNG or SVG up to 256 KiB, read as a data URI, sent to the icon route). An SVG that the server refuses shows the server reason and suggests PNG.
Tests: the history lists versions and revisions and calls rollback; the icon upload rejects a file over 256 KiB in the client, sends a valid file, and shows the server reason on a 400.
Commit: `feat(editor): Add version history and icon upload for custom nodes (no-changelog)`.

### Task 5: Selection, nodes panel, subtitle (shared editor code)

**Files:** module `src/selection/useCustomActionSelection.ts`; `editor-ui`: `features/shared/nodeCreator/composables/useActionsGeneration.ts`, `useActions.ts` (`getActionData`, `actionDataToNodeTypeSelectedPayload`), `Interface.ts` (`NodeTypeSelectedPayload.parameters`), `features/ndv/settings/components/NodeSettings.vue` (`valueChanged`), `app/stores/workflowDocument/useWorkflowDocumentRenderData.ts` (`computeSubtitle`), `app/components/NodeActionsList.vue` (`isSelected`); tests next to each.

**Produces:**
- `useCustomActionSelection()`: `pinValuesFor(nodeTypeName, parameters)`, `newestPinValuesFor(nodeTypeName, parameters)` (returns the newest version's pin values when the node is on an older version, else `undefined`), `actionNameFor(parameters)`. Data from `useCustomNodesStore`; loads once when the module is active and the user has `customNode:list`.
- Nodes panel: decision 3, and the pin values of decision 2 in `getActionData` and in the selected payload.
- Node settings: when `operation` changes to a value for which `pinValuesFor` returns values, `valueChanged` writes all pin values in one `parameters` update.
- Subtitle: decision 4.
- `NodeActionsList` marks a custom action as selected by its `operation` value.

Tests:
- `useActionsGeneration`: an option with `displayOptions.show.operation = [itsOwnValue]` is not listed; the newest version with `hide.operation = [old values]` is listed; a node without option-level conditions gives the same actions as before.
- `getActionData` for a custom action includes `customActionId` and `customActionName`; for a built-in action the result is unchanged.
- `NodeSettings`: selecting a custom action in the dropdown writes the three pin values; selecting a built-in operation writes only `operation`.
- Subtitle: a custom selection shows the action name; a built-in selection is unchanged; `__CUSTOM_ACTION__` never shows.
- With the module off, every changed function returns the same result as before (one test per file).
Commit: `feat(editor): Write custom action selections and hide old versions in the nodes panel (no-changelog)`.
Review: a task review runs after this task.

### Task 6: Entry points and upgrade notice

**Files:** module `src/entry-points/**`; `editor-ui`: `features/shared/nodeCreator/components/Modes/NodesMode.vue` and `Panel/NoResults.vue`, `Modes/ActionsMode.vue`, `app/components/NodeActionsList.vue`, `features/ndv/settings/components/NodeSettings.vue`, `features/ndv/parameters/components/ParameterInputList.vue`; `en.json`.

**Produces:**
- Nodes panel: "Create custom node" as the last item of the node list, and highlighted in the no-results state of a search (`customNode:create`).
- Actions list of an eligible parent (nodes panel and the node settings Action tab): "Add custom action to <node>" at the end (`customNode:create`). Eligibility comes from `GET /custom-nodes/parents`.
- HTTP Request node settings: "Save as custom action" opens the wizard prefilled (`customNode:create`).
- Upgrade notice: an `N8nNotice` after the operation parameter when `newestPinValuesFor` returns values. "Upgrade" writes the newest pin values in one update. The notice is visible to every user who can edit the workflow.

Tests: each entry point shows only with the module active and the scope; the parent list decides the "Add custom action" row; "Save as custom action" passes the HTTP Request parameters; the upgrade notice shows for an older version, not for the newest, and writes the newest pin values.
Commit: `feat(editor): Add entry points for custom nodes and an upgrade notice (no-changelog)`.

### Task 7: Close-out (controller)

1. Run the module tests and the changed `editor-ui` test files, and `pnpm build > build.log 2>&1`.
2. Browser check on the throwaway instance, module on: create a custom node through the wizard; add a custom action to Stripe from the nodes panel; save an HTTP Request node as a custom action; run each in a workflow against the local echo server; edit an input (new version) and use the upgrade notice; check that the nodes panel never shows an old version; check as a member that no create entry point shows. Module off: no entry point, no request to `/rest/custom-nodes`.
3. Whole-plan review and one fix wave, then a spec update (section 20) and a docs commit.

## Known limits that this plan accepts

- The node creator and node settings learn about custom actions from the module store, which loads once per editor session and after each push `nodeDescriptionUpdated`. A definition that another administrator creates appears after that push.
- The wizard supports the request shapes of the backend (fixed headers, query, JSON or form body). Binary bodies and pagination are out of scope.

## Next plans

| Plan | Content | Depends on |
| --- | --- | --- |
| 4: Usage and rollout | Dependency index type, version usage view, delete guard, telemetry, docs, preview branch with default-on commit and demo seed, Playwright test | Plans 2 and 3 |
