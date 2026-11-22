# Custom Nodes and Actions, Plan 2: Custom Actions in Parent Nodes

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** An administrator can add a custom action to an existing node (for example Stripe) through the REST API. The action is in the served description of that node and a workflow can execute it with the credential of that node, on every instance type, with the module off by default.

**Architecture:** `NodeTypes` gets one optional provider and asks it in every lookup path. The module registers a provider that returns a prototype-backed copy of an eligible parent node. The copy has an extended description and an `execute` that sends a custom action to `RoutingNode` and every other operation to the original `execute`. A post-processor of `LoadNodesAndCredentials` applies the same extension to the served types before other services read them.

**Tech Stack:** TypeScript, zod (`@n8n/api-types`), `@n8n/di`, Vitest, nock. No database change: the column `custom_action.parentNodeType` exists.

**Spec:** `.agents/specs/2026-11-22-custom-nodes-and-actions-design.md`. Read sections 5.1, 5.3, 6, 8, 9 and 18 before any task.

**Scope of this plan:** Pull request 5 of the spec's stack, in two parts: the extension points in `packages/cli` (Task 1), and the module code (Tasks 2 to 6). The frontend is Plan 3. The usage view, the delete guard, telemetry and the preview branch are Plan 4.

**Test cases:** `AGENTS.md` requires that the user confirms test cases before they are written. Jason's approval of this plan is that confirmation for the tests listed here. Ask before adding a test group that this plan does not name.

## Global Constraints

- Follow `AGENTS.md`: no `any`; no `as` outside tests; error classes `UserError`, `OperationalError`, `UnexpectedError`; technical text in Simplified Technical English.
- All constraints of Plan 1 stay valid: module `custom-nodes` is not a default module; no n8n expression in a definition; no new dependencies; no demo data; user-facing text says "action".
- **Never mutate a loaded node type or its description.** Every extension is a copy. An extended description is a plain object (spread copies), not a prototype-backed object, because the task runner and the REST API serialize it.
- `packages/cli/src/node-types.ts` and `packages/cli/src/load-nodes-and-credentials.ts` must not import from `packages/cli/src/modules/`. With no registered provider, each changed method returns the same objects as before the change.
- No change in `packages/core`, `packages/workflow`, `packages/nodes-base`, or the frontend.
- Stored values that this plan adds to workflow data. They are permanent after the first release:
  - reserved resource value: `__CUSTOM_ACTION__`, display name `Custom`;
  - parameter prefix of a custom action input in a parent node: `customAction_`;
  - collection of optional inputs in a parent node: `customAction_additionalFields`.
- `version-pin.ts` stays the only code that builds or parses the `operation` value.
- Custom actions are not in the `Tool` and `HitlTool` variants of a parent, in served types and at run time.
- Commits: conventional title with `(no-changelog)`, no attribution lines, author is the local git user. No pushes.
- Run from the package directory: `pnpm test <file> --maxWorkers=1`, `pnpm typecheck`, and lint with `pnpm exec` on the changed files. Build first when a shared package changes: `pnpm build > build.log 2>&1`.
- Use these skills when a task touches their area: `n8n:protect-endpoints` (Task 5), `/security-review` (Task 6).

## Decisions in this plan

These points refine the spec. Task 6 records them in the spec. Jason can change each one before the work starts.

1. **Five lookup paths, not three.** The spec names `getWithSourcePath`, `getByName` and `getByNameAndVersion`. `NodeTypes.getNodeTypeDescriptions` (task runner) also reads the loaded node. It gets the same hook. `getSupportedVersions` needs no change.
2. **Post-processor phases.** `addPostProcessor(fn, { phase })` with the phases `transform` and `consume`. All `transform` processors run first. The default is `consume`, so existing callers do not change.
3. **Eligibility is stricter than `supportsProxyAuth`.** A parent is eligible only if each of its credentials passes the check, not one of them. With one failing credential, a custom action would send a request without authentication when the user selects that credential.
4. **One shape for each node type.** The newest version of a node type decides the shape (`resource` or `operation`). An older version with another shape is not extended. This keeps `pinValues` the same for all nodes of one type.
5. **The URL of a custom action in a parent node is absolute.** The base URL, headers and other request defaults of the parent are not used. The run-time description of the action has `userDefinedEndpoint: true`.
6. **A parent with no action is wrapped at run time.** The wrapper gives the error for a missing definition. The editor shows no empty "Custom" resource. Changed after the final review: every eligible parent also gets the pin skeleton in its served description, so that a stored pin survives (spec section 19).

## Review Focus

1. A built-in operation of a parent node while the module is on. Expected: the original `execute` runs with the same context and returns the same data; no extra request; the loaded node object is unchanged. Tests in Tasks 3 and 4.
2. A custom action with a credential in the mode `none`, or with a domain list without the host of the action. Expected: the request is blocked; the list of the credential owner is never widened. Test in Task 3.
3. A workflow from another instance whose node selects a custom action that does not exist here. Expected: an error that names the action; no request is sent with the credential. Test in Task 3.
4. A reload of definitions while an execution of the same parent node runs. Expected: the running execution keeps the copy it started with; the next lookup gets a new copy. Test in Task 4.
5. A custom action input with the name of a parent parameter, for example `limit` or `customerId`. Expected: the two parameters have different names in the node; neither value replaces the other. Test in Task 2.

---

### Task 0: Prepare the workspace

**Files:** none.

- [ ] **Step 1: Check the branch**

Run from the repository root: `git status --short && git log --oneline -1`.
Expected: branch `custom-nodes-and-actions`, no changes except the untracked `packages/testing/`.

- [ ] **Step 2: Build and record the baseline**

Run: `pnpm build > build.log 2>&1; tail -n 5 build.log`. Expected: `Tasks: N successful, N total`.
Run in `packages/cli`: `pnpm test src/modules/custom-nodes --maxWorkers=1`. Expected: all pass. Record the count.
Run in `packages/cli`: `pnpm test src/__tests__/node-types.test.ts src/__tests__/load-nodes-and-credentials.test.ts --maxWorkers=1`. Expected: all pass. Record the count.

### Task 1: Extension points in `NodeTypes` and `LoadNodesAndCredentials`

This task changes files that `@n8n-io/core-application` owns. Keep the diff small. It can become its own pull request.

**Files:**
- Create: `packages/cli/src/node-type-extension-provider.ts`
- Modify: `packages/cli/src/node-types.ts`
- Modify: `packages/cli/src/load-nodes-and-credentials.ts`
- Test: `packages/cli/src/__tests__/node-types.test.ts`, `packages/cli/src/__tests__/load-nodes-and-credentials.test.ts`

**Interfaces:**
- Produces:

```ts
// node-type-extension-provider.ts
/** Lets a module add to a node type when `NodeTypes` resolves it. A provider never mutates its arguments. */
export interface NodeTypeExtensionProvider {
	/** Returns an extended copy, or `description` itself when the provider adds nothing. */
	extendDescription(nodeTypeName: string, description: INodeTypeDescription): INodeTypeDescription;
	/** Returns an extended copy, or `nodeType` itself when the provider adds nothing. */
	extendNodeType(nodeTypeName: string, nodeType: INodeType): INodeType;
}

// node-types.ts
/** At most one provider. Throws `UnexpectedError` when another provider is already set. `undefined` removes it. */
setExtensionProvider(provider: NodeTypeExtensionProvider | undefined): void;

// load-nodes-and-credentials.ts
export type PostProcessorPhase = 'transform' | 'consume';
/** `transform` processors change `types` and run before all `consume` processors. Default: `consume`. */
addPostProcessor(fn: () => Promise<void>, options?: { phase?: PostProcessorPhase }): void;
/** Now public. No change in behavior. Needs loaded credential types, so call it in a post-processor. */
supportsProxyAuth(description: INodeTypeDescription): boolean;
```

`nodeTypeName` is always the full name, for example `n8n-nodes-base.stripe`.

- [ ] **Step 1: Write the failing tests for `NodeTypes`**

Use a fake provider that adds one marker property to a description and returns `Object.create(nodeType, { description: { value: extended } })` for a node type.

```ts
describe('extension provider', () => {
	it('returns the same objects as before when no provider is set', () => { /* identity for getByName, getByNameAndVersion; deep-equal for getWithSourcePath, getNodeTypeDescriptions */ });
	it('returns the provider result from getByNameAndVersion', () => {});
	it('gives the provider a declarative node type that already has execute', () => { /* provider argument has typeof execute === 'function' */ });
	it('does not call the provider for a Tool variant or a HitlTool variant', () => { /* getByNameAndVersion and getNodeTypeDescriptions; the result has no marker */ });
	it('returns the extended description from getWithSourcePath', () => {});
	it('returns the extended description from getNodeTypeDescriptions for a base node', () => {});
	it('extends a non-versioned node type in getByName', () => {});
	it('extends each version of a versioned node type in getByName and keeps the loaded object unchanged', () => { /* result.getNodeType(v) is the provider result; loaded.getNodeType(v) is the original */ });
	it('rejects a second provider', () => { expect(() => nodeTypes.setExtensionProvider(other)).toThrow(UnexpectedError); });
});
```

- [ ] **Step 2: Run them**

Run in `packages/cli`: `pnpm test src/__tests__/node-types.test.ts --maxWorkers=1`. Expected: the 9 new tests fail, the others pass.

- [ ] **Step 3: Implement in `node-types.ts`**

Add the field, `setExtensionProvider`, and two private methods that every lookup path uses: one for a description and one for `INodeType | IVersionedNodeType`. For a versioned type, the private method returns a prototype-backed copy that overrides `getNodeType`. Call sites:

- `getWithSourcePath`: the description.
- `getByName`: the loaded type.
- `getByNameAndVersion`: the two returns for a node that is not a synthetic tool. Call the provider after the `shouldAssignExecuteMethod` block.
- `getNodeTypeDescriptions`: the branch that is not a synthetic tool.

- [ ] **Step 4: Write the failing tests for `LoadNodesAndCredentials`**

```ts
it('runs transform post-processors before consume post-processors', async () => { /* register consume A, transform B, consume C; order of calls is B, A, C */ });
it('uses the consume phase by default', async () => {});
it('lets a transform post-processor replace an entry of types.nodes before a consume post-processor reads it', async () => {});
```

- [ ] **Step 5: Implement in `load-nodes-and-credentials.ts`**

Store the phase with each post-processor. `rebuildRegistry` runs the `transform` list and then the `consume` list, each in registration order. Change `supportsProxyAuth` from `private` to public and extend its comment with one line.

- [ ] **Step 6: Run and commit**

Run both test files and `pnpm typecheck` in `packages/cli`. Expected: all pass, 0 new type errors.
Commit: `feat(core): Add an extension provider to node type lookups (no-changelog)`.

### Task 2: Description generator for parent nodes

A pure module. It has no I/O and does not know `NodeTypes`.

**Files:**
- Create: `packages/cli/src/modules/custom-nodes/parent-action.generator.ts`
- Modify: `packages/cli/src/modules/custom-nodes/node-description.generator.ts` (parameter naming)
- Create: `packages/cli/src/modules/custom-nodes/__tests__/parent-node.fixture.ts`
- Test: `packages/cli/src/modules/custom-nodes/__tests__/parent-action.generator.test.ts`, `__tests__/node-description.generator.test.ts`

**Interfaces:**
- Consumes: `ActionView`, `buildRequest`, `buildInputProperties` (`node-description.generator.ts`); `operationOptions`, `showFor`, `pinProperties`, `pinValues`, `readPin`, `ActionVersionRef` (`version-pin.ts`); `ServedActionVersions` (`custom-node-type.ts`).
- Produces:

```ts
// node-description.generator.ts
export interface InputNaming {
	/** Node parameter name of a required input. */
	parameterName(inputName: string): string;
	/** Name of the collection that holds the optional inputs. */
	additionalFields: string;
}
export const PLAIN_NAMING: InputNaming; // parameterName is the identity, additionalFields is ADDITIONAL_FIELDS
export function buildInputProperties(version: ActionVersionView, show: NonNullable<IDisplayOptions['show']>, naming?: InputNaming): INodeProperties[];
/** Expression path of an input, for `buildRequest`. Exported now. */
export function paramPathFor(version: ActionVersionView, naming?: InputNaming): (inputName: string) => string;

// parent-action.generator.ts
export const CUSTOM_RESOURCE_VALUE = '__CUSTOM_ACTION__';
export const CUSTOM_RESOURCE_NAME = 'Custom';
export const PARENT_INPUT_PREFIX = 'customAction_';
export const PARENT_NAMING: InputNaming; // prefix + name, 'customAction_additionalFields'
export type ParentShape = 'resource' | 'operation';

/** Structural check of one description. `undefined`: the node cannot be a parent. Does not check credential types. */
export function parentShape(description: INodeTypeDescription): ParentShape | undefined;
/** Description for the editor and for parameter resolution. Returns `description` itself when `actions` is empty. */
export function extendParentDescription(description: INodeTypeDescription, shape: ParentShape, actions: ActionView[]): INodeTypeDescription;
/** Description that `RoutingNode` runs for a custom action. Holds only the custom action properties. */
export function buildParentRuntimeDescription(description: INodeTypeDescription, actions: ActionView[]): INodeTypeDescription;
/** Parameter values that select one version in a parent node. */
export function parentPinValues(shape: ParentShape, ref: ActionVersionRef): Record<string, string>;
/** True when the node parameters select a custom action, also one that does not exist any more. */
export function isCustomActionSelected(shape: ParentShape, parameters: INodeParameters, served: ServedActionVersions): boolean;
```

Rules that the implementation must follow:

- `parentShape` returns a shape only if all of these are true:
  - `group` does not contain `trigger`; `polling` and `webhooks` are not set;
  - `inputs` and `outputs` are arrays with exactly one `main` connection each (this excludes tool variants and nodes with computed connections);
  - `credentials` has one entry or more. With one entry, its `displayOptions` are absent or use only the keys `authentication` and `@version`. With more entries, each has `displayOptions.show.authentication`, no other key in `show`, and no `hide`;
  - no top-level property name starts with `customAction_` or is `customActionId` or `customActionName`;
  - shape `resource`: a top-level property `resource` of the type `options` exists;
  - shape `operation`: no such `resource` property, a top-level property `operation` of the type `options` exists, and `readPin({ operation: value })` is `undefined` for each of its option values.
- Shape `resource`: add the option `{ name: 'Custom', value: '__CUSTOM_ACTION__' }` to each top-level `resource` options property, before an option with the value `__CUSTOM_API_CALL__` if one exists, else at the end. Add one `operation` property with `displayName: 'Action'`, `noDataExpression: true`, `default: ''`, the options of `operationOptions`, and `displayOptions.show.resource = ['__CUSTOM_ACTION__']`. The input properties show for `{ resource: ['__CUSTOM_ACTION__'], ...showFor(id, version) }`.
- Shape `operation`: add the options of `operationOptions` to each top-level `operation` options property, with the same position rule. Do not change the default or other fields of that property. The input properties show for `showFor(id, version)`.
- Both shapes: add `pinProperties` one time. Use `PARENT_NAMING` for input properties and for the request expressions.
- The run-time description has: `displayName`, `name`, `group`, `version`, `description`, `defaults`, `inputs`, `outputs` and `credentials` of the parent; `requestDefaults: { json: true }` with no base URL; `userDefinedEndpoint: true`; one `operation` property whose options carry `routing.request` from `buildRequest`; the input properties with `showFor(id, version)` only.
- `isCustomActionSelected`, shape `resource`: `parameters.resource === '__CUSTOM_ACTION__'`. Shape `operation`: `readPin(parameters)` returns a pin, and the action id is in `served` or is equal to `parameters.customActionId`.
- Copy the changed property objects and their `options` arrays. Share the unchanged property objects with the parent.

- [ ] **Step 1: Write the fixture**

`parent-node.fixture.ts` exports three descriptions with invented names (`Acme Billing`): a programmatic parent with `resource` and `operation` and one credential; a parent with only `operation` and two credentials that the `authentication` parameter selects; a declarative parent with `requestDefaults.baseURL` and a `Custom API Call` option at the end of `resource`. It also exports two actions with absolute URLs on `https://api.acme.test`, one of them with versions 1 and 2.

- [ ] **Step 2: Write the failing tests**

```ts
describe('parentShape', () => {
	it.each([/* resource parent → 'resource'; operation-only parent → 'operation' */])('accepts %s', () => {});
	it.each([/* trigger group; polling; webhooks; two main outputs; ai_tool output; computed inputs string;
		no credentials; credential shown by resource; two credentials without authentication conditions;
		a property named customAction_x; a property named customActionId; no resource and no operation;
		operation of type string; operation-only parent with the option value 'export@2' */])('rejects %s', () => {});
});
describe('extendParentDescription', () => {
	it('returns the same object when there are no actions', () => {});
	it('does not change the parent description', () => { /* deep-freeze the input, then deep-equal with a clone */ });
	it('returns a description that survives JSON serialization unchanged', () => {});
	it('adds the Custom resource before the Custom API Call option', () => {});
	it('adds one Action property for the Custom resource with an empty default', () => {});
	it('appends the actions to the operation of a parent without resource and keeps its default', () => {});
	it('adds the two hidden pin parameters one time', () => {});
	it('gives each input the prefix customAction_ and puts optional inputs in customAction_additionalFields', () => {});
	it('keeps a parent parameter and a custom input of the same name apart', () => { /* parent `limit` without display conditions, input `limit`: getNodeParameters returns both values */ });
	it('shows the inputs of version 1 only to a node that is pinned to version 1', () => { /* NodeHelpers.displayParameter */ });
	it('offers only the newest version to a new node', () => {});
});
describe('buildParentRuntimeDescription', () => {
	it('sets userDefinedEndpoint and has no base URL', () => {});
	it('keeps the credentials of the parent', () => {});
	it('holds only custom action properties, with the parameter names of the extended description', () => {});
	it('puts the absolute URL and the encoded URL inputs in the request of each option', () => {});
});
describe('parentPinValues', () => {
	it('adds the resource value for the shape resource', () => {});
	it('is equal to pinValues for the shape operation', () => {});
});
describe('isCustomActionSelected', () => {
	it.each([/* resource shape: custom resource → true, built-in resource → false;
		operation shape: served pin → true; 'get' → false;
		unknown pin with matching customActionId → true; unknown pin without customActionId → false */])('%s', () => {});
});
```

Add to `node-description.generator.test.ts`: `buildInputProperties` and `paramPathFor` with `PLAIN_NAMING` give the same result as without the argument.

- [ ] **Step 3: Run them**

Run in `packages/cli`: `pnpm test src/modules/custom-nodes/__tests__/parent-action.generator.test.ts --maxWorkers=1`. Expected: fail, the module does not exist.

- [ ] **Step 4: Implement**

First add `InputNaming` to `node-description.generator.ts` with `PLAIN_NAMING` as the default, so that the output for custom nodes does not change. Then write `parent-action.generator.ts`.

- [ ] **Step 5: Run and commit**

Run the two generator test files and `pnpm typecheck`. Expected: all pass. The existing generator tests pass without a change.
Commit: `feat(core): Generate parent node descriptions for custom actions (no-changelog)`.

### Task 3: Run-time node type of a parent

**Files:**
- Create: `packages/cli/src/modules/custom-nodes/parent-node-type.ts`
- Test: `packages/cli/src/modules/custom-nodes/__tests__/parent-actions.execution.test.ts`

**Interfaces:**
- Consumes: Task 2; `assertServedAction`, `ServedActionVersions` (`custom-node-type.ts`); `RoutingNode`, `ExecuteContext` (`n8n-core`).
- Produces:

```ts
export interface ParentExtension {
	shape: ParentShape;
	extendedDescription: INodeTypeDescription;
	runtimeDescription: INodeTypeDescription;
	served: ServedActionVersions;
}
/** Prototype-backed copy of `nodeType`. `nodeType` is not changed. */
export function createParentNodeType(nodeType: INodeType, extension: ParentExtension): INodeType;
```

`execute` of the copy:

1. If `isCustomActionSelected(shape, node.parameters, served)` is false: read `execute` from the original node type now (not when the copy was built), and call it with the same `this`. If the original has no `execute`, throw `UnexpectedError`.
2. Else call `assertServedAction(node, served)`. It throws for no action, an unknown action, and an unknown version.
3. Else return `(await new RoutingNode(this, { description: runtimeDescription }).runNode()) ?? []`.

- [ ] **Step 1: Write the failing tests**

Use the harness of `custom-nodes.execution.test.ts` (real `RoutingNode`, real `ExecuteContext`, nock) and the fixture of Task 2. The workflow's `nodeTypes` returns the copy, as `NodeTypes` does.

```ts
describe('custom action in a programmatic parent', () => {
	it('sends the request of the action with the credential of the parent', async () => {});
	it('runs the original execute for a built-in operation, with the same context, and sends no request', async () => {});
	it('keeps a node on version 1 after version 2 exists', async () => {});
	it('fails with the name of the action when the action does not exist, and sends no request', async () => {});
	it('fails when the Custom resource is selected and no action is selected', async () => {});
	it('does not change the loaded node type', async () => { /* same description object, same own keys, no own execute added by the copy */ });
});
describe('custom action in a declarative parent', () => {
	it('sends a built-in operation to the base URL of the parent', async () => {});
	it('sends a custom action to its own URL without the request defaults of the parent', async () => {});
});
describe('custom action in a parent without resource', () => {
	it('uses the credential that the authentication parameter selects', async () => {});
	it('runs the original execute for a built-in operation value', async () => {});
});
describe('credential domain restrictions', () => {
	it.each([
		['all', undefined, 'sends'],
		['domains', 'api.acme.test', 'sends'],
		['domains', 'other.test', 'blocks'],
		['none', undefined, 'blocks'],
	])('mode %s with list %s %s the request', async () => {});
});
```

- [ ] **Step 2: Run them**

Expected: fail, the module does not exist.

- [ ] **Step 3: Implement `parent-node-type.ts`**

If `RoutingNode` cannot run a description without `requestDefaults.baseURL`, do not change `packages/core`. Stop and report: the fallback is to split the absolute URL into origin (base URL) and path in the generator.

- [ ] **Step 4: Run and commit**

Run the test file and `pnpm typecheck`. Expected: 14 passed.
Commit: `feat(core): Run custom actions in parent nodes (no-changelog)`.

### Task 4: Provider, registry and module wiring

**Files:**
- Create: `packages/cli/src/modules/custom-nodes/parent-actions.provider.ts`
- Modify: `packages/cli/src/modules/custom-nodes/custom-nodes.registry.ts`
- Modify: `packages/cli/src/modules/custom-nodes/custom-nodes.module.ts`
- Test: `__tests__/parent-actions.provider.test.ts`, `__tests__/custom-nodes.registry.test.ts`, `__tests__/custom-nodes.module.test.ts`

**Interfaces:**
- Consumes: Tasks 1 to 3; `LoadNodesAndCredentials.types`, `supportsProxyAuth`.
- Produces:

```ts
@Service()
export class ParentActionsProvider implements NodeTypeExtensionProvider {
	/** Replaces all parent actions and drops every cached copy. Keys are full node type names. */
	setActions(actionsByParent: ReadonlyMap<string, ActionView[]>): void;
	/** Body of the `transform` post-processor. Finds the eligible parents and extends their served descriptions. */
	transformTypes(): void;
	extendDescription(nodeTypeName: string, description: INodeTypeDescription): INodeTypeDescription;
	extendNodeType(nodeTypeName: string, nodeType: INodeType): INodeType;
	/** Shape of an eligible parent on this instance. `undefined`: not eligible or not loaded. */
	shapeOf(nodeTypeName: string): ParentShape | undefined;
	eligibleParents(): Array<{ nodeType: string; shape: ParentShape }>;
}
```

Rules:

- `transformTypes` runs while the credential types are in memory. For each entry of `loadNodesAndCredentials.types.nodes`, the entry is eligible if `parentShape` returns a shape and `supportsProxyAuth({ ...entry, credentials: [credential] })` is true for each credential. For each node type name, the shape of the entry with the highest version is the shape of the node type. An entry with another shape is not eligible.
- The provider stores, for each eligible node type name, the shape and the version keys of its eligible entries. The version key of a description is its `version` values joined with a comma. `extendDescription` and `extendNodeType` use this store, because the credential types can be out of memory when they run.
- `transformTypes` replaces an eligible entry that has actions with `extendParentDescription(...)`. It assigns a new array to `types.nodes`. It keeps the full name of the entry.
- `extendNodeType` wraps each eligible node type, also one with no actions. It caches the copy in a `WeakMap` with the loaded node type as the key. `setActions` and `transformTypes` replace the `WeakMap`.
- `CustomNodesRegistry.refresh` groups the stored actions that have a `parentNodeType`, calls `setActions`, and then calls `postProcessLoaders()` as it does today. The actions of custom nodes do not go to the provider.
- `CustomNodesModule.init` sets the provider on `NodeTypes` and adds the post-processor with `{ phase: 'transform' }` before the first `refresh`.

- [ ] **Step 1: Write the failing tests**

```ts
describe('ParentActionsProvider', () => {
	it('gives the same custom properties in the served types, in extendDescription, and in the run-time copy', () => { /* deep-equal of the three descriptions for one definition */ });
	it('does not extend a node whose credential does not support declarative requests', () => {});
	it('does not extend a node when one of two credentials does not support declarative requests', () => {});
	it('does not extend and does not list a Tool variant', () => {});
	it('leaves the served description of an eligible parent without actions unchanged', () => { /* same object in types.nodes */ });
	it('wraps an eligible parent without actions at run time', () => { /* extendNodeType returns a copy; its description is deep-equal to the original */ });
	it('returns the node type itself for a node that is not eligible', () => {});
	it('extends only the versions that have the shape of the newest version', () => {});
	it('returns the cached copy until the actions change', () => {});
	it('lets a running execution keep its copy after the actions change', () => { /* the first copy still has the old description and still runs the old request */ });
	it('lists the eligible parents with their shape', () => {});
});
```

Add to `custom-nodes.registry.test.ts`: `refresh` passes the parent actions, grouped by node type, before it rebuilds; it does not pass the actions of a custom node. Add to `custom-nodes.module.test.ts`: `init` sets the provider and registers one `transform` post-processor.

- [ ] **Step 2: Run them**

Expected: fail, the provider does not exist.

- [ ] **Step 3: Implement the provider, then the registry and the module changes**

- [ ] **Step 4: Run and commit**

Run the three test files and `pnpm typecheck`. Expected: all pass.
Commit: `feat(core): Serve custom actions in parent nodes (no-changelog)`.

### Task 5: Service and REST API for parent actions

**Files:**
- Modify: `packages/@n8n/api-types/src/schemas/custom-nodes.schema.ts`, `packages/@n8n/api-types/src/dto/custom-nodes/custom-nodes.dto.ts`, the two `index.ts` files that export them
- Modify: `packages/cli/src/modules/custom-nodes/draft-validator.ts`
- Modify: `packages/cli/src/modules/custom-nodes/custom-nodes.service.ts`, `custom-nodes.controller.ts`
- Test: `__tests__/draft-validator.test.ts`, `__tests__/custom-nodes.service.integration.test.ts`, `__tests__/custom-nodes.controller.integration.test.ts`, the schema test in `@n8n/api-types`

**Interfaces:**
- Consumes: `ParentActionsProvider.shapeOf`, `eligibleParents`; `parentPinValues`.
- Produces:

```ts
// @n8n/api-types
export class CreateParentCustomActionDto extends Z.class({
	parentNodeType: z.string().min(1).max(256),
	draft: customActionDraftSchema,
	changeNote: z.string().max(500).optional(),
}) {}
/** A custom action of a parent node. `parentAvailable` is false when the parent is not eligible on this instance. */
export interface ParentCustomActionResponse extends CustomActionResponse { parentAvailable: boolean }
export interface CustomActionParent { nodeType: string; shape: 'resource' | 'operation' }

// draft-validator.ts
export function validateDraft(draft: CustomActionDraft, options?: { absoluteUrl?: boolean }): CustomActionDraftIssue[];
// New issue: path 'request.url', code 'absolute_url_required', message 'The URL of a custom action in a node must be an absolute http or https URL.'

// custom-nodes.service.ts
addParentAction(user: User, dto: CreateParentCustomActionDto): Promise<ParentCustomActionResponse>; // scope customNode:create
listParentActions(user: User): Promise<ParentCustomActionResponse[]>;                                 // scope customNode:list
listParents(user: User): CustomActionParent[];                                                          // scope customNode:list
```

Routes, each with `@GlobalScope`:

| Route | Scope | Result |
| --- | --- | --- |
| `POST /custom-nodes/actions` | `customNode:create` | `ParentCustomActionResponse` |
| `GET /custom-nodes/actions` | `customNode:list` | `ParentCustomActionResponse[]` |
| `GET /custom-nodes/parents` | `customNode:list` | `CustomActionParent[]` |

Rules:

- `addParentAction` rejects a `parentNodeType` for which `shapeOf` is `undefined` with a `UserError`: `Custom actions are not available for the node type "<name>".`
- `addParentAction` and `saveAction` validate the draft of a parent action with `{ absoluteUrl: true }`.
- `pinValues` in a response for a parent action come from `parentPinValues` with the shape of the parent. If the parent is not available, use the shape `operation` and set `parentAvailable: false`.
- `deleteAction` deletes a parent action without the "a custom node needs one action" rule. `saveAction`, `rollbackRevision` and `deleteAction` already work with an action id. The existing routes for them do not change.
- Each write refreshes the registry one time, after the commit.

- [ ] **Step 1: Write the failing tests**

In the integration tests, set the eligibility with `vi.spyOn(provider, 'shapeOf')` and `vi.spyOn(provider, 'eligibleParents')`. Task 4 covers the rules of the provider.

```ts
// draft-validator.test.ts
it('accepts a path that starts with / without the absoluteUrl option', () => {});
it('rejects a path that starts with / with the absoluteUrl option', () => {});
it('accepts an absolute https URL with the absoluteUrl option', () => {});

// custom-nodes.service.integration.test.ts
describe('parent actions', () => {
	it('creates an action for an eligible parent and returns pin values with the resource', async () => {});
	it('returns pin values without a resource for a parent without resource', async () => {});
	it('rejects a node type that is not eligible', async () => {});
	it('rejects a draft with a relative URL', async () => {});
	it('rejects a draft with an expression', async () => {});
	it('rejects a save that makes the URL of a parent action relative', async () => {});
	it('saves a change of the inputs as a new version', async () => {});
	it('deletes the only action of a parent', async () => {});
	it('lists parent actions and marks a parent that is not available', async () => {});
	it('does not list a parent action in the response for custom nodes', async () => {});
	it('refreshes the registry one time for each write', async () => {});
	it('needs the scope customNode:create to create and customNode:list to list', async () => {});
});

// custom-nodes.controller.integration.test.ts
describe('parent action routes', () => {
	it('POST /custom-nodes/actions returns 200 for an owner and 403 for a member', async () => {});
	it('POST /custom-nodes/actions returns 400 with the issues of an invalid draft', async () => {});
	it('POST /custom-nodes/actions returns 400 for a node type that is not eligible', async () => {});
	it('GET /custom-nodes/actions and GET /custom-nodes/parents return 200 for a member', async () => {});
	it('returns 401 without a session for each new route', async () => {});
});
```

Add to `custom-nodes.controller.disabled.integration.test.ts`: the three new routes return 404 when the module is off.

- [ ] **Step 2: Run them**

Expected: fail.

- [ ] **Step 3: Implement**

Build `@n8n/api-types` after the DTO change: `pnpm --filter @n8n/api-types build > build.log 2>&1`. Apply the `n8n:protect-endpoints` skill to the three routes.

- [ ] **Step 4: Run and commit**

Run the changed test files and `pnpm typecheck` in `packages/cli` and in `packages/@n8n/api-types`. Expected: all pass.
Commit: `feat(core): Add REST API for custom actions in parent nodes (no-changelog)`.

### Task 6: Proof through `NodeTypes` and close-out

**Files:**
- Test: `packages/cli/src/modules/custom-nodes/__tests__/parent-actions.node-types.test.ts`
- Modify: `.agents/specs/2026-11-22-custom-nodes-and-actions-design.md`

- [ ] **Step 1: Write the test through the real `NodeTypes` (implementer)**

Build a real `NodeTypes` with a `LoadNodesAndCredentials` test double that serves the fixture parents, and the real `ParentActionsProvider`.

```ts
it('executes a custom action of a node type that getByNameAndVersion returns', async () => {});
it('returns the custom action in the description of POST /node-types (getDescriptionWithTranslation)', async () => {});
it('returns the custom action in getNodeTypeDescriptions', () => {});
it('returns no custom action in the Tool variant and in the HitlTool variant, served and at run time', () => {});
it('returns the loaded node type when the provider is removed', () => {});
```

Run it. Expected: 5 passed.

- [ ] **Step 2: Run all checks (implementer)**

In `packages/cli`: `pnpm test src/modules/custom-nodes src/__tests__/node-types.test.ts src/__tests__/load-nodes-and-credentials.test.ts --maxWorkers=1`, then `pnpm typecheck`, then lint and format the changed files with `pnpm exec`. From the root: `pnpm build > build.log 2>&1`. Expected: all pass. The counts are the baseline of Task 0 plus the new tests.
Commit: `test(core): Add node type lookup tests for custom actions (no-changelog)`.

- [ ] **Step 3: Check on a real instance (controller)**

Use a new user folder in the workspace and port 5690. Never use `~/.n8n` or port 5678. With `N8N_ENABLED_MODULES=custom-nodes`:

1. `GET /rest/custom-nodes/parents` lists `n8n-nodes-base.stripe` with the shape `resource`, and lists no node type that ends with `Tool`.
2. Create an action for Stripe with an absolute URL on a public test API. `types/nodes.json` has the "Custom" resource in Stripe and not in `stripeTool`.
3. In the editor, a Stripe node with the pin values of the action shows the inputs and runs the request. A Stripe node with a built-in operation shows its usual fields.
4. Add an input. A node on version 1 keeps its fields and runs version 1.
5. Delete the action. The node fails with the error that names the action. No request leaves the instance.
6. Repeat step 2 and 3 with one declarative parent and with one parent without `resource`.
7. Without the module switch: the routes return 404, the Stripe description has no "Custom" resource, and a Stripe node with a built-in operation runs as before.

- [ ] **Step 4: Update the spec (controller)**

Add section 19 "Plan 2 record" with: what exists, the six decisions of this plan, known limits, and findings for Plans 3 and 4. Correct section 5.3 (five paths, phases, eligibility of each credential) and mark item 5 of the pull request stack. Run `git diff --check`.
Commit: `docs: Update custom nodes spec after custom actions in parent nodes (no-changelog)`.

- [ ] **Step 5: Security review (controller)**

Run `/security-review` on the commits of this plan. Fix or record each finding.

## Known limits that this plan accepts

- A credential in the mode `none` cannot run a custom action. The editor sets this mode by default when it creates an OAuth credential or a quick-connect credential. A user of such a credential must allow the host of the action in the credential first. Plan 3 must explain this in the editor.
- A parent parameter that has no display condition stays visible when the "Custom" resource is selected. Changed after the final review: a parent whose required parameter would block the custom selection is not eligible.
- The Instance AI adapter reads loaded nodes without `NodeTypes` in one place. It does not see custom actions.
- A node of a parent that stops being eligible (for example after an upgrade of the node) runs the original `execute`. Corrected after the final review: a declarative or operation-shape parent then sends its own request to its own host (spec section 19).
- The editor does not write the full pin values yet (Plan 3). The instance check of Task 6 sets the parameters through the workflow API or by hand.

## Next plans

| Plan | Content | Depends on |
| --- | --- | --- |
| 3: Frontend | Frontend module, settings page, wizard, canvas entry points, upgrade notice, nodes panel filter for option-level display conditions, full `pinValues` on selection, text for a blocked credential | This plan |
| 4: Usage and rollout | Dependency index type, version usage view, delete guard, telemetry, docs, preview branch with default-on commit and demo seed, Playwright test | Plans 2 and 3 |
