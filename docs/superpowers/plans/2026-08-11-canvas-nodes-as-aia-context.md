# Canvas nodes as AI Assistant chat context — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a user select nodes on the canvas and add them as removable context chips in the Instance AI composer, so the assistant knows exactly which nodes are being discussed.

**Architecture:** A pure builder turns a canvas selection into the backend's `nodes` attachment (partition into connected-component sets, resolve neighbors + group). A bridge in `instanceAi.store.ts` stages the built sets; the composer (`InstanceAiInput.vue`) consumes them into a draft ref alongside typed text. `AttachmentPreview.vue` renders the sets as chips. Canvas entry points (toolbar button, context-menu item, ⌘↵) build+stage and open/focus the composer — directly when already inside the thread view, or via a new localStorage staged-draft primitive when navigating from the standalone editor.

**Tech Stack:** Vue 3 + TypeScript + Pinia, Vitest (`@n8n/vitest-config`), `@n8n/api-types` (zod schemas), `n8n-workflow` traversal utils, `@n8n/design-system` components/tokens, `@n8n/i18n`.

## Global Constraints

- Work in `packages/frontend/editor-ui` unless a file path says otherwise. Run all `pnpm` commands from that dir (`cd packages/frontend/editor-ui`).
- TDD: write the failing test, watch it fail for the right reason, implement minimal code, watch it pass, commit. One phase = one confirmation gate.
- Every phase ends with `pnpm typecheck` and `pnpm lint` clean before it is called done.
- **NEVER `any`.** Use proper types or `unknown` + type guards. `as` only in test code.
- **All user-facing text via i18n** (`@n8n/i18n`) — no hardcoded strings in components.
- **CSS: semantic tokens only** from `@n8n/design-system` (`--spacing--*`, `--color--*`, `--radius`, `--border`), never hardcoded px. Reuse the existing `.resourceChip` styles as the base.
- **`data-testid` is a single value** (no spaces).
- **Base branch:** current `master` (this branch is rebased onto it). The full feature-flag plumbing landed in master via PR #35986 (ADO-5771) — the `CANVAS_NODE_CONTEXT_FLAG` constant, the `N8N_INSTANCE_AI_NODE_CONTEXT_ENABLED` env override, and the posthog `applyEnvOverrides` wiring are all present. Do not re-add any of it.
- **Feature flag** is `CANVAS_NODE_CONTEXT_FLAG` (exported from `@n8n/api-types`, value `'104_canvas_aia_node_context'`), read via `usePostHog().isFeatureEnabled(CANVAS_NODE_CONTEXT_FLAG)`. Every trigger entry point (toolbar button, context-menu item, ⌘↵) MUST gate on it. The backend re-checks the same flag per-user and silently drops the attachment if off, so an ungated trigger would produce chips that vanish server-side.
- **Named constant `SINGLE_SET_NODE_EXPANSION_THRESHOLD = 4`** — define once (Phase 3), never inline the number. Do NOT reuse the legacy `CHIP_BUNDLE_THRESHOLD`.
- **Schema caps:** max 50 sets; max 50 nodes per set. Never emit a payload that violates these.
- **Do NOT touch** the legacy `focus_ai_on_selected` action, `focusedNodes.store.ts`, or `MessageFocusedNodesChips.vue` — different system, reference only.
- **id ↔ name split:** canvas selection + node groups use node **id**; `workflow.connections` uses node **name**. Translate with `getNodeById(id).name`.
- Commit messages: `feat(editor): …` / `test(editor): …`, all with `(no-changelog)` suffix and the `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>` trailer.

---

## Phase 0 — Schema dependency (prerequisite, one task)

The `nodes` attachment schema lives on the backend branch (`ado-5772-implement-backend` / PR #36039), **not master**. Hand-apply it identically so it merges as a no-op when the backend lands.

### Task 0.1: Add the `nodes` attachment schema to `@n8n/api-types`

**Files:**
- Modify: `packages/@n8n/api-types/src/schemas/instance-ai.schema.ts` (insert after `instanceAiAgentAttachmentSchema` / its type export, before `instanceAiResourceAttachmentSchema`)
- Modify: `packages/@n8n/api-types/src/index.ts` (add `InstanceAiNodesAttachment` to the type export list near `InstanceAiResourceAttachment`)
- Test: none (pure schema; validated indirectly in Task 1.7)

**Interfaces:**
- Produces: `instanceAiNodesAttachmentSchema`, type `InstanceAiNodesAttachment` (`{ type: 'nodes'; workflowId: string; sets: NodeSet[] }`), and the extended `instanceAiResourceAttachmentSchema` / `instanceAiAttachmentSchema` discriminated unions now including `'nodes'`.

- [ ] **Step 1: Insert the schema block**

In `instance-ai.schema.ts`, immediately after `export type InstanceAiAgentAttachment = …;`, add — with the leading marker comment so the backend-merge is a clean no-op:

```ts
// ⬇️ Hand-applied from PR #36039 (backend, ADO-5772). Identical to that branch;
// remove this marker once the backend merges to master (the block itself stays).
const instanceAiNodeRefSchema = z.object({
	id: z.string().min(1).max(64),
	name: z.string().max(255).optional(),
});

const instanceAiNodeSetSchema = z.object({
	/** Ordered from the set's input side to its output side. Length 1 = a single loose node; length > 1 = a chain of connected nodes. */
	nodes: z.array(instanceAiNodeRefSchema).min(1).max(50),
	/** The node feeding into this set from outside it, if any (absent when the set starts at a trigger/root). */
	inputNode: instanceAiNodeRefSchema.optional(),
	/** The node this set feeds into from outside it, if any (absent when the set ends at a terminal node). */
	outputNode: instanceAiNodeRefSchema.optional(),
	/**
	 * The canvas group this set belongs to, if any. A group has a single entry/exit
	 * (no islands), so a group's own nodes selected alone always resolve to exactly
	 * one set — no merging/collapsing logic is needed elsewhere for this field.
	 */
	canvasGroupId: z.string().min(1).max(64).optional(),
	/** Paired with canvasGroupId so the model's context and the FE chip agree on the same display name. */
	canvasGroupName: z.string().max(255).optional(),
});

/**
 * A reference to one or more sets of canvas-selected nodes the editor hands off to a
 * message. Carries no bytes — the agent resolves node details via its existing
 * workflow tools; only ids/names travel here.
 */
export const instanceAiNodesAttachmentSchema = z.object({
	type: z.literal('nodes'),
	workflowId: z.string().min(1).max(64),
	sets: z.array(instanceAiNodeSetSchema).min(1).max(50),
});
export type InstanceAiNodesAttachment = z.infer<typeof instanceAiNodesAttachmentSchema>;
```

Then add `instanceAiNodesAttachmentSchema,` as the third member of BOTH the `instanceAiResourceAttachmentSchema` and `instanceAiAttachmentSchema` discriminated unions (after `instanceAiAgentAttachmentSchema`).

- [ ] **Step 2: Export the type**

In `packages/@n8n/api-types/src/index.ts`, add `InstanceAiNodesAttachment` to the existing `export type { … }` block that lists `InstanceAiResourceAttachment` / `InstanceAiAttachment`.

- [ ] **Step 3: Build api-types + typecheck**

Run: `pnpm --filter @n8n/api-types build` then `cd packages/frontend/editor-ui && pnpm typecheck`
Expected: no errors; `InstanceAiNodesAttachment` importable from `@n8n/api-types`.

- [ ] **Step 4: Commit**

```bash
git add packages/@n8n/api-types/src/schemas/instance-ai.schema.ts packages/@n8n/api-types/src/index.ts
git commit -m "feat(api-types): Hand-apply nodes attachment schema pending #36039 (no-changelog)"
```

**🛑 STOP — confirm with human before Phase 1.**

---

## Phase 1 — Pure attachment builder

A framework-free module that turns a selection into a valid `nodes` attachment. Kept pure (no Pinia/Vue) so it is trivially testable and reusable at send-time. The caller (Phase 4) supplies plain data pulled from the workflow document store.

**File structure for the phase:**
- Create `src/features/ai/instanceAi/utils/buildNodesAttachment.ts` — all functions + input types.
- Create `src/features/ai/instanceAi/utils/buildNodesAttachment.test.ts` — all tests.

**Input contract (defined in Step 1 of Task 1.1, consumed by every later task):**

```ts
import type { IConnections } from 'n8n-workflow';
import type { InstanceAiNodesAttachment } from '@n8n/api-types';

/** Minimal node info the builder needs — caller maps canvas nodes to this. */
export interface BuilderNode {
	id: string;
	name: string;
	type: string;
}

/** Plain workflow data the builder reads — no store, no reactivity. */
export interface BuilderWorkflow {
	/** All nodes in the workflow, so ids can be translated to names and back. */
	nodes: BuilderNode[];
	/** `workflow.connections`, keyed by source node NAME. */
	connections: IConnections;
	/** `id -> { id, name }` for canvas groups; empty if none. */
	groupsById: Map<string, { id: string; name: string; nodeIds: string[] }>;
	/** `nodeId -> groupId` reverse index. */
	nodeIdToGroupId: Map<string, string>;
}

/** One partitioned set, in NAME-space, before schema serialization. */
export interface NodeSet {
	/** Node names, ordered input→output. */
	nodeNames: string[];
}

export type NodesAttachmentSet = InstanceAiNodesAttachment['sets'][number];
```

### Task 1.1: `partitionSelectionIntoSets`

**Files:**
- Create: `src/features/ai/instanceAi/utils/buildNodesAttachment.ts`
- Test: `src/features/ai/instanceAi/utils/buildNodesAttachment.test.ts`

**Interfaces:**
- Consumes: `BuilderWorkflow.connections` (name-keyed), the input types above.
- Produces: `partitionSelectionIntoSets(selectedNodeNames: string[], connections: IConnections): NodeSet[]` — connected components using only edges where **both endpoints are selected**; each set's `nodeNames` ordered input→output (BFS from the set member with no *selected* predecessor).

- [ ] **Step 1: Write the failing tests**

```ts
import { describe, it, expect } from 'vitest';
import type { IConnections } from 'n8n-workflow';
import { partitionSelectionIntoSets } from './buildNodesAttachment';

// Helpers: build a name-keyed IConnections for simple main-type chains.
function chain(...pairs: Array<[string, string]>): IConnections {
	const c: IConnections = {};
	for (const [from, to] of pairs) {
		c[from] ??= { main: [[]] };
		(c[from].main[0] ??= []).push({ node: to, type: 'main', index: 0 });
	}
	return c;
}

describe('partitionSelectionIntoSets', () => {
	it('groups a fully-connected selected chain into one ordered set', () => {
		const conns = chain(['A', 'B'], ['B', 'C']);
		const sets = partitionSelectionIntoSets(['A', 'B', 'C'], conns);
		expect(sets).toHaveLength(1);
		expect(sets[0].nodeNames).toEqual(['A', 'B', 'C']);
	});

	it('splits two unconnected selected nodes into two sets', () => {
		const conns = chain(['A', 'X'], ['X', 'B']); // X is NOT selected
		const sets = partitionSelectionIntoSets(['A', 'B'], conns);
		expect(sets).toHaveLength(2);
		expect(sets.map((s) => s.nodeNames).flat().sort()).toEqual(['A', 'B']);
	});

	it('keeps a trigger + terminal in one set when connected through selected nodes', () => {
		const conns = chain(['Trigger', 'Mid'], ['Mid', 'Out']);
		const sets = partitionSelectionIntoSets(['Trigger', 'Mid', 'Out'], conns);
		expect(sets).toHaveLength(1);
		expect(sets[0].nodeNames).toEqual(['Trigger', 'Mid', 'Out']);
	});
});
```

- [ ] **Step 2: Run to verify failure**

Run: `cd packages/frontend/editor-ui && pnpm test buildNodesAttachment -- --run`
Expected: FAIL — `partitionSelectionIntoSets is not a function`.

- [ ] **Step 3: Implement**

In `buildNodesAttachment.ts` (paste the Input-contract types block above first), then:

```ts
import { mapConnectionsByDestination, getChildNodes, getParentNodes } from 'n8n-workflow';

export function partitionSelectionIntoSets(
	selectedNodeNames: string[],
	connections: IConnections,
): NodeSet[] {
	const selected = new Set(selectedNodeNames);
	const byDestination = mapConnectionsByDestination(connections);
	const seen = new Set<string>();
	const sets: NodeSet[] = [];

	// Neighbors within the selection only (both endpoints selected).
	const selectedChildren = (name: string) =>
		getChildNodes(connections, name, 'main', 1).filter((n) => selected.has(n));
	const selectedParents = (name: string) =>
		getParentNodes(byDestination, name, 'main', 1).filter((n) => selected.has(n));

	for (const start of selectedNodeNames) {
		if (seen.has(start)) continue;

		// Collect the connected component (undirected) among selected nodes.
		const component = new Set<string>();
		const stack = [start];
		while (stack.length) {
			const cur = stack.pop() as string;
			if (component.has(cur)) continue;
			component.add(cur);
			for (const n of [...selectedChildren(cur), ...selectedParents(cur)]) {
				if (!component.has(n)) stack.push(n);
			}
		}
		component.forEach((n) => seen.add(n));

		// Order input→output: BFS from members with no selected parent.
		const roots = [...component].filter((n) => selectedParents(n).length === 0);
		const order: string[] = [];
		const queued = new Set<string>();
		const queue = roots.length ? [...roots] : [[...component][0]];
		queue.forEach((n) => queued.add(n));
		while (queue.length) {
			const cur = queue.shift() as string;
			order.push(cur);
			for (const child of selectedChildren(cur)) {
				if (component.has(child) && !queued.has(child)) {
					queued.add(child);
					queue.push(child);
				}
			}
		}
		// Any members unreachable via children (rare non-linear shapes) appended deterministically.
		for (const n of [...component].sort()) if (!order.includes(n)) order.push(n);

		sets.push({ nodeNames: order });
	}

	return sets;
}
```

- [ ] **Step 4: Run to verify pass**

Run: `cd packages/frontend/editor-ui && pnpm test buildNodesAttachment -- --run`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/features/ai/instanceAi/utils/buildNodesAttachment.ts src/features/ai/instanceAi/utils/buildNodesAttachment.test.ts
git commit -m "feat(editor): Add selection-to-sets partitioner for AIA node context (no-changelog)"
```

### Task 1.2: `resolveSetNeighbors`

**Files:**
- Modify: `src/features/ai/instanceAi/utils/buildNodesAttachment.ts`
- Test: `src/features/ai/instanceAi/utils/buildNodesAttachment.test.ts`

**Interfaces:**
- Consumes: a `NodeSet`, `IConnections`.
- Produces: `resolveSetNeighbors(set: NodeSet, connections: IConnections): { inputName?: string; outputName?: string }` — nearest node OUTSIDE the set feeding the set's first node (`inputName`) and fed by the set's last node (`outputName`); `undefined` at workflow edges.

- [ ] **Step 1: Write the failing tests**

```ts
import { resolveSetNeighbors } from './buildNodesAttachment';

describe('resolveSetNeighbors', () => {
	it('finds the external input feeding the set head', () => {
		const conns = chain(['Webhook', 'A'], ['A', 'B']);
		const r = resolveSetNeighbors({ nodeNames: ['A', 'B'] }, conns);
		expect(r.inputName).toBe('Webhook');
		expect(r.outputName).toBeUndefined();
	});

	it('finds the external output the set tail feeds', () => {
		const conns = chain(['A', 'B'], ['B', 'Slack']);
		const r = resolveSetNeighbors({ nodeNames: ['A', 'B'] }, conns);
		expect(r.outputName).toBe('Slack');
	});

	it('returns undefined at both edges when the set spans a whole isolated chain', () => {
		const conns = chain(['A', 'B']);
		const r = resolveSetNeighbors({ nodeNames: ['A', 'B'] }, conns);
		expect(r.inputName).toBeUndefined();
		expect(r.outputName).toBeUndefined();
	});
});
```

- [ ] **Step 2: Run to verify failure**

Run: `cd packages/frontend/editor-ui && pnpm test buildNodesAttachment -- --run`
Expected: FAIL — `resolveSetNeighbors is not a function`.

- [ ] **Step 3: Implement**

```ts
export function resolveSetNeighbors(
	set: NodeSet,
	connections: IConnections,
): { inputName?: string; outputName?: string } {
	const inSet = new Set(set.nodeNames);
	const byDestination = mapConnectionsByDestination(connections);
	const head = set.nodeNames[0];
	const tail = set.nodeNames[set.nodeNames.length - 1];

	const inputName = getParentNodes(byDestination, head, 'main', 1).find((n) => !inSet.has(n));
	const outputName = getChildNodes(connections, tail, 'main', 1).find((n) => !inSet.has(n));

	return { inputName, outputName };
}
```

- [ ] **Step 4: Run to verify pass**

Run: `cd packages/frontend/editor-ui && pnpm test buildNodesAttachment -- --run`
Expected: PASS (6 tests total).

- [ ] **Step 5: Commit**

```bash
git add src/features/ai/instanceAi/utils/buildNodesAttachment.ts src/features/ai/instanceAi/utils/buildNodesAttachment.test.ts
git commit -m "feat(editor): Resolve set input/output neighbors for AIA node context (no-changelog)"
```

### Task 1.3: `resolveSetCanvasGroup`

**Files:**
- Modify: `src/features/ai/instanceAi/utils/buildNodesAttachment.ts`
- Test: `src/features/ai/instanceAi/utils/buildNodesAttachment.test.ts`

**Interfaces:**
- Consumes: a `NodeSet` (names), `BuilderWorkflow` (for id↔name + group maps).
- Produces: `resolveSetCanvasGroup(set: NodeSet, workflow: BuilderWorkflow): { canvasGroupId?: string; canvasGroupName?: string }` — a group only when EVERY node in the set shares the same group; mixed/partial/none → `{}`.

- [ ] **Step 1: Write the failing tests**

```ts
import { resolveSetCanvasGroup } from './buildNodesAttachment';
import type { BuilderWorkflow } from './buildNodesAttachment';

function wf(over: Partial<BuilderWorkflow> = {}): BuilderWorkflow {
	return {
		nodes: [
			{ id: 'n1', name: 'A', type: 't' },
			{ id: 'n2', name: 'B', type: 't' },
			{ id: 'n3', name: 'C', type: 't' },
		],
		connections: {},
		groupsById: new Map(),
		nodeIdToGroupId: new Map(),
		...over,
	};
}

describe('resolveSetCanvasGroup', () => {
	it('returns the group when the whole set shares one', () => {
		const w = wf({
			groupsById: new Map([['g1', { id: 'g1', name: 'My Group 1', nodeIds: ['n1', 'n2'] }]]),
			nodeIdToGroupId: new Map([['n1', 'g1'], ['n2', 'g1']]),
		});
		const r = resolveSetCanvasGroup({ nodeNames: ['A', 'B'] }, w);
		expect(r).toEqual({ canvasGroupId: 'g1', canvasGroupName: 'My Group 1' });
	});

	it('returns {} when the set mixes groups or grouped+ungrouped', () => {
		const w = wf({ nodeIdToGroupId: new Map([['n1', 'g1']]) }); // n2 ungrouped
		expect(resolveSetCanvasGroup({ nodeNames: ['A', 'B'] }, w)).toEqual({});
	});

	it('returns {} when no node in the set is grouped', () => {
		expect(resolveSetCanvasGroup({ nodeNames: ['A', 'B'] }, wf())).toEqual({});
	});
});
```

- [ ] **Step 2: Run to verify failure**

Run: `cd packages/frontend/editor-ui && pnpm test buildNodesAttachment -- --run`
Expected: FAIL — `resolveSetCanvasGroup is not a function`.

- [ ] **Step 3: Implement**

```ts
export function resolveSetCanvasGroup(
	set: NodeSet,
	workflow: BuilderWorkflow,
): { canvasGroupId?: string; canvasGroupName?: string } {
	const nameToId = new Map(workflow.nodes.map((n) => [n.name, n.id]));
	const groupIds = new Set(
		set.nodeNames.map((name) => workflow.nodeIdToGroupId.get(nameToId.get(name) ?? '')),
	);
	if (groupIds.size !== 1) return {};
	const [only] = [...groupIds];
	if (!only) return {}; // the single value is `undefined` → some/all ungrouped
	const group = workflow.groupsById.get(only);
	return group ? { canvasGroupId: group.id, canvasGroupName: group.name } : {};
}
```

- [ ] **Step 4: Run to verify pass**

Run: `cd packages/frontend/editor-ui && pnpm test buildNodesAttachment -- --run`
Expected: PASS (9 tests total).

- [ ] **Step 5: Commit**

```bash
git add src/features/ai/instanceAi/utils/buildNodesAttachment.ts src/features/ai/instanceAi/utils/buildNodesAttachment.test.ts
git commit -m "feat(editor): Resolve whole-set canvas group for AIA node context (no-changelog)"
```

### Task 1.4: `buildNodesAttachment` — compose + serialize + cap + schema-validate

**Files:**
- Modify: `src/features/ai/instanceAi/utils/buildNodesAttachment.ts`
- Test: `src/features/ai/instanceAi/utils/buildNodesAttachment.test.ts`

**Interfaces:**
- Consumes: the three functions above; `instanceAiNodesAttachmentSchema` from `@n8n/api-types`.
- Produces:
  `buildNodesAttachment(workflowId: string, selectedNodeIds: string[], workflow: BuilderWorkflow): { attachment: InstanceAiNodesAttachment; truncated: boolean } | null`
  — `null` when the selection is empty; `truncated: true` when caps were hit. Serializes name-space sets to the id+name schema shape, ordered input→output, with neighbors + group.

- [ ] **Step 1: Write the failing tests**

```ts
import { buildNodesAttachment } from './buildNodesAttachment';
import { instanceAiNodesAttachmentSchema } from '@n8n/api-types';

describe('buildNodesAttachment', () => {
	it('returns null for an empty selection', () => {
		expect(buildNodesAttachment('w1', [], wf())).toBeNull();
	});

	it('builds a schema-valid attachment for a chain + a lone node', () => {
		const w = wf({
			nodes: [
				{ id: 'n1', name: 'A', type: 't' },
				{ id: 'n2', name: 'B', type: 't' },
				{ id: 'n3', name: 'Lone', type: 't' },
				{ id: 'n0', name: 'Webhook', type: 't' },
			],
			connections: chain(['Webhook', 'A'], ['A', 'B']),
		});
		const res = buildNodesAttachment('w1', ['n1', 'n2', 'n3'], w);
		expect(res).not.toBeNull();
		expect(res!.truncated).toBe(false);
		expect(instanceAiNodesAttachmentSchema.safeParse(res!.attachment).success).toBe(true);
		const setA = res!.attachment.sets.find((s) => s.nodes.length === 2)!;
		expect(setA.nodes.map((n) => n.name)).toEqual(['A', 'B']);
		expect(setA.inputNode?.name).toBe('Webhook');
	});

	it('caps at 50 sets and 50 nodes-per-set and flags truncation', () => {
		const nodes = Array.from({ length: 60 }, (_, i) => ({ id: `n${i}`, name: `N${i}`, type: 't' }));
		// 60 lone (unconnected) selected nodes → 60 sets → capped to 50.
		const w = wf({ nodes, connections: {} });
		const res = buildNodesAttachment('w1', nodes.map((n) => n.id), w);
		expect(res!.truncated).toBe(true);
		expect(res!.attachment.sets.length).toBe(50);
		expect(instanceAiNodesAttachmentSchema.safeParse(res!.attachment).success).toBe(true);
	});

	it('a fully-grouped selection resolves to one set carrying the group', () => {
		// Caller passes EXPANDED member ids (n1, n2) — the group-chip case.
		const w = wf({
			nodes: [
				{ id: 'n1', name: 'Extract Fields', type: 't' },
				{ id: 'n2', name: 'Find Slack User', type: 't' },
			],
			connections: chain(['Extract Fields', 'Find Slack User']),
			groupsById: new Map([
				['g1', { id: 'g1', name: 'Prepare ticket', nodeIds: ['n1', 'n2'] }],
			]),
			nodeIdToGroupId: new Map([['n1', 'g1'], ['n2', 'g1']]),
		});
		const res = buildNodesAttachment('w1', ['n1', 'n2'], w);
		expect(res!.attachment.sets).toHaveLength(1);
		expect(res!.attachment.sets[0].canvasGroupId).toBe('g1');
		expect(res!.attachment.sets[0].canvasGroupName).toBe('Prepare ticket');
		expect(instanceAiNodesAttachmentSchema.safeParse(res!.attachment).success).toBe(true);
	});
});
```

- [ ] **Step 2: Run to verify failure**

Run: `cd packages/frontend/editor-ui && pnpm test buildNodesAttachment -- --run`
Expected: FAIL — `buildNodesAttachment is not a function`.

- [ ] **Step 3: Implement**

```ts
import { instanceAiNodesAttachmentSchema, type InstanceAiNodesAttachment } from '@n8n/api-types';

// Schema caps (instanceAiNodeSetSchema / instanceAiNodesAttachmentSchema, #36039).
// The safeParse test in this file is the real drift-guard — no need to poke zod internals.
const MAX_SETS = 50;
const MAX_NODES_PER_SET = 50;

export function buildNodesAttachment(
	workflowId: string,
	selectedNodeIds: string[],
	workflow: BuilderWorkflow,
): { attachment: InstanceAiNodesAttachment; truncated: boolean } | null {
	if (selectedNodeIds.length === 0) return null;

	const idToName = new Map(workflow.nodes.map((n) => [n.id, n.name]));
	const nameToId = new Map(workflow.nodes.map((n) => [n.name, n.id]));
	const selectedNames = selectedNodeIds
		.map((id) => idToName.get(id))
		.filter((n): n is string => Boolean(n));
	if (selectedNames.length === 0) return null;

	let truncated = false;
	let sets = partitionSelectionIntoSets(selectedNames, workflow.connections);

	if (sets.length > MAX_SETS) {
		sets = sets.slice(0, MAX_SETS);
		truncated = true;
	}

	const ref = (name: string) => ({ id: nameToId.get(name) ?? name, name });

	const serialized: InstanceAiNodesAttachment['sets'] = sets.map((set) => {
		let names = set.nodeNames;
		if (names.length > MAX_NODES_PER_SET) {
			names = names.slice(0, MAX_NODES_PER_SET);
			truncated = true;
		}
		const { inputName, outputName } = resolveSetNeighbors({ nodeNames: names }, workflow.connections);
		const group = resolveSetCanvasGroup({ nodeNames: names }, workflow);
		return {
			nodes: names.map(ref),
			...(inputName ? { inputNode: ref(inputName) } : {}),
			...(outputName ? { outputNode: ref(outputName) } : {}),
			...group,
		};
	});

	return { attachment: { type: 'nodes', workflowId, sets: serialized }, truncated };
}
```

- [ ] **Step 4: Run to verify pass**

Run: `cd packages/frontend/editor-ui && pnpm test buildNodesAttachment -- --run`
Expected: PASS (13 tests total).

- [ ] **Step 5: typecheck + lint + commit**

Run: `cd packages/frontend/editor-ui && pnpm typecheck && pnpm lint src/features/ai/instanceAi/utils/buildNodesAttachment.ts`
Expected: clean.

```bash
git add src/features/ai/instanceAi/utils/buildNodesAttachment.ts src/features/ai/instanceAi/utils/buildNodesAttachment.test.ts
git commit -m "feat(editor): Compose+validate+cap nodes attachment builder (no-changelog)"
```

**🛑 STOP — confirm with human before Phase 2.**

---

## Phase 2 — Bridge state + composer draft

Stage built attachments in `instanceAi.store.ts` (append, never replace), and have `InstanceAiInput.vue` consume them into a draft ref without disturbing typed text.

### Task 2.1: Store staging state — `stageNodeSets` / `consumePendingAttachments`

**Files:**
- Modify: `src/features/ai/instanceAi/instanceAi.store.ts` (add refs+functions in the store body; add all three to the returned object near `getRuntime`/`syncThread`)
- Test: `src/features/ai/instanceAi/__tests__/instanceAi.store.pendingAttachments.test.ts`

**Interfaces:**
- Consumes: `InstanceAiNodesAttachment`, `InstanceAiAttachment` from `@n8n/api-types`.
- Produces (added to the store's returned object):
  - `pendingComposerAttachments: Ref<InstanceAiAttachment[]>`
  - `stageNodeSets(workflowId: string, newSets: InstanceAiNodesAttachment['sets']): void` — appends `newSets` to the existing `nodes` attachment for that `workflowId`, or pushes a new one.
  - `consumePendingAttachments(): InstanceAiAttachment[]` — returns and clears.

- [ ] **Step 1: Write the failing tests**

```ts
import { describe, it, expect, beforeEach } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useInstanceAiStore } from '../instanceAi.store';
import type { InstanceAiNodesAttachment } from '@n8n/api-types';

const setsA: InstanceAiNodesAttachment['sets'] = [{ nodes: [{ id: 'n1', name: 'A' }] }];
const setsB: InstanceAiNodesAttachment['sets'] = [{ nodes: [{ id: 'n2', name: 'B' }] }];

describe('instanceAi store — pending composer attachments', () => {
	beforeEach(() => setActivePinia(createPinia()));

	it('stages one nodes attachment and consumes it', () => {
		const store = useInstanceAiStore();
		store.stageNodeSets('w1', setsA);
		const consumed = store.consumePendingAttachments();
		expect(consumed).toHaveLength(1);
		expect(consumed[0]).toMatchObject({ type: 'nodes', workflowId: 'w1', sets: setsA });
	});

	it('APPENDS a second stage for the same workflow, never replaces', () => {
		const store = useInstanceAiStore();
		store.stageNodeSets('w1', setsA);
		store.stageNodeSets('w1', setsB);
		const consumed = store.consumePendingAttachments();
		expect(consumed).toHaveLength(1);
		const nodesAtt = consumed[0];
		expect(nodesAtt.type === 'nodes' && nodesAtt.sets).toEqual([...setsA, ...setsB]);
	});

	it('clears staged state after one consume; next stage starts fresh', () => {
		const store = useInstanceAiStore();
		store.stageNodeSets('w1', setsA);
		store.consumePendingAttachments();
		expect(store.consumePendingAttachments()).toEqual([]);
		store.stageNodeSets('w1', setsB);
		const again = store.consumePendingAttachments();
		expect(again[0].type === 'nodes' && again[0].sets).toEqual(setsB);
	});
});
```

- [ ] **Step 2: Run to verify failure**

Run: `cd packages/frontend/editor-ui && pnpm test instanceAi.store.pendingAttachments -- --run`
Expected: FAIL — `stageNodeSets is not a function`.

- [ ] **Step 3: Implement**

Add near the top imports of `instanceAi.store.ts`:

```ts
import type { InstanceAiAttachment, InstanceAiNodesAttachment } from '@n8n/api-types';
```

Inside the store body (with the other `ref`s):

```ts
// Canvas → composer bridge: sets staged from a canvas selection, waiting for the
// composer to pick them up. Appends across repeated "add to chat" actions.
const pendingComposerAttachments = ref<InstanceAiAttachment[]>([]);

function stageNodeSets(workflowId: string, newSets: InstanceAiNodesAttachment['sets']): void {
	const existing = pendingComposerAttachments.value.find(
		(a): a is InstanceAiNodesAttachment => a.type === 'nodes' && a.workflowId === workflowId,
	);
	if (existing) {
		existing.sets = [...existing.sets, ...newSets];
	} else {
		pendingComposerAttachments.value = [
			...pendingComposerAttachments.value,
			{ type: 'nodes', workflowId, sets: newSets },
		];
	}
}

function consumePendingAttachments(): InstanceAiAttachment[] {
	const staged = pendingComposerAttachments.value;
	pendingComposerAttachments.value = [];
	return staged;
}
```

Add `pendingComposerAttachments,`, `stageNodeSets,`, and `consumePendingAttachments,` to the store's returned object (next to `getRuntime`/`syncThread`).

- [ ] **Step 4: Run to verify pass**

Run: `cd packages/frontend/editor-ui && pnpm test instanceAi.store.pendingAttachments -- --run`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/features/ai/instanceAi/instanceAi.store.ts src/features/ai/instanceAi/__tests__/instanceAi.store.pendingAttachments.test.ts
git commit -m "feat(editor): Add composer attachment staging bridge to instance-ai store (no-changelog)"
```

### Task 2.2: Composer consumes staged attachments into a draft ref, preserving text

**Files:**
- Modify: `src/features/ai/instanceAi/components/InstanceAiInput.vue`
- Test: `src/features/ai/instanceAi/components/__tests__/InstanceAiInput.attachments.test.ts` (create if the `__tests__` folder pattern is absent; otherwise co-locate per existing convention — check sibling test locations first)

**Interfaces:**
- Consumes: store `pendingComposerAttachments` + `consumePendingAttachments()` (Task 2.1).
- Produces:
  - new draft ref `attachedResources = ref<InstanceAiResourceAttachment[]>([])`
  - `resetDraftComposer()` also clears `attachedResources`
  - `handleSubmit` merges `attachedResources` into the emitted `attachments`
  - `canSubmitMessage` counts resources too
  - a `watch` on the store ref consumes staged attachments into `attachedResources` **without touching `inputText`**

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect, beforeEach } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { renderComponent } from '@/__tests__/render'; // use the repo's standard render helper
import InstanceAiInput from '../InstanceAiInput.vue';
import { useInstanceAiStore } from '../../instanceAi.store';

describe('InstanceAiInput — staged node attachments', () => {
	beforeEach(() => setActivePinia(createPinia()));

	it('consumes staged attachments and preserves already-typed text', async () => {
		const { getByTestId, findAllByTestId } = renderComponent(InstanceAiInput, {
			props: { /* minimal required props — mirror an existing InstanceAiInput test */ },
		});
		// User types first.
		const input = getByTestId('chat-input'); // confirm the real testid from ChatInputBase
		await input.setValue?.('my question');
		// Canvas stages sets.
		useInstanceAiStore().stageNodeSets('w1', [{ nodes: [{ id: 'n1', name: 'A' }] }]);
		// Chip appears AND text is intact.
		const chips = await findAllByTestId('attachment-preview-resource');
		expect(chips.length).toBeGreaterThan(0);
		expect((input as HTMLTextAreaElement).value ?? input.textContent).toContain('my question');
	});
});
```

> Implementer note: `InstanceAiInput.vue` has required props and child components (`ChatInputBase`, suggestions). Copy the mounting setup + stubs from the nearest existing `InstanceAiInput` spec rather than inventing props. If none exists, stub `ChatInputBase` to render a `<textarea data-testid="chat-input">` and a `<slot name="attachments" />`.

- [ ] **Step 2: Run to verify failure**

Run: `cd packages/frontend/editor-ui && pnpm test InstanceAiInput.attachments -- --run`
Expected: FAIL — no resource chip rendered (draft ref doesn't exist yet).

- [ ] **Step 3: Implement**

In `InstanceAiInput.vue` `<script setup>`:

```ts
import type { InstanceAiResourceAttachment } from '@n8n/api-types';
import { useInstanceAiStore } from '../instanceAi.store';
// ...
const instanceAiStore = useInstanceAiStore();
const attachedResources = ref<InstanceAiResourceAttachment[]>([]);

// Pick up sets staged from a canvas selection (Phase 2 bridge). Never clears text.
watch(
	() => instanceAiStore.pendingComposerAttachments,
	(pending) => {
		if (pending.length === 0) return;
		const consumed = instanceAiStore.consumePendingAttachments();
		attachedResources.value = [
			...attachedResources.value,
			...consumed.filter((a): a is InstanceAiResourceAttachment => a.type !== 'file'),
		];
	},
	{ deep: true, immediate: true },
);

function removeResource(index: number) {
	attachedResources.value = attachedResources.value.filter((_, i) => i !== index);
}
```

Update `resetDraftComposer`:

```ts
function resetDraftComposer() {
	inputText.value = '';
	attachedFiles.value = [];
	attachedResources.value = [];
}
```

Update `canSubmitMessage` call sites and `handleSubmit` so resources count and are sent:

```ts
async function handleSubmit() {
	const text = inputText.value.trim();
	if (!canSubmitMessage(text, attachedFiles.value.length + attachedResources.value.length)) {
		return;
	}
	const fileAttachments = attachedFiles.value.length
		? (await Promise.all(attachedFiles.value.map(convertFileToBinaryData))).map((b) => ({
				type: 'file' as const,
				data: b.data,
				mimeType: b.mimeType,
				fileName: b.fileName ?? 'unnamed',
			}))
		: [];
	const attachments = [...fileAttachments, ...attachedResources.value];
	submitComposerMessage(text, attachments.length ? attachments : undefined);
}
```

In the template, render resource chips in a **separate block** ABOVE the existing
`attachedFiles` block — a distinct row, NOT merged into the same flex-wrap. This
matters: `attachedFiles` renders as 80px thumbnail cards (`.thumbnailWrapper`),
while node chips are small pills (`.resourceChip`); mixing them in one flex-wrap
row wraps unevenly (big cards next to tiny pills). Two `.attachments` blocks keep
each visual language on its own line. (Phase 3 makes `AttachmentPreview` handle
`nodes`; until then this block renders nothing for node attachments.)

```vue
<!-- Node/resource context pills — their own row, above the file thumbnails. -->
<div v-if="!props.isPlanEditMode && attachedResources.length > 0" :class="$style.attachments">
	<AttachmentPreview
		v-for="(attachment, index) in attachedResources"
		:key="`res-${index}`"
		:attachment="attachment"
		:is-removable="true"
		@remove-resource="removeResource(index)"
	/>
</div>
```

**Chip visual:** node chips reuse the existing `.resourceChip` pill style
(bordered, `--color--foreground--tint-2` bg, `× ` remove) that
`workflow`/`agent` attachments already use — no new visual language. The
bundled (`N nodes ⌄`) and group variants build on that same pill base (caret /
count added), defined in Phase 3.

- [ ] **Step 4: Run to verify pass**

Run: `cd packages/frontend/editor-ui && pnpm test InstanceAiInput.attachments -- --run`
Expected: PASS.

- [ ] **Step 5: typecheck + lint + commit**

Run: `cd packages/frontend/editor-ui && pnpm typecheck && pnpm lint src/features/ai/instanceAi/components/InstanceAiInput.vue`
Expected: clean. (`remove-resource` emit is wired in Phase 3; until then it is a harmless unknown-attr — if lint complains, add the emit stub to `AttachmentPreview` in this task instead.)

```bash
git add src/features/ai/instanceAi/components/InstanceAiInput.vue src/features/ai/instanceAi/components/__tests__/InstanceAiInput.attachments.test.ts
git commit -m "feat(editor): Consume staged node attachments in composer draft (no-changelog)"
```

**🛑 STOP — confirm with human before Phase 3.**

---

## Phase 3 — Chip rendering

Render a `nodes` attachment's sets as chips per the three-kind + granularity rules. This phase assumes the composer already holds staged sets (Phase 2) — no trigger exists yet; component tests mount with a fixture attachment.

**Icon resolution decision (grounded, applies to both draft and history):** the `nodes` schema carries no node `type`, so the per-node **type icon is resolved by node NAME against the current workflow** (`nodeTypesStore.getNodeType(node.type)` after looking the node up by name), exactly as the legacy `MessageFocusedNodesChips` does. When the node isn't found (renamed/deleted, or a different workflow in history) → generic fallback icon. Bundled chips use `icon="layers"`; group chips use `icon="layers"` too (a group reads as one grouped unit). This keeps draft and history identical whenever the workflow is present, and degrades gracefully when it isn't.

**File structure:**
- Create `src/features/ai/instanceAi/components/NodesAttachmentChips.vue` — the whole `nodes`-chip UI (kinds, granularity, expand panel, collapse). Keeping it a sibling (not inline in `AttachmentPreview`) keeps `AttachmentPreview` focused; `AttachmentPreview` delegates to it for `type: 'nodes'`.
- Create `src/features/ai/instanceAi/components/nodesAttachmentChips.constants.ts` — `SINGLE_SET_NODE_EXPANSION_THRESHOLD`.
- Modify `AttachmentPreview.vue` — add a `nodes` branch delegating to `NodesAttachmentChips`, plus a `remove-resource` emit.
- Test `src/features/ai/instanceAi/components/__tests__/NodesAttachmentChips.test.ts`.

### Task 3.1: Constant + `AttachmentPreview` delegation branch

**Files:**
- Create: `src/features/ai/instanceAi/components/nodesAttachmentChips.constants.ts`
- Modify: `src/features/ai/instanceAi/components/AttachmentPreview.vue`
- Test: covered by Task 3.2's component tests (this task is scaffolding for them)

**Interfaces:**
- Produces: `export const SINGLE_SET_NODE_EXPANSION_THRESHOLD = 4;`
- Produces: `AttachmentPreview` now handles `attachment.type === 'nodes'` by rendering `<NodesAttachmentChips>`, and re-emits its `remove-set` / `remove-node` as a single `remove-resource` (the composer removes the whole attachment entry; per-set/per-node mutation is internal to the chips component and surfaced via `update:attachment`).

- [ ] **Step 1: Create the constant file**

```ts
// Per ADO-5770 (N = 4). NOT the legacy CHIP_BUNDLE_THRESHOLD — different semantics:
// this only governs the single-lone-set explode/bundle decision.
export const SINGLE_SET_NODE_EXPANSION_THRESHOLD = 4;
```

- [ ] **Step 2: Add the delegation branch to `AttachmentPreview.vue`**

Add to the `<script setup>`:

```ts
import NodesAttachmentChips from './NodesAttachmentChips.vue';
import type { InstanceAiNodesAttachment } from '@n8n/api-types';

const nodesAttachment = computed(() =>
	props.attachment?.type === 'nodes' ? (props.attachment as InstanceAiNodesAttachment) : undefined,
);
```

Extend the emits:

```ts
const emit = defineEmits<{
	remove: [file: File];
	'remove-resource': [];
	'update:attachment': [attachment: InstanceAiNodesAttachment];
}>();
```

Add as the FIRST branch in the template (before `workflowAttachment`):

```vue
<NodesAttachmentChips
	v-if="nodesAttachment"
	:attachment="nodesAttachment"
	:is-removable="isRemovable ?? false"
	@update:attachment="emit('update:attachment', $event)"
	@remove-all="emit('remove-resource')"
/>
```

- [ ] **Step 3: typecheck**

Run: `cd packages/frontend/editor-ui && pnpm typecheck`
Expected: fails only on missing `NodesAttachmentChips.vue` (created in Task 3.2). That's expected — do NOT commit yet; Task 3.2 completes this.

### Task 3.2: `NodesAttachmentChips.vue` — kinds, granularity, expand, collapse

**Files:**
- Create: `src/features/ai/instanceAi/components/NodesAttachmentChips.vue`
- Test: `src/features/ai/instanceAi/components/__tests__/NodesAttachmentChips.test.ts`

**Interfaces:**
- Consumes: `SINGLE_SET_NODE_EXPANSION_THRESHOLD`, `InstanceAiNodesAttachment`, `nodeTypesStore.getNodeType`, workflow node lookup by name (`useWorkflowDocumentStore` or `nodeTypesStore` — mirror `MessageFocusedNodesChips`).
- Props: `{ attachment: InstanceAiNodesAttachment; isRemovable?: boolean }`.
- Emits: `update:attachment` (after a per-node/per-set removal produces a new attachment), `remove-all` (last chip removed → drop the whole resource).
- Rendering rules (exact):
  - **A set with `canvasGroupId`** → one **group chip**: `icon="layers"` + `canvasGroupName`, `×` removes the set. No caret/list.
  - **Exactly one set, no group, `nodes.length < THRESHOLD`** → one chip **per node** (type icon + truncated name + `×` per node). Removing a node → emit `update:attachment` with that node dropped from the set; if it empties the set and it was the only set → `remove-all`.
  - **Exactly one set, no group, `nodes.length >= THRESHOLD`** → one **bundled** chip: `icon="layers"` + `"{{n}} nodes"` + caret; caret toggles a panel listing node names (stays open until re-click / explicit close — NOT hover). `×` removes the whole set → `remove-all` (it's the only set).
  - **2+ sets** → **one chip per set**: size-1 non-group → named node chip; larger or grouped → bundled/group chip. Never explode. `×` on any set removes that set (`update:attachment` minus the set; last one → `remove-all`).
  - When >N chips render, show a **Collapse/expand** text toggle (mirror the screenshot's `Collapse`), default expanded; collapsed shows a compact summary. Use a local `ref` for expanded state.
- Test ids: `nodes-chip-node` (per-node), `nodes-chip-bundle` (bundled), `nodes-chip-group` (group), `nodes-chip-remove`, `nodes-chip-expand` (caret), `nodes-chip-panel` (list), `nodes-chips-collapse`.
- Helper `truncatedName(name)`: maxLength 20, else `name.substring(0, 19) + '...'` (same convention as legacy, re-implemented, not imported).

- [ ] **Step 1: Write the failing tests**

```ts
import { describe, it, expect, beforeEach } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { renderComponent } from '@/__tests__/render';
import NodesAttachmentChips from '../NodesAttachmentChips.vue';
import type { InstanceAiNodesAttachment } from '@n8n/api-types';

const att = (sets: InstanceAiNodesAttachment['sets']): InstanceAiNodesAttachment => ({
	type: 'nodes',
	workflowId: 'w1',
	sets,
});
const nodeRefs = (...names: string[]) => names.map((name, i) => ({ id: `n${i}`, name }));

describe('NodesAttachmentChips', () => {
	beforeEach(() => setActivePinia(createPinia()));

	it('one set, size 1, no group → single named chip', () => {
		const { getAllByTestId, queryAllByTestId } = renderComponent(NodesAttachmentChips, {
			props: { attachment: att([{ nodes: nodeRefs('A') }]), isRemovable: true },
		});
		expect(getAllByTestId('nodes-chip-node')).toHaveLength(1);
		expect(queryAllByTestId('nodes-chip-bundle')).toHaveLength(0);
	});

	it('one set, size 3 (below threshold) → 3 per-node chips, each removable', () => {
		const { getAllByTestId } = renderComponent(NodesAttachmentChips, {
			props: { attachment: att([{ nodes: nodeRefs('A', 'B', 'C') }]), isRemovable: true },
		});
		expect(getAllByTestId('nodes-chip-node')).toHaveLength(3);
		expect(getAllByTestId('nodes-chip-remove')).toHaveLength(3);
	});

	it('one set, size 4 (>= threshold) → single bundled chip, no per-node chips', () => {
		const { getAllByTestId, queryAllByTestId } = renderComponent(NodesAttachmentChips, {
			props: { attachment: att([{ nodes: nodeRefs('A', 'B', 'C', 'D') }]), isRemovable: true },
		});
		expect(getAllByTestId('nodes-chip-bundle')).toHaveLength(1);
		expect(queryAllByTestId('nodes-chip-node')).toHaveLength(0);
	});

	it('two sets (size 1 + size 2) → exactly two chips, never exploded to 3', () => {
		const { getAllByTestId, queryAllByTestId } = renderComponent(NodesAttachmentChips, {
			props: {
				attachment: att([{ nodes: nodeRefs('A') }, { nodes: nodeRefs('B', 'C') }]),
				isRemovable: true,
			},
		});
		const named = queryAllByTestId('nodes-chip-node').length;
		const bundled = queryAllByTestId('nodes-chip-bundle').length;
		expect(named + bundled).toBe(2);
	});

	it('a grouped set → group chip with the group name and no expand caret', () => {
		const { getByTestId, queryByTestId } = renderComponent(NodesAttachmentChips, {
			props: {
				attachment: att([
					{ nodes: nodeRefs('A', 'B'), canvasGroupId: 'g1', canvasGroupName: 'My Group 1' },
				]),
				isRemovable: true,
			},
		});
		expect(getByTestId('nodes-chip-group').textContent).toContain('My Group 1');
		expect(queryByTestId('nodes-chip-expand')).toBeNull();
	});

	it('removing one per-node chip emits update:attachment without that node', async () => {
		const { getAllByTestId, emitted } = renderComponent(NodesAttachmentChips, {
			props: { attachment: att([{ nodes: nodeRefs('A', 'B', 'C') }]), isRemovable: true },
		});
		await getAllByTestId('nodes-chip-remove')[1].trigger('click'); // remove 'B'
		const events = emitted()['update:attachment'];
		expect(events).toBeTruthy();
		const updated = events[0][0] as InstanceAiNodesAttachment;
		expect(updated.sets[0].nodes.map((n) => n.name)).toEqual(['A', 'C']);
	});

	it('caret opens the node-name panel and it stays open until re-click', async () => {
		const { getByTestId, queryByTestId } = renderComponent(NodesAttachmentChips, {
			props: { attachment: att([{ nodes: nodeRefs('A', 'B', 'C', 'D') }]), isRemovable: true },
		});
		expect(queryByTestId('nodes-chip-panel')).toBeNull();
		await getByTestId('nodes-chip-expand').trigger('click');
		expect(getByTestId('nodes-chip-panel')).toBeTruthy(); // still open (no mouseout close)
		await getByTestId('nodes-chip-expand').trigger('click');
		expect(queryByTestId('nodes-chip-panel')).toBeNull();
	});
});
```

- [ ] **Step 2: Run to verify failure**

Run: `cd packages/frontend/editor-ui && pnpm test NodesAttachmentChips -- --run`
Expected: FAIL — cannot resolve `NodesAttachmentChips.vue`.

- [ ] **Step 3: Implement `NodesAttachmentChips.vue`**

Build the component to satisfy the tests and rules above. Skeleton (fill styling with semantic tokens, reuse `.resourceChip` conventions from `AttachmentPreview`):

```vue
<script setup lang="ts">
import { computed, ref } from 'vue';
import { N8nIcon } from '@n8n/design-system';
import NodeIcon from '@/app/components/NodeIcon.vue';
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';
import { useWorkflowDocumentStore } from '@/app/stores/workflowDocument'; // confirm exact export
import type { InstanceAiNodesAttachment } from '@n8n/api-types';
import { SINGLE_SET_NODE_EXPANSION_THRESHOLD } from './nodesAttachmentChips.constants';

type NodesAttachment = InstanceAiNodesAttachment;
type NodeSet = NodesAttachment['sets'][number];

const props = defineProps<{ attachment: NodesAttachment; isRemovable?: boolean }>();
const emit = defineEmits<{
	'update:attachment': [attachment: NodesAttachment];
	'remove-all': [];
}>();

const nodeTypesStore = useNodeTypesStore();

const setCount = computed(() => props.attachment.sets.length);

// One-set-lone-small → explode per node (unless grouped).
const explodeSingleSet = computed(
	() =>
		setCount.value === 1 &&
		!props.attachment.sets[0].canvasGroupId &&
		props.attachment.sets[0].nodes.length < SINGLE_SET_NODE_EXPANSION_THRESHOLD,
);

function kindOf(set: NodeSet): 'group' | 'bundle' | 'named' {
	if (set.canvasGroupId) return 'group';
	if (setCount.value === 1) {
		return set.nodes.length >= SINGLE_SET_NODE_EXPANSION_THRESHOLD ? 'bundle' : 'named';
	}
	return set.nodes.length > 1 ? 'bundle' : 'named';
}

const truncatedName = (name: string) =>
	name.length <= 20 ? name : `${name.substring(0, 19)}...`;

// icon by node name against the live workflow (see icon-resolution decision).
// getNodeTypeForName(name): look node up by name in the workflow doc store, then
//   nodeTypesStore.getNodeType(node.type); null when not found → fallback icon.

function removeSet(index: number) {
	const sets = props.attachment.sets.filter((_, i) => i !== index);
	if (!sets.length) return emit('remove-all');
	emit('update:attachment', { ...props.attachment, sets });
}

function removeNode(setIndex: number, nodeIndex: number) {
	const set = props.attachment.sets[setIndex];
	const nodes = set.nodes.filter((_, i) => i !== nodeIndex);
	if (!nodes.length) return removeSet(setIndex);
	const sets = props.attachment.sets.map((s, i) => (i === setIndex ? { ...s, nodes } : s));
	emit('update:attachment', { ...props.attachment, sets });
}

const expandedSet = ref<number | null>(null); // which bundled set's panel is open
const isCollapsed = ref(false);
// Neighbors (inputNode/outputNode) are intentionally NOT rendered — they are
// send-time context only.
</script>
```

Template: iterate `attachment.sets`; when `explodeSingleSet`, iterate `sets[0].nodes` rendering `nodes-chip-node` each with `nodes-chip-remove` → `removeNode(0, i)`. Otherwise per set render by `kindOf`: `named` (NodeIcon+name, remove→`removeSet`), `group` (`nodes-chip-group`, layers icon + `canvasGroupName`, remove→`removeSet`, NO caret), `bundle` (`nodes-chip-bundle`, layers icon + `"{{set.nodes.length}} nodes"`, `nodes-chip-expand` caret toggling `expandedSet`, `nodes-chip-panel` listing `set.nodes.map(n => n.name)` when open, remove→`removeSet`). Wrap in a container that shows `nodes-chips-collapse` toggle when the visible chip count is large. All labels via i18n (`instanceAi.nodeContext.*` keys — add to `@n8n/i18n`).

**Chip base style:** every chip kind reuses the existing `.resourceChip` look from `AttachmentPreview.vue` (inline-flex, `var(--border)`, `--color--foreground--tint-2` bg, `--radius`, `--spacing--4xs/2xs` padding, `--font-size--2xs`) — copy those token values, do NOT invent a new visual. Small pill, `× ` remove control, name ellipsis-truncated (`.resourceName` pattern). Bundled adds a caret glyph; group swaps the leading icon for `layers`. This keeps node chips visually identical to the `workflow`/`agent` pills already in the composer.

- [ ] **Step 4: Run to verify pass**

Run: `cd packages/frontend/editor-ui && pnpm test NodesAttachmentChips -- --run`
Expected: PASS (7 tests).

- [ ] **Step 5: Wire `update:attachment` back through the composer**

In `InstanceAiInput.vue`, handle the chip component's updates so removals mutate the draft:

```vue
<AttachmentPreview
	v-for="(attachment, index) in attachedResources"
	:key="`res-${index}`"
	:attachment="attachment"
	:is-removable="true"
	@remove-resource="removeResource(index)"
	@update:attachment="attachedResources[index] = $event"
/>
```

- [ ] **Step 6: Add i18n keys**

In `packages/frontend/@n8n/i18n/src/locales/en.json`, add (adjust to the file's structure/ordering):

```json
"instanceAi.nodeContext.nodesBundle": "{count} nodes",
"instanceAi.nodeContext.collapse": "Collapse",
"instanceAi.nodeContext.expand": "Expand"
```

- [ ] **Step 7: typecheck + lint + commit**

Run: `cd packages/frontend/editor-ui && pnpm typecheck && pnpm lint src/features/ai/instanceAi/components/`
Expected: clean.

```bash
git add src/features/ai/instanceAi/components/ packages/frontend/@n8n/i18n/src/locales/en.json
git commit -m "feat(editor): Render canvas node-context chips (kinds, bundle, group) (no-changelog)"
```

### Task 3.3: History parity — the same attachment renders in a sent message

**Files:**
- Test: `src/features/ai/instanceAi/components/__tests__/InstanceAiMessage.nodesAttachment.test.ts`

**Interfaces:**
- Consumes: `InstanceAiMessage.vue` (already maps `message.attachments` → `AttachmentPreview` with `is-removable="false"`).
- Produces: no new code if it already works — this task is a guard proving draft==history.

- [ ] **Step 1: Write the test**

```ts
import { describe, it, expect, beforeEach } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { renderComponent } from '@/__tests__/render';
import InstanceAiMessage from '../InstanceAiMessage.vue';

describe('InstanceAiMessage — nodes attachment (history)', () => {
	beforeEach(() => setActivePinia(createPinia()));

	it('renders a stored nodes attachment as chips (non-removable)', () => {
		const { getAllByTestId, queryAllByTestId } = renderComponent(InstanceAiMessage, {
			props: {
				message: {
					id: 'm1',
					role: 'user',
					content: 'look at these',
					attachments: [
						{ type: 'nodes', workflowId: 'w1', sets: [{ nodes: [{ id: 'n1', name: 'A' }] }] },
					],
				},
				// mirror required props/stubs from an existing InstanceAiMessage test.
			},
		});
		expect(getAllByTestId('nodes-chip-node').length).toBe(1);
		expect(queryAllByTestId('nodes-chip-remove').length).toBe(0); // not removable in history
	});
});
```

> Implementer note: copy the mounting setup + `thread`/store stubs from the nearest existing `InstanceAiMessage` spec.

- [ ] **Step 2: Run**

Run: `cd packages/frontend/editor-ui && pnpm test InstanceAiMessage.nodesAttachment -- --run`
Expected: PASS. If it fails because `is-removable="false"` still renders a remove control, fix `NodesAttachmentChips` to hide remove controls when `!isRemovable`.

- [ ] **Step 3: Commit**

```bash
git add src/features/ai/instanceAi/components/__tests__/InstanceAiMessage.nodesAttachment.test.ts
git commit -m "test(editor): Guard node-context chips render identically in history (no-changelog)"
```

**🛑 STOP — confirm with human before Phase 4. Settle the middle-node-removal UX here against the running chips before proceeding.**

---

## Phase 4 — Trigger UI + open-pane + staged-draft primitive

Wire the real entry points. Both contexts build the attachment (Phase 1) and stage it (Phase 2); Context A stages into the live composer, Context B stashes across a navigation.

### Task 4.1: Staged-draft localStorage primitive

**Files:**
- Modify: `src/features/ai/instanceAi/composables/useInstanceAiHandoff.ts` (add stash/consume next to the existing `stashPendingFirstMessage`/`consumePendingFirstMessage`)
- Test: `src/features/ai/instanceAi/composables/__tests__/pendingDraftAttachment.test.ts`

**Interfaces:**
- Produces:
  - `stashPendingDraftAttachment(threadId: string, sets: InstanceAiNodesAttachment['sets'], workflowId: string): void`
  - `consumePendingDraftAttachment(threadId: string): InstanceAiNodesAttachment | null` — parses, removes the key, returns `null` when absent/invalid.

- [ ] **Step 1: Write the failing tests**

```ts
import { describe, it, expect } from 'vitest';
import {
	stashPendingDraftAttachment,
	consumePendingDraftAttachment,
} from '../useInstanceAiHandoff';

describe('pending draft attachment stash', () => {
	it('round-trips a multi-set draft and clears after one consume', () => {
		const sets = [{ nodes: [{ id: 'n1', name: 'A' }] }, { nodes: [{ id: 'n2', name: 'B' }] }];
		stashPendingDraftAttachment('t1', sets, 'w1');
		const first = consumePendingDraftAttachment('t1');
		expect(first).toMatchObject({ type: 'nodes', workflowId: 'w1', sets });
		expect(consumePendingDraftAttachment('t1')).toBeNull(); // consumed once
	});

	it('returns null when nothing was stashed', () => {
		expect(consumePendingDraftAttachment('missing')).toBeNull();
	});
});
```

- [ ] **Step 2: Run to verify failure**

Run: `cd packages/frontend/editor-ui && pnpm test pendingDraftAttachment -- --run`
Expected: FAIL — `stashPendingDraftAttachment is not a function`.

- [ ] **Step 3: Implement (mirror the existing stash helpers exactly)**

```ts
import { instanceAiNodesAttachmentSchema, type InstanceAiNodesAttachment } from '@n8n/api-types';
import { jsonParse } from 'n8n-workflow';

const pendingDraftAttachmentKey = (threadId: string) =>
	`n8n-instance-ai-draft-attachment:${threadId}`;

export function stashPendingDraftAttachment(
	threadId: string,
	sets: InstanceAiNodesAttachment['sets'],
	workflowId: string,
): void {
	const attachment: InstanceAiNodesAttachment = { type: 'nodes', workflowId, sets };
	localStorage.setItem(pendingDraftAttachmentKey(threadId), JSON.stringify(attachment));
}

export function consumePendingDraftAttachment(
	threadId: string,
): InstanceAiNodesAttachment | null {
	const raw = localStorage.getItem(pendingDraftAttachmentKey(threadId));
	if (!raw) return null;
	localStorage.removeItem(pendingDraftAttachmentKey(threadId));
	const parsed = instanceAiNodesAttachmentSchema.safeParse(
		jsonParse(raw, { fallbackValue: undefined }),
	);
	return parsed.success ? parsed.data : null;
}
```

- [ ] **Step 4: Run to verify pass** — `pnpm test pendingDraftAttachment -- --run` → PASS (2).

- [ ] **Step 5: Consume on thread mount**

In `InstanceAiThreadView.vue`, where the thread hydrates (near `consumePendingFirstMessage` usage — grep for it), add: after hydration, `const draft = consumePendingDraftAttachment(threadId); if (draft) instanceAiStore.stageNodeSets(draft.workflowId, draft.sets);`. The composer's Phase-2 watcher then picks it up. (Import `useInstanceAiStore` if not already.)

- [ ] **Step 6: typecheck + commit**

Run: `cd packages/frontend/editor-ui && pnpm typecheck`

```bash
git add src/features/ai/instanceAi/composables/useInstanceAiHandoff.ts src/features/ai/instanceAi/InstanceAiThreadView.vue src/features/ai/instanceAi/composables/__tests__/pendingDraftAttachment.test.ts
git commit -m "feat(editor): Add staged-draft attachment stash for AIA node context (no-changelog)"
```

### Task 4.2: `useAddNodesToChat` — the shared entry-point action

**Files:**
- Create: `src/features/ai/instanceAi/composables/useAddNodesToChat.ts`
- Test: `src/features/ai/instanceAi/composables/__tests__/useAddNodesToChat.test.ts`

**Interfaces:**
- Consumes: `buildNodesAttachment` (Phase 1), store `stageNodeSets` (Phase 2), `stashPendingDraftAttachment` (Task 4.1), `useInstanceAiHandoff`, `usePostHog`, `useToast`.
- Produces:
  - `isNodeContextEnabled: ComputedRef<boolean>` — `posthog.isFeatureEnabled(CANVAS_NODE_CONTEXT_FLAG)`.
  - `addSelectedNodesToChat(params: { workflowId: string; selectedNodeIds: string[]; workflow: BuilderWorkflow; isInsideThread: boolean; threadId?: string })` — builds; if `null`, no-op; if `truncated`, toast; then:
    - **Context A** (`isInsideThread`): `stageNodeSets` + open/focus composer (delegated to a callback the thread view provides, or a store flag the view watches — see Step 3).
    - **Context B**: mint/resolve a thread via handoff, `stashPendingDraftAttachment(threadId, sets, workflowId)`, navigate to `INSTANCE_AI_THREAD_VIEW`.

- [ ] **Step 1: Write the failing tests**

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';

// Mock the collaborators so we assert wiring, not their internals.
const stageNodeSets = vi.fn();
const stash = vi.fn();
vi.mock('../../instanceAi.store', () => ({
	useInstanceAiStore: () => ({ stageNodeSets }),
}));
vi.mock('../useInstanceAiHandoff', async (orig) => ({
	...(await orig<object>()),
	stashPendingDraftAttachment: (...a: unknown[]) => stash(...a),
}));

import { useAddNodesToChat } from '../useAddNodesToChat';
import type { BuilderWorkflow } from '../../utils/buildNodesAttachment';

const wf: BuilderWorkflow = {
	nodes: [{ id: 'n1', name: 'A', type: 't' }],
	connections: {},
	groupsById: new Map(),
	nodeIdToGroupId: new Map(),
};

describe('useAddNodesToChat', () => {
	beforeEach(() => {
		setActivePinia(createPinia());
		stageNodeSets.mockClear();
		stash.mockClear();
	});

	it('Context A stages directly, does not stash/navigate', async () => {
		const { addSelectedNodesToChat } = useAddNodesToChat();
		await addSelectedNodesToChat({
			workflowId: 'w1',
			selectedNodeIds: ['n1'],
			workflow: wf,
			isInsideThread: true,
		});
		expect(stageNodeSets).toHaveBeenCalledWith('w1', expect.any(Array));
		expect(stash).not.toHaveBeenCalled();
	});

	it('empty selection is a no-op (nothing staged)', async () => {
		const { addSelectedNodesToChat } = useAddNodesToChat();
		await addSelectedNodesToChat({
			workflowId: 'w1',
			selectedNodeIds: [],
			workflow: wf,
			isInsideThread: true,
		});
		expect(stageNodeSets).not.toHaveBeenCalled();
	});
});
```

- [ ] **Step 2: Run to verify failure** — `pnpm test useAddNodesToChat -- --run` → FAIL (not a function).

- [ ] **Step 3: Implement**

```ts
import { computed } from 'vue';
import { useRouter } from 'vue-router';
import { CANVAS_NODE_CONTEXT_FLAG } from '@n8n/api-types';
import { usePostHog } from '@/app/stores/posthog.store';
import { useToast } from '@n8n/composables/useToast';
import { useI18n } from '@n8n/i18n';
import { useInstanceAiStore } from '../instanceAi.store';
import { useInstanceAiHandoff, stashPendingDraftAttachment } from './useInstanceAiHandoff';
import { INSTANCE_AI_THREAD_VIEW } from '../constants';
import { buildNodesAttachment, type BuilderWorkflow } from '../utils/buildNodesAttachment';

export function useAddNodesToChat() {
	const posthog = usePostHog();
	const store = useInstanceAiStore();
	const handoff = useInstanceAiHandoff();
	const router = useRouter();
	const toast = useToast();
	const i18n = useI18n();

	const isNodeContextEnabled = computed(() => posthog.isFeatureEnabled(CANVAS_NODE_CONTEXT_FLAG));

	async function addSelectedNodesToChat(params: {
		workflowId: string;
		selectedNodeIds: string[];
		workflow: BuilderWorkflow;
		isInsideThread: boolean;
		threadId?: string;
		onStaged?: () => void; // Context A: view supplies focus/un-expand
	}) {
		const built = buildNodesAttachment(params.workflowId, params.selectedNodeIds, params.workflow);
		if (!built) return;
		if (built.truncated) {
			toast.showMessage({
				type: 'warning',
				title: i18n.baseText('instanceAi.nodeContext.truncated.title'),
				message: i18n.baseText('instanceAi.nodeContext.truncated.message'),
			});
		}

		if (params.isInsideThread) {
			store.stageNodeSets(params.workflowId, built.attachment.sets);
			params.onStaged?.();
			return;
		}

		// Context B: open a thread with the draft pre-staged, unsent.
		const threadId = await handoff.openThreadForDraft(); // added to the handoff composable, see note
		if (!threadId) return;
		stashPendingDraftAttachment(threadId, built.attachment.sets, params.workflowId);
		await router.push({ name: INSTANCE_AI_THREAD_VIEW, params: { threadId } });
	}

	return { isNodeContextEnabled, addSelectedNodesToChat };
}
```

> Implementer note — Context B thread creation: `useInstanceAiHandoff` currently only exposes send-immediately paths. Add a thin `openThreadForDraft(): Promise<string | null>` to that composable that mints a thread (reuse `ensurePersonalProjectId` + `syncThread` + `uuidv4`, mirroring the same-tab branch of `startThread` but WITHOUT the `sendMessage` call), and returns the `threadId`. Do not call `sendMessage`. Keep it beside `startThread`.

- [ ] **Step 4: Run to verify pass** — `pnpm test useAddNodesToChat -- --run` → PASS (2).

- [ ] **Step 5: Add i18n keys** for `instanceAi.nodeContext.truncated.title` / `.message` in `en.json`.

- [ ] **Step 6: typecheck + commit**

```bash
git add src/features/ai/instanceAi/composables/useAddNodesToChat.ts src/features/ai/instanceAi/composables/useInstanceAiHandoff.ts src/features/ai/instanceAi/composables/__tests__/useAddNodesToChat.test.ts packages/frontend/@n8n/i18n/src/locales/en.json
git commit -m "feat(editor): Add shared add-nodes-to-chat action for AIA node context (no-changelog)"
```

### Task 4.3: Selection-toolbar button

**Files:**
- Modify: `src/features/workflows/canvas/components/elements/selection/CanvasSelectionToolbar.vue`
- Modify: `src/features/workflows/canvas/components/Canvas.vue` (map a new emit to the shared action; assemble `BuilderWorkflow` from `workflowDocumentStore`)
- Test: `src/features/workflows/canvas/components/elements/selection/__tests__/CanvasSelectionToolbar.nodeContext.test.ts`

**Interfaces:**
- Consumes: `useAddNodesToChat().isNodeContextEnabled`.
- Produces: a new `N8nIconButton` (icon `sparkles`, tooltip "Add N nodes to chat", shortcut ⌘↵) visible when `isNodeContextEnabled && selectedNodeIds.length > 1`; emits `add-nodes-to-chat: [ids: string[]]` consumed by `Canvas.vue`.

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { renderComponent } from '@/__tests__/render';
import CanvasSelectionToolbar from '../CanvasSelectionToolbar.vue';

const isEnabled = { value: true };
vi.mock('@/features/ai/instanceAi/composables/useAddNodesToChat', () => ({
	useAddNodesToChat: () => ({ isNodeContextEnabled: isEnabled, addSelectedNodesToChat: vi.fn() }),
}));

function twoNodes() {
	return [
		{ id: 'n1', type: 'default', position: { x: 0, y: 0 }, data: {} },
		{ id: 'n2', type: 'default', position: { x: 1, y: 0 }, data: {} },
	];
}

describe('CanvasSelectionToolbar — add to chat', () => {
	beforeEach(() => {
		setActivePinia(createPinia());
		isEnabled.value = true;
	});

	it('shows the button when flag on and >1 selected', () => {
		const { queryByTestId } = renderComponent(CanvasSelectionToolbar, {
			props: { selectedNodes: twoNodes() },
		});
		expect(queryByTestId('canvas-selection-toolbar-add-to-chat')).toBeTruthy();
	});

	it('hides the button when the flag is off', () => {
		isEnabled.value = false;
		const { queryByTestId } = renderComponent(CanvasSelectionToolbar, {
			props: { selectedNodes: twoNodes() },
		});
		expect(queryByTestId('canvas-selection-toolbar-add-to-chat')).toBeNull();
	});
});
```

- [ ] **Step 2: Run to verify failure** — `pnpm test CanvasSelectionToolbar.nodeContext -- --run` → FAIL.

- [ ] **Step 3: Implement in `CanvasSelectionToolbar.vue`**

Add to script:

```ts
import { useAddNodesToChat } from '@/features/ai/instanceAi/composables/useAddNodesToChat';
const { isNodeContextEnabled } = useAddNodesToChat();
const ADD_TO_CHAT_SHORTCUT = { metaKey: true, keys: ['Enter'] };
const showAddToChat = computed(() => isNodeContextEnabled.value && selectedNodeIds.value.length > 1);
```

Extend emits with `'add-nodes-to-chat': [ids: string[]]`. Include `showAddToChat` in `isToolbarVisible` (so the toolbar shows even if group/extract are hidden). Add a button after the extract one:

```vue
<KeyboardShortcutTooltip
	v-if="showAddToChat"
	placement="top"
	:label="i18n.baseText('canvas.selection.toolbar.addToChat', { adjustToNumber: selectedNodes.length, interpolate: { count: selectedNodes.length } })"
	:shortcut="ADD_TO_CHAT_SHORTCUT"
>
	<N8nIconButton
		size="small"
		variant="ghost"
		icon="sparkles"
		icon-size="large"
		data-test-id="canvas-selection-toolbar-add-to-chat"
		:aria-label="i18n.baseText('canvas.selection.toolbar.addToChat', { adjustToNumber: selectedNodes.length, interpolate: { count: selectedNodes.length } })"
		@click.stop="emit('add-nodes-to-chat', selectedNodeIds)"
	/>
</KeyboardShortcutTooltip>
```

- [ ] **Step 4: Wire `Canvas.vue`**

Where `<CanvasSelectionToolbar>` is rendered, add `@add-nodes-to-chat="onAddNodesToChat()"` (the handler reads `Canvas.vue`'s own `selectedNodeIdsWithGroupMembers` computed — which already expands groups — so it ignores the emit payload; the emit is just the "clicked" signal). Implement:

```ts
import { useAddNodesToChat } from '@/features/ai/instanceAi/composables/useAddNodesToChat';
import { useEditorContext } from '@/app/composables/useEditorContext';
const { addSelectedNodesToChat } = useAddNodesToChat();
const { instanceAi } = useEditorContext();

function buildBuilderWorkflow() {
	const s = workflowDocumentStore.value;
	return {
		nodes: s.allNodes.map((n) => ({ id: n.id, name: n.name, type: n.type })),
		connections: s.connectionsBySourceNode,
		groupsById: new Map(s.allGroups.map((g) => [g.id, { id: g.id, name: g.name, nodeIds: g.nodeIds }])),
		nodeIdToGroupId: s.nodeIdToGroupId,
	};
}

// Toolbar path: no arg — read Canvas.vue's own group-expanded selection.
// Context-menu path: pass the menu's nodeIds (already real node ids).
async function onAddNodesToChat(ids: string[] = selectedNodeIdsWithGroupMembers.value) {
	await addSelectedNodesToChat({
		workflowId: workflowDocumentStore.value.workflowId, // confirm exact accessor
		selectedNodeIds: ids,
		workflow: buildBuilderWorkflow(),
		isInsideThread: instanceAi.value,
		onStaged: () => instanceAiStore.requestComposerFocus(), // Context A focus (see Notes)
	});
}
```

> Implementer notes:
> - **Group expansion — reuse, don't rebuild.** `Canvas.vue` already has `selectedNodeIdsWithGroupMembers` (≈ line 588) that expands a collapsed group's synthetic node id into its member ids. The toolbar button emits *that* (not raw `selectedNodeIds`), so `onAddNodesToChat` receives real member ids and needs no expansion helper. If the context-menu `nodeIds` ever include a synthetic group-node id, map it through the same computed rather than writing a second helper.
> - **Sub-nodes are NOT auto-included.** The Phase-1 partitioner walks `'main'` connections only, so an AI root's `ai_*` sub-nodes (model/tools) are part of a set only if the user also selected them. This is intended (confirmed) — the agent resolves its own sub-nodes via its tools; the backend prose describes only the selected chain.
> - Confirm the exact `workflowId` accessor on the doc store and the `allNodes`/`allGroups`/`connectionsBySourceNode`/`nodeIdToGroupId` names (verified to exist; double-check casing).

- [ ] **Step 5: Run + typecheck + lint** — `pnpm test CanvasSelectionToolbar.nodeContext -- --run` PASS; `pnpm typecheck`; `pnpm lint` the two files.

- [ ] **Step 6: Commit**

```bash
git add src/features/workflows/canvas/components/elements/selection/CanvasSelectionToolbar.vue src/features/workflows/canvas/components/Canvas.vue src/features/workflows/canvas/components/elements/selection/__tests__/CanvasSelectionToolbar.nodeContext.test.ts packages/frontend/@n8n/i18n/src/locales/en.json
git commit -m "feat(editor): Add selection-toolbar button for AIA node context (no-changelog)"
```

### Task 4.4: Context-menu item (+ ⌘↵ already on the toolbar) + manual verification

**Files:**
- Modify: `src/features/shared/contextMenu/composables/useContextMenuItems.ts` (union + new gated item)
- Modify: `src/features/workflows/canvas/components/Canvas.vue` (`onContextMenuAction` case)
- Test: `src/features/shared/contextMenu/composables/__tests__/useContextMenu.nodeContext.test.ts` (or extend the existing `useContextMenu.test.ts`)

**Interfaces:**
- Consumes: `useAddNodesToChat().isNodeContextEnabled` (or read the flag directly via posthog in the composable, matching how `focusedNodesStore.isFeatureEnabled` is read).
- Produces: new action id `'add_nodes_to_chat'` on the `ContextMenuAction` union; a menu item gated by the flag (NOT by `aiAssistant`/`aiBuilder`; and unlike the legacy item, NOT excluded when `instanceAi` is on — this one is for Instance AI); a `case 'add_nodes_to_chat'` in `onContextMenuAction` calling `onAddNodesToChat(nodeIds)`.
- **Shown for 1 or more selected nodes** (`nodes.length >= 1`) — this is the single-node right-click path (label "Add node to chat"), distinct from the toolbar button which is multi-select only. **Count-aware label** via `adjustToNumber`.

- [ ] **Step 1: Write the failing test**

```ts
// Extend the existing useContextMenu test setup. Assert:
//  - with the flag ON and a SINGLE node selected, an 'add_nodes_to_chat' item is
//    present and its label is the singular "Add node to chat".
//  - with the flag ON and 3 nodes selected, the item is present with the plural
//    "Add 3 nodes to chat".
//  - with the flag OFF, it is absent (any selection size).
//  - the legacy 'focus_ai_on_selected' item's presence is UNCHANGED by our item
//    (do not assert its value beyond "we didn't break it" — mock the same as before).
```

> Implementer note: mirror the mocking already used in `useContextMenu.test.ts` for `usePostHog`/`useEditorContext`. Add a case where `isFeatureEnabled(CANVAS_NODE_CONTEXT_FLAG)` is true, once with a 1-node selection and once with 3.

- [ ] **Step 2: Run to verify failure** — FAIL (no such item).

- [ ] **Step 3: Implement**

In `useContextMenuItems.ts`:
- Add `| 'add_nodes_to_chat'` to the `ContextMenuAction` union (line ~55).
- Read the flag: `const posthog = usePostHog();` (import from `@/app/stores/posthog.store`) and `import { CANVAS_NODE_CONTEXT_FLAG } from '@n8n/api-types';`.
- In the `aiActions` array, add a SEPARATE entry (leave the legacy `focus_ai_on_selected` entry exactly as-is):

```ts
!onlyStickies &&
	nodes.length >= 1 &&
	posthog.isFeatureEnabled(CANVAS_NODE_CONTEXT_FLAG) && {
		id: 'add_nodes_to_chat',
		divided: true,
		// adjustToNumber picks the singular ("Add node to chat") or plural
		// ("Add {count} nodes to chat") form — matches the single-node screenshot.
		label: i18n.baseText('contextMenu.addNodesToChat', { adjustToNumber: nodes.length, interpolate: { count: nodes.length } }),
		shortcut: { metaKey: true, keys: ['Enter'] },
		disabled: isReadOnly.value,
	},
```

In `Canvas.vue` `onContextMenuAction`, add before the closing brace of the `switch`:

```ts
case 'add_nodes_to_chat': {
	void onAddNodesToChat(nodeIds);
	return;
}
```

- [ ] **Step 4: Add i18n key** in `en.json`, using the `adjustToNumber` singular|plural format (like `contextMenu.group`):
  `"contextMenu.addNodesToChat": "Add node to chat | Add {count} nodes to chat"`.
  Also add the toolbar key from Task 4.3 if not yet present:
  `"canvas.selection.toolbar.addToChat": "Add node to chat | Add {count} nodes to chat"`.

- [ ] **Step 5: Run + typecheck + lint** — item test PASS; `pnpm typecheck`; `pnpm lint`.

- [ ] **Step 6: Commit**

```bash
git add src/features/shared/contextMenu/composables/useContextMenuItems.ts src/features/workflows/canvas/components/Canvas.vue src/features/shared/contextMenu/composables/__tests__/useContextMenu.nodeContext.test.ts packages/frontend/@n8n/i18n/src/locales/en.json
git commit -m "feat(editor): Add context-menu entry for AIA node context (no-changelog)"
```

- [ ] **Step 7: Manual end-to-end verification**

Run a local dev stack with the backend branch's changes (or the backend deployed) and the flag on:
1. Inside `/assistant/:threadId`: select 2 connected nodes on the embedded canvas → toolbar button → chips appear in the composer, text preserved → send → chips render in the sent message → reload → chips still render.
2. Select 1 node, then 5 nodes separately → confirm append (not replace) and the granularity rules (per-node vs bundled vs per-set).
3. Select a whole canvas group → single group chip, name-only, no caret.
4. From the standalone editor with AIA closed: context-menu → "Add N nodes to chat" → navigates to a new thread with chips pre-staged, unsent.
5. Over-limit: select >50 nodes → toast shown, valid send.

Record results in the PR description. Full repo `pnpm typecheck && pnpm lint` before opening the PR.

**🛑 End of frontend scope — open the PR (draft) here.**

---

## Notes for the implementer

- **Keep the flag check everywhere the trigger appears.** Toolbar, context menu, and (implicitly) the ⌘↵ path all gate on `CANVAS_NODE_CONTEXT_FLAG`. The backend silently drops the attachment if the user's flag is off, so an ungated trigger would produce chips that vanish server-side.
- **Never render `inputNode`/`outputNode` in chips** — they are send-time-only descriptive context.
- **Do not modify** `focusedNodes.store.ts`, `MessageFocusedNodesChips.vue`, or the legacy `focus_ai_on_selected` action.
- If any accessor name differs from this plan (store methods moved/renamed), trust the code and flag the mismatch before improvising.
- **Context A focus wiring (concrete):** the simplest correct approach is a store flag rather than cross-component refs. In `instanceAi.store.ts` add `const composerFocusRequest = ref(0)` and `function requestComposerFocus() { composerFocusRequest.value++ }` (both returned). `useAddNodesToChat`'s `onStaged` calls `store.requestComposerFocus()`. `InstanceAiThreadView.vue` adds `watch(() => store.composerFocusRequest, () => { isPreviewExpanded.value = false; void nextTick(() => chatInputRef.value?.focus()); })`. This reuses the existing `isPreviewExpanded` ref (already reset this way at lines 452/478) and the exposed `focus()` (called at 277/617) — no new mechanism, no ref threading across feature modules. Fold this into Task 4.2 (store additions) and Task 4.3 Step 4 (thread-view watch).
