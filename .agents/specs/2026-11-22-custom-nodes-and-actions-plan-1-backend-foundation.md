# Custom Nodes and Actions, Plan 1: Backend Foundation and Custom Nodes

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** An administrator can create, edit, and delete a custom node through the REST API, and a workflow can execute it, on every instance type, with the module off by default.

**Architecture:** A backend module `custom-nodes` in `packages/cli/src/modules/`. Definitions live in four tables. A pure generator turns them into declarative node descriptions. A `NodeLoader` serves them under the package `n8n-custom`, and `RoutingNode` executes them. The server classifies each edit as cosmetic, revision, or new version.

**Tech Stack:** TypeScript, zod (`@n8n/api-types`), TypeORM through `@n8n/db`, `@n8n/di`, Vitest, nock.

**Spec:** `.agents/specs/2026-11-22-custom-nodes-and-actions-design.md`. Read it before any task.

**Scope of this plan:** Pull requests 1 to 4 of the spec's stack. Custom actions on parent nodes, the frontend, and the usage view are in later plans (see "Next plans" at the end). Each plan ends with working, tested software.

**Test cases:** `AGENTS.md` requires that the user confirms test cases before they are written. Jason's approval of this plan is that confirmation for the tests listed here. Ask before adding a test group that this plan does not name.

## Global Constraints

- Follow `AGENTS.md`: no `any`; no `as` outside tests; TypeORM imports only in `database/` files; error classes `UserError`, `OperationalError`, `UnexpectedError`; technical text in Simplified Technical English.
- Module location: `packages/cli/src/modules/custom-nodes/`. The module needs `LoadNodesAndCredentials` and `Push` from `packages/cli`, as `mcp-registry` does.
- Module name: `custom-nodes`. It is NOT in `defaultModules`. `N8N_ENABLED_MODULES=custom-nodes` turns it on. With the module off there are no routes, no node types, and no behavior change.
- Package name of generated node types: `n8n-custom`. Full type name: `n8n-custom.<customNodeId>`.
- User-facing text says "action". The node parameter keeps the name `operation`.
- URL placeholders use the form `{inputName}`. A value that contains `{{` or starts with `=` is rejected. No n8n expression is accepted in a definition.
- No new dependencies.
- No demo data in the code of this plan.
- Commits: conventional title with `(no-changelog)`, no attribution lines, author is the local git user.
- Run from the package directory: `pnpm test <file>`, `pnpm typecheck`, `pnpm lint`. Build first when a shared package changes: `pnpm build > build.log 2>&1`.
- Use these skills when a task touches their area: `n8n:db-migrations` (Task 6), `n8n:protect-endpoints` (Task 11), `/security-review` before each pull request.

## Review Focus

1. A definition whose URL input contains `/`, `?`, `#`, or `..` must not change the host or the path structure of the request. Expected: the value is percent-encoded. Test in Task 7.
2. Two administrators save the same action at the same time. Expected: both saves succeed in order or one fails with a clear conflict error; no version number is used twice. Test in Task 10.
3. A custom node whose credential has domain restriction mode `none` or a list without the node's host. Expected: the request is blocked; the definition never widens the list. Test in Task 8.
4. An SVG icon with a `<script>` element, an `onload` attribute, or a `javascript:` URL. Expected: the upload is rejected with a 400. Test in Task 11.
5. A worker receives the reload command while an execution of the same custom node runs. Expected: the running execution finishes with the description it started with; the next execution uses the new one. Test in Task 9.

---

### Task 0: Prepare the workspace

**Files:** none.

- [ ] **Step 1: Install and build**

Run from the repository root: `pnpm install` then `pnpm build > build.log 2>&1` then `tail -n 5 build.log`.
Expected: `Tasks: N successful, N total`.

- [ ] **Step 2: Record the baseline**

Run in `packages/cli`: `pnpm typecheck > "$TMPDIR/cli-typecheck-baseline.log" 2>&1; grep -c 'error TS' "$TMPDIR/cli-typecheck-baseline.log"`.
Expected: `0`. If not, save the list. Errors on that list are not yours.

### Task 1: Spike: version pin mechanism

This task is a throwaway spike. It has no pull request of its own. Its output is one decision in the spec and one small module with tests that later tasks use.

**Files:**
- Create: `packages/cli/src/modules/custom-nodes/version-pin.ts`
- Test: `packages/cli/src/modules/custom-nodes/__tests__/version-pin.test.ts`
- Modify: `.agents/specs/2026-11-22-custom-nodes-and-actions-design.md` (section 6, replace the "Risk, resolve first" paragraph with the decision)

**Interfaces:**
- Produces:

```ts
export const OPERATION_PARAMETER = 'operation';
export interface ActionVersionRef { actionId: string; actionName: string; version: number }
/** Options for the `operation` dropdown. New nodes can select only the newest version of each action. */
export function operationOptions(actions: Array<{ id: string; name: string; description?: string; versions: number[] }>): INodePropertyOptions[];
/** `displayOptions.show` for the properties of one version of one action. */
export function showFor(actionId: string, version: number): NonNullable<IDisplayOptions['show']>;
/** Extra properties the mechanism needs, for example a hidden pin parameter. Can be empty. */
export function pinProperties(actions: Array<{ id: string; name: string; versions: number[] }>): INodeProperties[];
/** Reads the pin from saved node parameters. `undefined` when no custom action is selected. */
export function readPin(parameters: INodeParameters): ActionVersionRef | undefined;
/** Parameter values that pin a node to a version. The upgrade button and the nodes panel write these. */
export function pinValues(ref: ActionVersionRef): INodeParameters;
```

- [ ] **Step 1: Write the acceptance tests**

They are the definition of "the pin survives". Build a description with one action that has versions 1 and 2 through the functions above, then:

```ts
const saved = (params: INodeParameters) =>
	NodeHelpers.getNodeParameters(description.properties, params, false, false, null, description);

it('keeps a node on version 1 after a save that strips default values', () => {
	const params = { ...pinValues({ actionId: 'a1', actionName: 'Get Invoice', version: 1 }), invoiceId: 'inv_1' };
	expect(readPin(saved(params) ?? {})).toEqual({ actionId: 'a1', actionName: 'Get Invoice', version: 1 });
});
it('keeps the pin when version 3 is added later', () => { /* regenerate with versions [1,2,3], same params, same result */ });
it('shows only the properties of the pinned version', () => { /* NodeHelpers.displayParameter is true for v1 props, false for v2 props */ });
it('offers only the newest version to a node without a pin', () => { /* options visible for empty params contain version 2 only */ });
it('returns the action name for an action that no longer exists', () => { /* readPin on params whose action is not in the description still returns actionId and actionName */ });
it('returns undefined when a built-in operation is selected', () => { expect(readPin({ operation: 'get' })).toBeUndefined(); });
```

- [ ] **Step 2: Try mechanism B first, then A**

B: the option value carries the version (`<actionId>@<version>`), and old versions have option-level `displayOptions` that show them only when they are the current value. A: a hidden parameter with a sentinel default. Implement the first one that passes all tests in Step 1.

- [ ] **Step 3: Check the editor by hand**

Use the throwaway description in a local custom node file (`~/.n8n/custom/`). Check in the editor: save and reload, copy and paste the node, duplicate the workflow, export and import the workflow. The parameter panel must show the pinned version each time. Check that the nodes panel does not list old versions as actions.

- [ ] **Step 4: Record the decision**

Write the chosen mechanism, the stored parameter shape, and any editor change that later plans need into section 6 of the spec.

- [ ] **Step 5: Run and commit**

Run in `packages/cli`: `pnpm test src/modules/custom-nodes/__tests__/version-pin.test.ts`. Expected: 6 passed.
Commit: `feat(core): Add version pin for custom actions (no-changelog)`.

### Task 2: Module scaffold, switch, and scopes

**Files:**
- Create: `packages/cli/src/modules/custom-nodes/custom-nodes.module.ts` (use `pnpm setup-backend-module`, then rename)
- Modify: `packages/@n8n/backend-common/src/modules/modules.config.ts` (`MODULE_NAMES`)
- Modify: `packages/@n8n/config/src/configs/logging.config.ts` (`LOG_SCOPES`, add `'custom-nodes'`)
- Modify: `packages/@n8n/permissions/src/constants.ee.ts` (`RESOURCES`: `customNode: ['list', 'create', 'update', 'delete'] as const`)
- Modify: `packages/@n8n/permissions/src/roles/scopes/global-scopes.ee.ts`
- Test: `packages/cli/src/modules/custom-nodes/__tests__/custom-nodes.module.test.ts`, scope snapshot in `packages/@n8n/permissions`

**Interfaces:**
- Produces: module name `'custom-nodes'`; scopes `customNode:list`, `customNode:create`, `customNode:update`, `customNode:delete`. Owner and admin get all four. Member gets `customNode:list` only.

- [ ] **Step 1: Write the failing tests**

```ts
it('is not a default module', () => {
	expect(Container.get(ModuleRegistry).eligibleModules).not.toContain('custom-nodes');
});
it('runs on main, worker and webhook instances', () => {
	const entry = Container.get(ModuleMetadata).getEntries().find(([name]) => name === 'custom-nodes');
	expect(entry?.[1].instanceTypes).toEqual(['main', 'worker', 'webhook']);
});
```

In `packages/@n8n/permissions`: owner and admin scope lists contain the four scopes; `GLOBAL_MEMBER_SCOPES` contains only `customNode:list`.

- [ ] **Step 2: Run to see them fail.** `pnpm test src/modules/custom-nodes` in `packages/cli`. Expected: FAIL, module not found.
- [ ] **Step 3: Implement.** Entrypoint `@BackendModule({ name: 'custom-nodes', instanceTypes: ['main', 'worker', 'webhook'] })`. `init()`, `entities()`, `nodeLoaders()` are empty for now. `settings()` returns `{}`. Add the name to `MODULE_NAMES` only, not to `defaultModules`.
- [ ] **Step 4: Run.** Both test files pass. Update the scope snapshot in `packages/@n8n/permissions` with `pnpm test -u` there and read the diff: only the four new scopes.
- [ ] **Step 5: Commit.** `feat(core): Add custom-nodes module and scopes (no-changelog)`

### Task 3: Schemas and DTOs

**Files:**
- Create: `packages/@n8n/api-types/src/schemas/custom-nodes.schema.ts`
- Create: `packages/@n8n/api-types/src/dto/custom-nodes/custom-nodes.dto.ts`
- Modify: `packages/@n8n/api-types/src/index.ts`, `packages/@n8n/api-types/src/dto/index.ts`
- Test: `packages/@n8n/api-types/src/schemas/__tests__/custom-nodes.schema.test.ts`

**Interfaces:**
- Produces (zod schemas with inferred types of the same name without `Schema`):

```ts
export const CUSTOM_DEFINITIONS_PACKAGE_NAME = 'n8n-custom';
customNodeAuthSchema      // { kind: 'none' } | { kind: 'predefined'; credentialType: string } | { kind: 'generic'; type: 'httpHeaderAuth' | 'httpBasicAuth' | 'httpBearerAuth' | 'httpQueryAuth' }
customActionInputSchema   // { name: /^[a-z][A-Za-z0-9]*$/ ≤64; displayName 1..128; description? ≤1000; type: 'string'|'number'|'boolean'|'options'|'json'; options?: Array<{ name: string; value: string }>; required: boolean; default?: string|number|boolean; target: 'url'|'header'|'query'|'body'; key 1..256 }
customActionRequestSchema // { method: 'GET'|'POST'|'PUT'|'PATCH'|'DELETE'; url: string; headers: Record<string,string>; query: Record<string,string>; bodyType: 'none'|'json'|'form'; body: Record<string, unknown> }
customActionDraftSchema   // { name 1..128; description? ≤1000; inputs: CustomActionInput[] ≤50; request: CustomActionRequest }
export type CustomActionEditKind = 'none' | 'cosmetic' | 'revision' | 'version';
export interface CustomActionDraftIssue { path: string; code: string; message: string }
export interface CustomActionVersionSummary { version: number; currentRevision: number; revisionCount: number; createdAt: string }
export interface CustomActionResponse { id: string; name: string; description?: string; parentNodeType: string | null; customNodeId: string | null; newestVersion: number; versions: CustomActionVersionSummary[]; draft: CustomActionDraft }
export interface CustomNodeResponse { id: string; nodeType: string; displayName: string; description?: string; baseUrl: string; auth: CustomNodeAuth; hasIcon: boolean; actions: CustomActionResponse[]; createdAt: string; updatedAt: string }
```

DTO classes (`Z.class`): `CreateCustomNodeDto { displayName, description?, baseUrl: z.string().url(), auth, actions: CustomActionDraft[] min 1 }`, `UpdateCustomNodeDto { displayName?, description?, baseUrl? }`, `SaveCustomActionDto { draft, changeNote? ≤500 }`, `RollbackCustomActionRevisionDto { revision: int ≥1 }`, `SetCustomNodeIconDto { iconDataUri: /^data:image\/(svg\+xml|png);base64,[A-Za-z0-9+/=]+$/ }`, `PreviewCustomActionDto { draft }`.

- [ ] **Step 1: Write the failing tests**

```ts
it('accepts a minimal draft', () => { expect(customActionDraftSchema.safeParse(minimalDraft).success).toBe(true); });
it('rejects an input name that is not a camelCase identifier', () => { /* 'Invoice-Id' fails */ });
it('rejects more than 50 inputs', () => {});
it('rejects an unknown generic auth type', () => {});
it('rejects an icon that is not a PNG or SVG data URI', () => { /* 'data:text/html;base64,AAAA' fails */ });
```

- [ ] **Step 2: Run to fail.** `pnpm test src/schemas/__tests__/custom-nodes.schema.test.ts` in `packages/@n8n/api-types`.
- [ ] **Step 3: Implement** the schemas, types, and DTO classes above. Export them from both index files.
- [ ] **Step 4: Run to pass,** then `pnpm build` in `packages/@n8n/api-types`.
- [ ] **Step 5: Commit.** `feat(core): Add custom node and custom action schemas (no-changelog)`

### Task 4: Draft validator

**Files:**
- Create: `packages/cli/src/modules/custom-nodes/draft-validator.ts`
- Test: `packages/cli/src/modules/custom-nodes/__tests__/draft-validator.test.ts`

**Interfaces:**
- Consumes: `CustomActionDraft`, `CustomActionDraftIssue` (Task 3).
- Produces: `export function validateDraft(draft: CustomActionDraft): CustomActionDraftIssue[]` (empty array means valid) and `export class InvalidCustomActionError extends UserError { readonly issues: CustomActionDraftIssue[] }`.

Issue codes: `expression_not_allowed`, `unknown_placeholder`, `url_input_not_in_url`, `placeholder_in_host`, `invalid_url`, `duplicate_input_name`, `duplicate_target_key`, `options_missing`, `body_without_body_type`.

- [ ] **Step 1: Write the failing tests** (one `it` for each line; `codes(draft)` returns the issue codes)

```ts
expect(codes(valid)).toEqual([]);
expect(codes(withUrl('https://x.test/{{ $json.a }}'))).toContain('expression_not_allowed');
expect(codes(withHeader('Authorization', '={{ $credentials.secretKey }}'))).toContain('expression_not_allowed');
expect(codes(withBody({ a: { b: '{{ $env.TOKEN }}' } }))).toContain('expression_not_allowed');
expect(codes(withUrl('/invoices/{invoiceId}', []))).toContain('unknown_placeholder');
expect(codes(withUrl('/invoices', [urlInput('invoiceId')]))).toContain('url_input_not_in_url');
expect(codes(withUrl('https://{host}/v1', [urlInput('host')]))).toContain('placeholder_in_host');
expect(codes(withUrl('ftp://x.test/a'))).toContain('invalid_url');
expect(codes(withInputs([bodyInput('a'), bodyInput('a')]))).toContain('duplicate_input_name');
expect(codes(withInputs([bodyInput('a', 'x.y'), bodyInput('b', 'x.y')]))).toContain('duplicate_target_key');
expect(codes(withInputs([{ ...bodyInput('a'), type: 'options', options: [] }]))).toContain('options_missing');
expect(codes({ ...valid, request: { ...valid.request, bodyType: 'none', body: { a: 1 } } })).toContain('body_without_body_type');
```

- [ ] **Step 2: Run to fail.**
- [ ] **Step 3: Implement.** A URL is valid when it is an absolute `http` or `https` URL, or a path that starts with `/`. Check every string leaf of `url`, `headers`, `query`, and `body` for `{{` and for a leading `=`. Each issue carries a `path` such as `request.headers.Authorization`.
- [ ] **Step 4: Run to pass.**
- [ ] **Step 5: Commit.** `feat(core): Validate custom action drafts (no-changelog)`

### Task 5: Edit classifier

**Files:**
- Create: `packages/cli/src/modules/custom-nodes/edit-classifier.ts`
- Test: `packages/cli/src/modules/custom-nodes/__tests__/edit-classifier.test.ts`

**Interfaces:**
- Consumes: `CustomActionDraft`, `CustomActionEditKind` (Task 3).
- Produces:

```ts
export type StoredInput = Omit<CustomActionInput, 'target' | 'key'>;
export type StoredRequest = CustomActionRequest & { inputTargets: Record<string, { target: CustomActionInput['target']; key: string }> };
export function splitDraft(draft: CustomActionDraft): { inputs: StoredInput[]; request: StoredRequest };
export function joinDraft(meta: { name: string; description?: string }, inputs: StoredInput[], request: StoredRequest): CustomActionDraft;
export function classifyEdit(current: CustomActionDraft, next: CustomActionDraft): CustomActionEditKind;
```

Rule: the contract of an input is `name`, `type`, `required`, the set of option `value`s, and `default`. A contract change is `version`. Else a change in `request`, or in the `target` or `key` of an input, is `revision`. Else a change in action name, action description, input `displayName`, input `description`, option `name`, or input order is `cosmetic`. Else `none`.

- [ ] **Step 1: Write the failing tests**

```ts
expect(classifyEdit(base, base)).toBe('none');
expect(classifyEdit(base, { ...base, name: 'Renamed' })).toBe('cosmetic');
expect(classifyEdit(base, withInput(0, { displayName: 'Invoice' }))).toBe('cosmetic');
expect(classifyEdit(base, reorderInputs(base))).toBe('cosmetic');
expect(classifyEdit(base, withRequest({ url: '/v2/invoices/{invoiceId}' }))).toBe('revision');
expect(classifyEdit(base, withRequest({ headers: { 'X-Api-Version': '2' } }))).toBe('revision');
expect(classifyEdit(base, withInput(0, { key: 'other.path' }))).toBe('revision');
expect(classifyEdit(base, withInput(0, { required: false }))).toBe('version');
expect(classifyEdit(base, withInput(0, { default: 5 }))).toBe('version');
expect(classifyEdit(base, addInput(base, bodyInput('memo')))).toBe('version');
expect(classifyEdit(base, removeInput(base, 0))).toBe('version');
expect(classifyEdit(base, withOptionValue(base, 'eur', 'EUR'))).toBe('version');
expect(classifyEdit(base, withInputAndRequest)).toBe('version'); // version wins over revision
expect(joinDraft(meta, ...Object.values(splitDraft(base)))).toEqual(base); // round trip
```

- [ ] **Step 2: Run to fail.** - [ ] **Step 3: Implement.** - [ ] **Step 4: Run to pass.**
- [ ] **Step 5: Commit.** `feat(core): Classify custom action edits (no-changelog)`

### Task 6: Tables, entities, repositories

Use the `n8n:db-migrations` skill. Read `docs/backend/how-to/write-a-database-migration.md`.

**Files:**
- Create: migration via `pnpm --filter=@n8n/db migration:new CreateCustomNodeTables`
- Create: `packages/cli/src/modules/custom-nodes/database/entities/{custom-node,custom-action,custom-action-version,custom-action-revision}.entity.ts`
- Create: `packages/cli/src/modules/custom-nodes/database/repositories/{custom-node,custom-action}.repository.ts`
- Modify: `custom-nodes.module.ts` (`entities()`)
- Test: `packages/cli/src/modules/custom-nodes/__tests__/custom-nodes.repository.integration.test.ts`
- Regenerate: `docs/generated/` with `pnpm db:schema:docs`

**Tables** (all ids of definitions are 16-character nano ids in `varchar(36)`):

| Table | Columns |
| --- | --- |
| `custom_node` | `id` PK; `displayName` varchar(128); `description` text null; `baseUrl` text; `baseUrlHistory` json default `[]` (earlier values with time and user); `auth` json; `iconMimeType` varchar(32) null; `iconData` binary null; `createdById`, `updatedById` uuid null → `user.id` SET NULL; timestamps |
| `custom_action` | `id` PK; `name` varchar(128); `description` text null; `parentNodeType` varchar(255) null; `customNodeId` varchar(36) null → `custom_node.id` CASCADE; named CHECK: exactly one of the two is not null; `createdById`, `updatedById`; timestamps; index on `customNodeId`; index on `parentNodeType` |
| `custom_action_version` | `id` int PK autoGenerate2; `actionId` → `custom_action.id` CASCADE; `version` int; `inputs` json; `currentRevision` int; `createdAt`; unique (`actionId`, `version`) |
| `custom_action_revision` | `id` int PK autoGenerate2; `versionId` → `custom_action_version.id` CASCADE; `revision` int; `request` json; `changeNote` text null; `createdById` uuid null → `user.id` SET NULL; `createdAt`; unique (`versionId`, `revision`) |

Add a `.comment()` to each JSON and enum-like column.

**Interfaces:**
- Produces (repositories extend `BaseRepository`, every method takes `ctx: OperationContext`):

```ts
class CustomNodeRepository {
	insertNode(node: NewCustomNode, ctx): Promise<CustomNodeEntity>;
	findAllNodes(ctx): Promise<CustomNodeEntity[]>;            // without iconData
	findNode(id: string, ctx): Promise<CustomNodeEntity | null>;
	updateNode(id: string, patch: Partial<Pick<CustomNodeEntity, 'displayName' | 'description' | 'baseUrl' | 'baseUrlHistory' | 'updatedById'>>, ctx): Promise<void>;
	setIcon(id: string, icon: { mimeType: string; data: Buffer } | null, ctx): Promise<void>;
	findIcon(id: string, ctx): Promise<{ mimeType: string; data: Buffer } | null>;
	deleteNode(id: string, ctx): Promise<void>;
}
class CustomActionRepository {
	insertAction(action: NewCustomAction, version: { inputs: StoredInput[] }, revision: { request: StoredRequest; changeNote?: string; createdById: string }, ctx): Promise<string>;
	findAllActions(ctx): Promise<ActionAggregate[]>;           // action + versions + current revision of each
	findAction(id: string, ctx): Promise<ActionAggregate | null>;
	updateActionMeta(id: string, meta: { name: string; description?: string; updatedById: string }, ctx): Promise<void>;
	updateVersionInputs(versionId: number, inputs: StoredInput[], ctx): Promise<void>;       // cosmetic edit
	appendRevision(versionId: number, revision: { request: StoredRequest; changeNote?: string; createdById: string }, ctx): Promise<number>;
	appendVersion(actionId: string, version: { inputs: StoredInput[] }, revision: { request: StoredRequest; changeNote?: string; createdById: string }, ctx): Promise<number>;
	setCurrentRevision(versionId: number, revision: number, ctx): Promise<void>;
	countRevisions(versionId: number, ctx): Promise<number>;
	deleteAction(id: string, ctx): Promise<void>;
}
export interface ActionAggregate { action: CustomActionEntity; versions: Array<{ id: number; version: number; inputs: StoredInput[]; currentRevision: number; revisionCount: number; request: StoredRequest; createdAt: Date }> }
```

- [ ] **Step 1: Write the failing integration tests** (use `testModules.loadModules(['custom-nodes'], …)` and `tscDecoratorTransform` in the vitest config if the package needs it)

```ts
it('stores an action with version 1 and revision 1', async () => { /* insertAction, then findAction: versions[0] = { version: 1, currentRevision: 1, revisionCount: 1 } */ });
it('numbers versions 1, 2, 3 for one action', async () => {});
it('numbers revisions per version', async () => { /* appendRevision twice on v1 → 2, 3; v2 starts at 1 */ });
it('rejects an action with both parentNodeType and customNodeId', async () => { await expect(insert(both)).rejects.toThrow(); });
it('rejects an action with neither', async () => {});
it('deletes actions, versions and revisions with their custom node', async () => {});
it('rolls back all rows when the transaction fails', async () => { /* txRunner.run that throws after insertAction leaves no row */ });
```

- [ ] **Step 2: Run to fail.**
- [ ] **Step 3: Implement** migration, entities, repositories. `appendVersion` and `appendRevision` compute the next number inside the transaction of `ctx`.
- [ ] **Step 4: Run to pass** on SQLite. Run the same file on Postgres (`pnpm --filter n8n-containers services --services postgres`, then the test with the Postgres env of `docs/backend/how-to/test-a-backend-change.md`).
- [ ] **Step 5: Test the down migration.** `pnpm start`, `pnpm start -- db:revert`, `pnpm start`. Expected: no error, tables exist again.
- [ ] **Step 6: Regenerate schema docs.** `pnpm db:schema:docs`. If Docker and tbls are missing, stop and tell Jason.
- [ ] **Step 7: Commit.** `feat(core): Add custom node tables (no-changelog)`

### Task 7: Description generator

**Files:**
- Create: `packages/cli/src/modules/custom-nodes/node-description.generator.ts`
- Test: `packages/cli/src/modules/custom-nodes/__tests__/node-description.generator.test.ts`
- Reference: `git show feat/custom-nodes-mockup:packages/cli/src/modules/custom-nodes/node-description.generator.ts`

**Interfaces:**
- Consumes: `StoredInput`, `StoredRequest` (Task 5); `operationOptions`, `showFor`, `pinProperties` (Task 1); `userDefinedEndpoint` (Task 8, add the property there first if Task 8 is not merged: the two tasks can swap order).
- Produces:

```ts
export interface ActionVersionView { version: number; inputs: StoredInput[]; request: StoredRequest }
export interface ActionView { id: string; name: string; description?: string; versions: ActionVersionView[] } // ascending by version
export interface CustomNodeView { id: string; displayName: string; description?: string; baseUrl: string; auth: CustomNodeAuth; iconUrl?: string }
export const ADDITIONAL_FIELDS = 'additionalFields';
export function generateCustomNodeDescription(node: CustomNodeView, actions: ActionView[]): INodeTypeDescription;
/** Fixed request of one version. `param(name)` returns the expression path of an input. */
export function buildRequest(version: ActionVersionView, param: (inputName: string) => string): DeclarativeRestApiSettings.HttpRequestOptions;
export function buildInputProperties(version: ActionVersionView, show: NonNullable<IDisplayOptions['show']>): INodeProperties[];
```

- [ ] **Step 1: Write the failing tests** (fixture: node "Acme Billing", base URL `https://billing.acme.test/api`, header auth; action "Get Invoice" v1 with URL `/invoices/{invoiceId}`, fixed query `expand=customer`, optional boolean query input `includeLines`; action "Create Invoice" v1 and v2)

```ts
const d = generateCustomNodeDescription(node, [getInvoice, createInvoice]);
expect(d.name).toBe(node.id);
expect(d.version).toBe(1);
expect(d.requestDefaults).toEqual({ baseURL: 'https://billing.acme.test/api', json: true });
expect(d.userDefinedEndpoint).toBe(true);
expect(d.credentials).toEqual([{ name: 'httpHeaderAuth', required: true }]);
expect(d.hidden).toBeUndefined();
expect(d.usableAsTool).toBeUndefined();

const req = buildRequest(getInvoice.versions[0], (n) => `$parameter["${n}"]`);
expect(req.method).toBe('GET');
expect(req.url).toBe('=/invoices/{{ encodeURIComponent($parameter["invoiceId"]) }}');
expect(req.qs).toEqual({ expand: 'customer' });

// required inputs are top-level; optional inputs are in the collection
const props = buildInputProperties(getInvoice.versions[0], showFor(getInvoice.id, 1));
expect(props.map((p) => p.name)).toEqual(['invoiceId', ADDITIONAL_FIELDS]);
expect(props[0].routing).toBeUndefined(); // url inputs have no routing
expect(props[1].options?.[0]).toMatchObject({ name: 'includeLines', type: 'boolean', routing: { send: { type: 'query', property: 'include_lines', propertyInDotNotation: false } } });

// body input with a nested key
expect(bodyProp('lineItems0Price').routing).toEqual({ send: { type: 'body', property: 'line_items[0].price', value: '={{ $value }}' } });
// form body sets the content type; json body does not
expect(buildRequest(formVersion, p).headers).toEqual({ 'Content-Type': 'application/x-www-form-urlencoded' });
// both versions of Create Invoice have properties, each shown only for its version
expect(d.properties.filter((p) => p.name === 'amount')).toHaveLength(2);
// a literal that looks like an expression cannot reach RoutingNode (the validator rejects it; the generator asserts)
expect(() => buildRequest(versionWithUrl('=/x'), p)).toThrow(UnexpectedError);
```

Review Focus 1:

```ts
it('encodes URL input values so that they cannot change the path or the host', () => {
	// evaluate req.url with $parameter.invoiceId = '../../admin?x=1#y' through the workflow expression engine
	expect(resolved).toBe('/invoices/..%2F..%2Fadmin%3Fx%3D1%23y');
});
```

- [ ] **Step 2: Run to fail.** - [ ] **Step 3: Implement.** Port from the demo generator. Remove `fixedData`, the `{{ $parameter.x }}` placeholder syntax, per-version auth, and the `customDefinition` marker. - [ ] **Step 4: Run to pass.**
- [ ] **Step 5: Commit.** `feat(core): Generate node descriptions for custom nodes (no-changelog)`

### Task 8: Credential restrictions for user-defined endpoints

This task changes files of `@n8n-io/core-execution`. It is its own pull request. Get their agreement on the property name before you open it.

**Files:**
- Modify: `packages/workflow/src/interfaces.ts` (`INodeTypeDescription`)
- Modify: `packages/core/src/execution-engine/routing-node.ts` (base URL ownership block, about line 247)
- Test: `packages/core/src/execution-engine/__tests__/routing-node.test.ts` (`describe('credential allowedDomains')`, about line 2779)

**Interfaces:**
- Produces: `INodeTypeDescription.userDefinedEndpoint?: true`. Comment: "The endpoint of this node comes from a definition that a user wrote, not from the node author. Domain restrictions of a credential apply without additions."

- [ ] **Step 1: Write a characterization test** that shows today's behavior for a description with `requestDefaults.baseURL` and a credential in mode `none`: the request is sent. Keep it.
- [ ] **Step 2: Write the failing tests** (same fixture plus `userDefinedEndpoint: true`)

```ts
it('blocks a credential in mode "none"', async () => { await expect(run()).rejects.toThrow(/configured to prevent use/); });
it('applies the allowed-domains list without the endpoint host', async () => { /* list 'api.other.test' → request options carry allowedDomains 'api.other.test' exactly */ });
it('sends the request when the host is in the list', async () => {});
it('does not restrict a credential in mode "all"', async () => {});
```

- [ ] **Step 3: Implement.** `const baseUrlIsNodeOwned = nodeType.description.userDefinedEndpoint !== true && toHostname(targetUrl) === ownHost;`
- [ ] **Step 4: Run to pass,** then the whole file: `pnpm test src/execution-engine/__tests__/routing-node.test.ts` in `packages/core`. Expected: no other test changes.
- [ ] **Step 5: Commit.** `feat(core): Keep credential domain restrictions for user-defined endpoints (no-changelog)`

### Task 9: Node loader and registry refresh

**Files:**
- Create: `packages/cli/src/modules/custom-nodes/custom-nodes-node-loader.ts`
- Create: `packages/cli/src/modules/custom-nodes/custom-nodes.registry.ts`
- Modify: `custom-nodes.module.ts` (`nodeLoaders()`, `init()`)
- Modify: `packages/@n8n/decorators/src/pubsub/pubsub.event-map.ts` (add `'reload-custom-nodes': never`) and every other non-test source file that lists `reload-mcp-registry`
- Test: `__tests__/custom-nodes-node-loader.test.ts`, `__tests__/custom-nodes.registry.test.ts`
- Reference: `packages/cli/src/modules/mcp-registry/mcp-registry-node-loader.ts` and `registry/mcp-registry.service.ts`

**Interfaces:**
- Consumes: `generateCustomNodeDescription` (Task 7), repositories (Task 6), `joinDraft`/stored shapes (Task 5).
- Produces:

```ts
export class CustomNodesNodeLoader implements NodeLoader {
	packageName = CUSTOM_DEFINITIONS_PACKAGE_NAME;
	setDefinitions(definitions: Array<{ node: CustomNodeView; actions: ActionView[] }>): void;
}
@Service()
export class CustomNodesRegistry {
	/** Reads all definitions, rebuilds the loader, and republishes node types. One rebuild at a time. */
	refresh(options: { notifyEditors: boolean; notifyInstances: boolean }): Promise<void>;
}
export const customNodeTypeName = (id: string) => `${CUSTOM_DEFINITIONS_PACKAGE_NAME}.${id}`;
export const customNodeIconPath = (id: string) => `rest/custom-nodes/nodes/${id}/icon`;
```

- [ ] **Step 1: Write the failing tests**

Loader:

```ts
it('serves one description and one known entry for each custom node', async () => {});
it('returns an INodeType without execute, so NodeTypes assigns the RoutingNode execute', async () => { expect(loader.getNode(id).type.execute).toBeUndefined(); });
it('throws UnrecognizedNodeTypeError for an unknown id', () => {});
it('rebuilds types after releaseTypes through ensureTypesLoaded', async () => {});
it('sets iconUrl only for a node with an icon', async () => {});
```

Registry (mock `LoadNodesAndCredentials`, `Push`, `Publisher`, repositories):

```ts
it('calls loadAll, postProcessLoaders, releaseTypes in that order', async () => {});
it('broadcasts nodeDescriptionUpdated only when notifyEditors is true', async () => {});
it('publishes reload-custom-nodes only when notifyInstances is true', async () => {});
it('refreshes without notifying instances when it receives reload-custom-nodes', async () => {});
it('runs two concurrent refresh calls one after the other', async () => { /* second loadAll starts after first postProcessLoaders resolves */ });
```

Review Focus 5:

```ts
it('keeps a description object unchanged for a caller that already holds it', async () => {
	const before = loader.getNode(id).type.description;
	const snapshot = structuredClone(before);
	loader.setDefinitions(changed); await loader.loadAll();
	expect(before).toEqual(snapshot); // rebuild creates new objects, it does not mutate
});
```

- [ ] **Step 2: Run to fail.**
- [ ] **Step 3: Implement.** Serialize with `pLimit(1)`, which `packages/cli` already uses for `packageMutex`. `init()` calls `refresh({ notifyEditors: false, notifyInstances: false })`.
- [ ] **Step 4: Run to pass.**
- [ ] **Step 5: Commit.** `feat(core): Serve custom nodes through a node loader (no-changelog)`

### Task 10: Service

**Files:**
- Create: `packages/cli/src/modules/custom-nodes/custom-nodes.service.ts`
- Create: `packages/cli/src/modules/custom-nodes/icon-validator.ts`
- Test: `__tests__/custom-nodes.service.integration.test.ts`, `__tests__/icon-validator.test.ts`

**Interfaces:**
- Consumes: everything above.
- Produces:

```ts
@Service()
export class CustomNodesService {
	list(user: User): Promise<CustomNodeResponse[]>;                                   // customNode:list
	createNode(user: User, dto: CreateCustomNodeDto): Promise<CustomNodeResponse>;     // customNode:create
	updateNode(user: User, id: string, dto: UpdateCustomNodeDto): Promise<CustomNodeResponse>; // customNode:update
	deleteNode(user: User, id: string): Promise<void>;                                 // customNode:delete
	setIcon(user: User, id: string, iconDataUri: string): Promise<void>;               // customNode:update
	getIcon(id: string): Promise<{ mimeType: string; data: Buffer }>;
	addAction(user: User, nodeId: string, dto: SaveCustomActionDto): Promise<CustomActionResponse>; // customNode:update
	saveAction(user: User, actionId: string, dto: SaveCustomActionDto): Promise<{ action: CustomActionResponse; kind: CustomActionEditKind }>; // customNode:update
	rollbackRevision(user: User, actionId: string, version: number, revision: number): Promise<CustomActionResponse>; // customNode:update
	deleteAction(user: User, actionId: string): Promise<void>;                         // customNode:delete
	preview(user: User, draft: CustomActionDraft): { issues: CustomActionDraftIssue[]; properties: INodeProperties[] }; // customNode:list
}
export function validateIcon(iconDataUri: string): { mimeType: 'image/png' | 'image/svg+xml'; data: Buffer }; // throws UserError
```

Rules:
- Each method checks its scope with `hasGlobalScope(user, scope)` and throws `ForbiddenError` if it fails. The controller checks again with `@GlobalScope`.
- Each write runs in one `TransactionRunner.run({}, …)` and then calls `registry.refresh({ notifyEditors: true, notifyInstances: true })`.
- `saveAction` validates the draft, loads the newest version, calls `classifyEdit`, and then: `none` writes nothing; `cosmetic` updates meta and inputs in place; `revision` appends a revision; `version` appends a version with revision 1.
- `updateNode` with a new `baseUrl` appends the old value to `baseUrlHistory`. `auth` cannot change.
- `deleteAction` refuses to delete the last action of a custom node (`UserError`).
- `validateIcon`: decoded size ≤ 256 KiB. For SVG, reject content that matches `<script`, `<foreignObject`, `javascript:`, or an attribute that starts with `on` (case-insensitive). No sanitizer dependency.

- [ ] **Step 1: Write the failing tests**

```ts
it('creates a node with its actions and returns nodeType n8n-custom.<id>', async () => {});
it('throws InvalidCustomActionError with issues and writes nothing for an invalid draft', async () => {});
it('throws ForbiddenError for a member on every write method', async () => {});
it('lets a member list', async () => {});
it('returns kind "none" and adds no row for an unchanged draft', async () => {});
it('edits display names in place for a cosmetic change', async () => { /* newestVersion stays 1, revisionCount stays 1 */ });
it('appends a revision for a request change', async () => { /* newestVersion 1, currentRevision 2 */ });
it('appends a version for an input change and keeps version 1 readable', async () => { /* newestVersion 2; versions has length 2 */ });
it('rolls back to an earlier revision', async () => { /* currentRevision 1 after rollback; revisionCount still 2 */ });
it('rejects a rollback to a revision that does not exist', async () => {});
it('records the old base URL in the history', async () => {});
it('refuses to delete the last action of a node', async () => {});
it('refreshes the registry once after each write', async () => {});
```

Review Focus 2:

```ts
it('gives two concurrent version edits the numbers 2 and 3', async () => {
	const [a, b] = await Promise.allSettled([svc.saveAction(owner, id, editA), svc.saveAction(owner, id, editB)]);
	// both fulfilled with versions {2,3}, or one rejected with a conflict UserError; never two rows with the same version
});
```

Icon validator: accepts a PNG and a plain SVG; rejects 257 KiB; rejects `<script>`, `onload=`, `href="javascript:…"`, `<foreignObject>`.

- [ ] **Step 2: Run to fail.** - [ ] **Step 3: Implement.** - [ ] **Step 4: Run to pass.**
- [ ] **Step 5: Commit.** `feat(core): Add custom nodes service with versioned actions (no-changelog)`

### Task 11: Controller

Use the `n8n:protect-endpoints` skill.

**Files:**
- Create: `packages/cli/src/modules/custom-nodes/custom-nodes.controller.ts`
- Modify: `custom-nodes.module.ts` (`init()` imports the controller)
- Modify: `packages/cli/src/auth/auth.service.ts` (`skipBrowserIdCheckEndpoints`: `/${restEndpoint}/custom-nodes/nodes/:id/icon`)
- Test: `__tests__/custom-nodes.controller.integration.test.ts` (pattern: `packages/cli/src/modules/community-packages/__tests__/community-packages.integration.test.ts`)

**Routes** (base `/custom-nodes`):

| Method and path | Scope | Service method |
| --- | --- | --- |
| `GET /` | `customNode:list` | `list` |
| `POST /preview` | `customNode:list` | `preview` |
| `POST /nodes` | `customNode:create` | `createNode` |
| `PATCH /nodes/:id` | `customNode:update` | `updateNode` |
| `DELETE /nodes/:id` | `customNode:delete` | `deleteNode` |
| `PUT /nodes/:id/icon` | `customNode:update` | `setIcon` |
| `GET /nodes/:id/icon` | `customNode:list` | `getIcon` |
| `POST /nodes/:id/actions` | `customNode:update` | `addAction` |
| `PATCH /actions/:id` | `customNode:update` | `saveAction` |
| `POST /actions/:id/versions/:version/rollback` | `customNode:update` | `rollbackRevision` |
| `DELETE /actions/:id` | `customNode:delete` | `deleteAction` |

The icon response sets `Content-Type` from the stored value, `X-Content-Type-Options: nosniff`, `Content-Security-Policy: default-src 'none'; style-src 'unsafe-inline'; sandbox`, and `Cache-Control: private, no-cache`. `InvalidCustomActionError` becomes a 400 whose body carries `issues`.

- [ ] **Step 1: Write the failing tests**

```ts
it.each(writeRoutes)('%s returns 403 for a member', async (method, path, body) => {});
it('GET / returns 200 for a member', async () => {});
it('returns 404 for every route when the module is not enabled', async () => {});
it('POST /nodes returns 400 with issues for a draft with an expression', async () => { expect(res.body.issues[0].code).toBe('expression_not_allowed'); });
it('serves an icon with nosniff and a sandbox CSP, without a browser-id header', async () => {});
```

Review Focus 4:

```ts
it.each(['<svg><script>alert(1)</script></svg>', '<svg onload="x()"></svg>', '<svg><a href="javascript:x()"/></svg>'])(
	'PUT /nodes/:id/icon rejects %s with 400', async (svg) => {});
```

- [ ] **Step 2: Run to fail.** - [ ] **Step 3: Implement.** - [ ] **Step 4: Run to pass.**
- [ ] **Step 5: Run `/security-review`** on the module. Fix or record each finding.
- [ ] **Step 6: Commit.** `feat(core): Add custom nodes REST API (no-changelog)`

### Task 12: Execution proof and close-out

**Files:**
- Test: `packages/cli/src/modules/custom-nodes/__tests__/custom-nodes.execution.test.ts`
- Modify: the spec (tick section 12 stack items 1 to 4; record deviations)

- [ ] **Step 1: Write the failing test.** Build the execute context the same way `describe('credential allowedDomains')` in `routing-node.test.ts` does. Generate the description with `generateCustomNodeDescription` for the fixture of Task 7. Mock HTTP with nock.

```ts
it('sends GET /api/invoices/inv_1?expand=customer&include_lines=true with the header credential', async () => {
	// nock('https://billing.acme.test').get('/api/invoices/inv_1').query({ expand: 'customer', include_lines: 'true' }).matchHeader('X-Api-Key', 'k').reply(200, { id: 'inv_1' })
	expect(result[0][0].json).toEqual({ id: 'inv_1' });
});
it('sends a JSON body with nested keys for Create Invoice version 2', async () => {});
it('runs version 1 for a node pinned to version 1 after version 2 exists', async () => {});
```

- [ ] **Step 2: Run to fail, fix, run to pass.**
- [ ] **Step 3: Check a real instance.** `N8N_ENABLED_MODULES=custom-nodes pnpm start`. Create the Open-Meteo node of the demo seed through `POST /rest/custom-nodes/nodes`. Add it to a workflow in the editor and execute it. Expected: a live weather response. Start a second time without the env variable. Expected: `GET /rest/custom-nodes` returns 404 and the node type is unknown.
- [ ] **Step 4: Full checks.** In `packages/cli`, `packages/core`, `packages/workflow`, `packages/@n8n/api-types`, `packages/@n8n/permissions`: `pnpm typecheck` and `pnpm lint`. Expected: no new errors against the baseline of Task 0.
- [ ] **Step 5: Update the spec** with what changed during the work. Commit: `docs: Update custom nodes spec after backend foundation (no-changelog)`.

---

## Next plans

Write each one when the plan before it is done, because each depends on decisions made there.

| Plan | Content | Depends on |
| --- | --- | --- |
| 2: Custom actions in parent nodes | Provider hook in the three lookup paths of `NodeTypes`, post-processor order, parameter prefix, missing-definition error, tool variants stay unchanged, `POST /custom-nodes/actions` with `parentNodeType` | Task 1 decision; agreement of `@n8n-io/core-application` |
| 3: Frontend | Frontend module, settings page, wizard, canvas entry points, upgrade notice | Plan 2; the editor findings of Task 1 |
| 4: Usage and rollout | Dependency index type, version usage view, delete guard, telemetry, docs, preview branch with default-on commit and demo seed, Playwright test | Plans 2 and 3 |
