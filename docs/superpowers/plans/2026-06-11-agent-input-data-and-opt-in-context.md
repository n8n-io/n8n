# Agent input-data tool + opt-in context + JMESPath retrieval — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give a workflow-invoked agent an always-on `fetch_input_data` tool (scoped by a new per-item/once-for-all node mode), make the existing any-node `fetch_workflow_context` tool opt-in (off by default), and add an optional JMESPath `query` argument to both tools for untrimmed targeted retrieval.

**Architecture:** Extend the `executeAgent` context contract with input items + flags; the node sets them, `BaseExecuteContext` populates the scoped data, and `AgentsService.executeForWorkflow` builds the two tools conditionally. Shared trim/query helpers live in one util module; JMESPath evaluation (with the existing security guard) is exposed from `n8n-workflow`.

**Tech Stack:** TypeScript monorepo (pnpm), `@n8n/agents` Tool SDK, zod, `jmespath` (already a `packages/workflow` dep), Jest (`packages/cli`, `packages/nodes-base`), Vitest (`packages/core`).

**Spec:** `docs/superpowers/specs/2026-06-11-agent-input-data-and-opt-in-context-design.md`

**Design notes / deliberate deviations:**
- The three new fields on `ExecuteAgentWorkflowContext` (`inputData`, `inputDataScope`, `exposeWorkflowData`) are declared **optional** rather than required (spec showed them required). This keeps every existing test fixture compiling and each task independently green; `BaseExecuteContext` always populates them at runtime, and the tools default defensively (`?? []`, `?? 'item'`, `?? false`).
- JMESPath queries run against the **array of item `json` payloads** (`items.map(i => i.json)`), not the raw `INodeExecutionData` wrappers — natural path syntax for the agent (`[0].field`, `[*].field`).
- JMESPath no-match (jmespath returns `null`/`undefined`) is surfaced as a friendly `{ error }` so the agent self-corrects.

**Conventions:** Always pnpm; run package commands via `pushd`/`popd`. No `any` (casts OK in tests). `pnpm typecheck` before committing.

---

### Task 1: Extend the agent context types (`n8n-workflow`)

Pure type change — typecheck is the verification.

**Files:**
- Modify: `packages/workflow/src/interfaces.ts` (`ExecuteAgentInfo` ~line 1998; `ExecuteAgentWorkflowContext` — the interface added in the prior iteration)

- [ ] **Step 1: Extend `ExecuteAgentInfo`**

In `packages/workflow/src/interfaces.ts`, find `ExecuteAgentInfo` and add two optional fields after `outputSchema?: JSONSchema7;` (before the closing `}`):

```typescript
	/**
	 * Which slice of the calling node's input the agent's `fetch_input_data`
	 * tool should expose: the single current item (`'item'`, default) or all
	 * input items (`'all'`, used when the node invokes the agent once for the
	 * whole batch).
	 */
	inputDataScope?: 'item' | 'all';
	/**
	 * When true, the agent additionally gets the `fetch_workflow_context` tool,
	 * which can read any executed node's output. Off by default.
	 */
	exposeWorkflowData?: boolean;
```

- [ ] **Step 2: Extend `ExecuteAgentWorkflowContext`**

Find `ExecuteAgentWorkflowContext` (same file) and add three optional fields after `callingNodeName: string;`:

```typescript
	/** The calling node's input items, already scoped per {@link ExecuteAgentInfo.inputDataScope}. */
	inputData?: INodeExecutionData[];
	/** Which slice {@link inputData} represents. */
	inputDataScope?: 'item' | 'all';
	/** Whether to attach the any-node `fetch_workflow_context` tool. */
	exposeWorkflowData?: boolean;
```

(`INodeExecutionData` is already imported/used in this file.)

- [ ] **Step 3: Typecheck**

Run: `pushd packages/workflow && pnpm typecheck && popd`
Expected: PASS (all new fields optional; no callers break)

- [ ] **Step 4: Build the workflow package** (downstream packages consume dist types)

Run: `pushd packages/workflow && pnpm build > /tmp/build-workflow.log 2>&1; tail -n 5 /tmp/build-workflow.log && popd`
Expected: build succeeds

- [ ] **Step 5: Commit**

```bash
git add packages/workflow/src/interfaces.ts
git commit -m "feat(core): Extend agent context with input data scope and expose flag (no-changelog)"
```

---

### Task 2: JMESPath query helper in `n8n-workflow` (TDD)

**Files:**
- Create: `packages/workflow/src/jmespath-query.ts`
- Modify: `packages/workflow/src/index.ts` (add an export)
- Test: `packages/workflow/test/jmespath-query.test.ts`

Reuses the existing `containsUnsafeObjectPropertyToken` guard (`packages/workflow/src/utils.ts:417`) and the `jmespath` dep already used by `workflow-data-proxy.ts`.

- [ ] **Step 1: Write the failing test**

Create `packages/workflow/test/jmespath-query.test.ts`:

```typescript
import { evaluateJmespathQuery, JmespathQueryError } from '@/jmespath-query';

describe('evaluateJmespathQuery', () => {
	it('selects a nested field from an object', () => {
		expect(evaluateJmespathQuery({ a: { b: 42 } }, 'a.b')).toBe(42);
	});

	it('selects across an array', () => {
		const data = [{ id: 1 }, { id: 2 }, { id: 3 }];
		expect(evaluateJmespathQuery(data, '[*].id')).toEqual([1, 2, 3]);
	});

	it('returns null when nothing matches', () => {
		expect(evaluateJmespathQuery({ a: 1 }, 'b.c')).toBeNull();
	});

	it('throws JmespathQueryError on an unsafe property token', () => {
		expect(() => evaluateJmespathQuery({}, 'foo.__proto__')).toThrow(JmespathQueryError);
	});

	it('throws JmespathQueryError when the query contains a backslash', () => {
		expect(() => evaluateJmespathQuery({}, 'foo\\bar')).toThrow(JmespathQueryError);
	});

	it('throws (parser error) on an invalid query', () => {
		expect(() => evaluateJmespathQuery({ a: 1 }, '[[[')).toThrow();
	});
});
```

(Check how sibling tests import — if `@/` alias isn't configured in `packages/workflow/test`, use a relative import `../src/jmespath-query`. Verify against an existing test file in `packages/workflow/test`.)

- [ ] **Step 2: Run the test to verify it fails**

Run: `pushd packages/workflow && pnpm test jmespath-query 2>&1 | tail -15 && popd`
Expected: FAIL — cannot find module `jmespath-query`

- [ ] **Step 3: Implement**

Create `packages/workflow/src/jmespath-query.ts`:

```typescript
import * as jmespath from 'jmespath';

import { containsUnsafeObjectPropertyToken } from './utils';

/** Thrown when a query is rejected by the property-name security guard. */
export class JmespathQueryError extends Error {}

/**
 * Evaluate a JMESPath query against arbitrary JSON data, applying the same
 * property-name security guard n8n uses for the `$jmespath()` expression
 * helper. Throws `JmespathQueryError` for guarded queries and rethrows
 * jmespath's own parser errors for invalid syntax.
 */
export function evaluateJmespathQuery(data: unknown, query: string): unknown {
	if (query.includes('\\') || containsUnsafeObjectPropertyToken(query)) {
		throw new JmespathQueryError(
			'Cannot access this property in a jmespath query due to security concerns',
		);
	}

	if (data !== null && typeof data === 'object' && !Array.isArray(data)) {
		// Spread strips any proxy wrappers, mirroring workflow-data-proxy.
		return jmespath.search({ ...(data as Record<string, unknown>) }, query);
	}

	return jmespath.search(data as Parameters<typeof jmespath.search>[0], query);
}
```

- [ ] **Step 4: Export from the package index**

In `packages/workflow/src/index.ts`, add near the other top-level re-exports (e.g. after the `export * from './expression'` style lines — match the file's existing pattern):

```typescript
export { evaluateJmespathQuery, JmespathQueryError } from './jmespath-query';
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `pushd packages/workflow && pnpm test jmespath-query 2>&1 | tail -10 && popd`
Expected: PASS (6 tests)

- [ ] **Step 6: Typecheck + build**

Run: `pushd packages/workflow && pnpm typecheck && pnpm build > /tmp/build-workflow.log 2>&1; tail -n 5 /tmp/build-workflow.log && popd`
Expected: PASS + build succeeds

- [ ] **Step 7: Commit**

```bash
git add packages/workflow/src/jmespath-query.ts packages/workflow/src/index.ts packages/workflow/test/jmespath-query.test.ts
git commit -m "feat(core): Add guarded JMESPath query helper to n8n-workflow (no-changelog)"
```

---

### Task 3: Shared `agent-data-utils` + refactor `workflow-context-tool` with query (TDD)

**Files:**
- Create: `packages/cli/src/modules/agents/tools/agent-data-utils.ts`
- Create: `packages/cli/src/modules/agents/tools/__tests__/agent-data-utils.test.ts`
- Modify: `packages/cli/src/modules/agents/tools/workflow-context-tool.ts`
- Modify: `packages/cli/src/modules/agents/tools/__tests__/workflow-context-tool.test.ts`

- [ ] **Step 1: Write the failing test for the shared utils**

Create `packages/cli/src/modules/agents/tools/__tests__/agent-data-utils.test.ts`:

```typescript
import type { INodeExecutionData } from 'n8n-workflow';

import { trimItems, runQuery, MAX_ITEMS, MAX_OUTPUT_CHARS } from '../agent-data-utils';

const item = (json: Record<string, unknown>): INodeExecutionData => ({ json });

describe('trimItems', () => {
	it('returns safe items untruncated when under the caps', () => {
		const { items, truncated } = trimItems([item({ a: 1 }), item({ b: 2 })]);
		expect(items).toEqual([{ json: { a: 1 } }, { json: { b: 2 } }]);
		expect(truncated).toBe(false);
	});

	it('replaces binary with key-name stubs', () => {
		const withBinary: INodeExecutionData = {
			json: { name: 'f' },
			binary: { data: { data: 'AAAA', mimeType: 'application/pdf' } },
		};
		const { items } = trimItems([withBinary]);
		expect(items).toEqual([{ json: { name: 'f' }, binary: ['data'] }]);
	});

	it('caps item count at MAX_ITEMS and flags truncation', () => {
		const many = Array.from({ length: MAX_ITEMS + 15 }, (_, i) => item({ i }));
		const { items, truncated } = trimItems(many);
		expect(items).toHaveLength(MAX_ITEMS);
		expect(truncated).toBe(true);
	});

	it('substitutes a bounded preview when the first item exceeds the size cap', () => {
		const { items, truncated } = trimItems([item({ blob: 'x'.repeat(MAX_OUTPUT_CHARS + 10_000) })]);
		expect(items).toHaveLength(1);
		expect((items[0] as { itemTruncated?: boolean }).itemTruncated).toBe(true);
		expect((items[0] as { jsonPreview?: string }).jsonPreview).toHaveLength(MAX_OUTPUT_CHARS);
		expect(truncated).toBe(true);
	});
});

describe('runQuery', () => {
	it('returns the matched value untruncated when small', () => {
		expect(runQuery([{ id: 1 }, { id: 2 }], '[*].id')).toEqual({ result: [1, 2], truncated: false });
	});

	it('returns an error payload for a no-match query', () => {
		const result = runQuery([{ a: 1 }], '[0].missing') as { error: string };
		expect(result.error).toContain('matched no data');
	});

	it('returns an error payload for an unsafe query', () => {
		const result = runQuery([{ a: 1 }], '[0].__proto__') as { error: string };
		expect(result.error).toContain('Query failed');
	});

	it('truncates an oversized result to a string preview', () => {
		const big = [{ blob: 'y'.repeat(MAX_OUTPUT_CHARS + 10_000) }];
		const result = runQuery(big, '[0].blob') as { result: unknown; truncated: boolean };
		expect(typeof result.result).toBe('string');
		expect((result.result as string).length).toBe(MAX_OUTPUT_CHARS);
		expect(result.truncated).toBe(true);
	});
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `pushd packages/cli && pnpm test modules/agents/tools/__tests__/agent-data-utils.test.ts 2>&1 | tail -15 && popd`
Expected: FAIL — cannot find module `../agent-data-utils`

- [ ] **Step 3: Implement the shared utils**

Create `packages/cli/src/modules/agents/tools/agent-data-utils.ts`:

```typescript
import type { INodeExecutionData } from 'n8n-workflow';
import { evaluateJmespathQuery } from 'n8n-workflow';

export const MAX_ITEMS = 20;
export const MAX_OUTPUT_CHARS = 50_000;

/** Strips binary payloads down to their key names — the agent only needs to know they exist. */
export function toSafeItem(item: INodeExecutionData): Record<string, unknown> {
	const safe: Record<string, unknown> = { json: item.json };
	if (item.binary) {
		safe.binary = Object.keys(item.binary);
	}
	return safe;
}

/**
 * Caps a list of items to MAX_ITEMS / MAX_OUTPUT_CHARS, stripping binary and
 * substituting a bounded preview when even the first item exceeds the size cap.
 */
export function trimItems(allItems: INodeExecutionData[]): {
	items: Array<Record<string, unknown>>;
	truncated: boolean;
} {
	const items: Array<Record<string, unknown>> = [];
	let itemPreviewed = false;
	let serializedSize = 0;
	for (const item of allItems.slice(0, MAX_ITEMS)) {
		const safe = toSafeItem(item);
		const safeSize = JSON.stringify(safe).length;
		if (serializedSize + safeSize > MAX_OUTPUT_CHARS) {
			// Always give the agent something, even when one item exceeds the cap.
			if (items.length === 0) {
				items.push({
					jsonPreview: JSON.stringify(item.json).slice(0, MAX_OUTPUT_CHARS),
					itemTruncated: true,
				});
				itemPreviewed = true;
			}
			break;
		}
		serializedSize += safeSize;
		items.push(safe);
	}
	return { items, truncated: itemPreviewed || items.length < allItems.length };
}

/**
 * Runs a JMESPath query against full (untrimmed) data, bounded only by the
 * output-size ceiling. Never throws — guard/parser errors and no-match become
 * `{ error }` payloads the agent can read and recover from.
 */
export function runQuery(
	data: unknown,
	query: string,
): { result: unknown; truncated: boolean } | { error: string } {
	let result: unknown;
	try {
		result = evaluateJmespathQuery(data, query);
	} catch (error) {
		return { error: `Query failed: ${(error as Error).message}` };
	}

	if (result === null || result === undefined) {
		return { error: `Query '${query}' matched no data.` };
	}

	const serialized = JSON.stringify(result);
	if (serialized.length > MAX_OUTPUT_CHARS) {
		return { result: serialized.slice(0, MAX_OUTPUT_CHARS), truncated: true };
	}
	return { result, truncated: false };
}
```

- [ ] **Step 4: Run the utils test to verify it passes**

Run: `pushd packages/cli && pnpm test modules/agents/tools/__tests__/agent-data-utils.test.ts 2>&1 | tail -10 && popd`
Expected: PASS (8 tests)

- [ ] **Step 5: Refactor `workflow-context-tool.ts` to use the shared utils + add query**

Replace the entire contents of `packages/cli/src/modules/agents/tools/workflow-context-tool.ts` with:

```typescript
import type { BuiltTool } from '@n8n/agents';
import { Tool } from '@n8n/agents/tool';
import type { ExecuteAgentWorkflowContext, INodeExecutionData, ITaskData } from 'n8n-workflow';
import { z } from 'zod';

import { trimItems, runQuery } from './agent-data-utils';

const DESCRIPTION =
	'Inspect data produced by OTHER earlier nodes in this workflow. ' +
	'Call without arguments to list the nodes that have executed so far. ' +
	'Call with a nodeName to read that node output (last run). ' +
	'Pass a JMESPath query together with a nodeName to extract a specific part of large output.';

/** Items of the last run's main output, flattened across output branches. */
function lastRunMainItems(runs: ITaskData[]): INodeExecutionData[] {
	const lastRun = runs[runs.length - 1];
	const mainBranches = lastRun?.data?.main ?? [];
	return mainBranches.flatMap((branch) => branch ?? []);
}

/** Item count of the last run's main output across branches, without materializing. */
function lastRunMainItemCount(runs: ITaskData[]): number {
	const lastRun = runs[runs.length - 1];
	const mainBranches = lastRun?.data?.main ?? [];
	return mainBranches.reduce((count, branch) => count + (branch?.length ?? 0), 0);
}

/**
 * Builds the opt-in `fetch_workflow_context` tool: lets the agent inspect any
 * other node's execution data in the calling workflow. Attached only when the
 * MessageAnAgent node enables "Allow agent to access other nodes' data".
 */
export function createWorkflowContextTool(context: ExecuteAgentWorkflowContext): BuiltTool {
	const nodeTypesByName = new Map((context.nodes ?? []).map((node) => [node.name, node.type]));

	return (
		new Tool('fetch_workflow_context')
			.description(DESCRIPTION)
			.input(
				z.object({
					nodeName: z
						.string()
						.optional()
						.describe(
							'Name of an executed node whose output data to fetch. Omit to list all executed nodes.',
						),
					query: z
						.string()
						.optional()
						.describe('JMESPath query to extract a specific part of the node output, untrimmed.'),
				}),
			)
			.systemInstruction(
				'To inspect data produced by OTHER earlier nodes in this workflow, call ' +
					'fetch_workflow_context with no arguments to list executed nodes, then with a nodeName ' +
					'to read that node output. Pass a JMESPath query with a nodeName to extract a specific ' +
					'part of large output.',
			)
			// eslint-disable-next-line @typescript-eslint/require-await -- Tool.handler() expects an async callback
			.handler(async (input) => {
				const { nodeName, query } = input as { nodeName?: string; query?: string };
				const runData = context.runExecutionData.resultData.runData;

				if (!nodeName) {
					if (query) {
						return { error: 'Specify a nodeName to run a query against that node output.' };
					}
					return {
						workflow: { id: context.workflowId ?? null, name: context.workflowName ?? null },
						invokedBy: context.callingNodeName,
						executedNodes: Object.entries(runData).map(([name, runs]) => ({
							name,
							type: nodeTypesByName.get(name) ?? 'unknown',
							status: runs[runs.length - 1]?.executionStatus ?? 'unknown',
							runs: runs.length,
							items: lastRunMainItemCount(runs),
						})),
					};
				}

				const runs = Object.hasOwn(runData, nodeName) ? runData[nodeName] : undefined;
				if (!runs?.length) {
					return {
						error: `No execution data found for node '${nodeName}'.`,
						availableNodes: Object.keys(runData),
					};
				}

				const allItems = lastRunMainItems(runs);

				if (query) {
					return {
						nodeName,
						query,
						...runQuery(
							allItems.map((item) => item.json ?? null),
							query,
						),
					};
				}

				const { items, truncated } = trimItems(allItems);
				return {
					nodeName,
					status: runs[runs.length - 1]?.executionStatus ?? 'unknown',
					runs: runs.length,
					totalItems: allItems.length,
					items,
					truncated,
				};
			})
			.build()
	);
}
```

- [ ] **Step 6: Update the `workflow-context-tool` test for the new instruction + add query cases**

In `packages/cli/src/modules/agents/tools/__tests__/workflow-context-tool.test.ts`:

(a) Replace the test `'embeds workflow and calling node names in the system instruction'` with:

```typescript
	it('describes the other-nodes purpose in its system instruction', () => {
		const tool = createWorkflowContextTool(makeContext({}));
		expect(tool.systemInstruction).toContain('OTHER earlier nodes');
		expect(tool.systemInstruction).toContain('fetch_workflow_context');
	});
```

(b) Add these query tests inside the top-level `describe`:

```typescript
	it('runs a JMESPath query against a node last-run output', async () => {
		const tool = createWorkflowContextTool(
			makeContext({ Webhook: [makeTaskData([{ id: 1 }, { id: 2 }])] }),
		);

		const result = await tool.handler!({ nodeName: 'Webhook', query: '[*].id' }, makeCtx());

		expect(result).toEqual({ nodeName: 'Webhook', query: '[*].id', result: [1, 2], truncated: false });
	});

	it('returns an error when a query is given without a nodeName', async () => {
		const tool = createWorkflowContextTool(makeContext({ Webhook: [makeTaskData([{ a: 1 }])] }));

		const result = (await tool.handler!({ query: '[*].a' }, makeCtx())) as { error: string };

		expect(result.error).toContain('Specify a nodeName');
	});
```

(All existing tests — overview, last-run items, binary, caps, unknown node, prototype key — remain unchanged and must still pass.)

- [ ] **Step 7: Run both cli tool test files**

Run: `pushd packages/cli && pnpm test modules/agents/tools/__tests__/agent-data-utils.test.ts modules/agents/tools/__tests__/workflow-context-tool.test.ts 2>&1 | tail -12 && popd`
Expected: PASS (all)

- [ ] **Step 8: Lint**

Run: `pushd packages/cli && pnpm lint src/modules/agents/tools 2>&1 | tail -5 && popd`
Expected: clean (pre-existing naming-convention warnings on test fixture keys are acceptable)

- [ ] **Step 9: Commit**

```bash
git add packages/cli/src/modules/agents/tools/agent-data-utils.ts packages/cli/src/modules/agents/tools/workflow-context-tool.ts packages/cli/src/modules/agents/tools/__tests__/agent-data-utils.test.ts packages/cli/src/modules/agents/tools/__tests__/workflow-context-tool.test.ts
git commit -m "refactor(core): Share agent data helpers and add JMESPath query to context tool (no-changelog)"
```

---

### Task 4: `fetch_input_data` tool factory (TDD)

**Files:**
- Create: `packages/cli/src/modules/agents/tools/input-data-tool.ts`
- Test: `packages/cli/src/modules/agents/tools/__tests__/input-data-tool.test.ts`

- [ ] **Step 1: Write the failing test**

Create `packages/cli/src/modules/agents/tools/__tests__/input-data-tool.test.ts`:

```typescript
import type { ExecuteAgentWorkflowContext, IRunExecutionData, INodeExecutionData } from 'n8n-workflow';

import { createInputDataTool } from '../input-data-tool';

function makeCtx() {
	return { parentTelemetry: undefined };
}

function makeContext(
	inputData: INodeExecutionData[],
	inputDataScope: 'item' | 'all',
): ExecuteAgentWorkflowContext {
	return {
		workflowId: 'wf-1',
		workflowName: 'Order processing',
		callingNodeName: 'Message an Agent',
		inputData,
		inputDataScope,
		exposeWorkflowData: false,
		nodes: [],
		runExecutionData: { resultData: { runData: {} } } as unknown as IRunExecutionData,
	};
}

describe('createInputDataTool', () => {
	it('builds a tool named fetch_input_data', () => {
		const tool = createInputDataTool(makeContext([], 'item'));
		expect(tool.name).toBe('fetch_input_data');
	});

	it('embeds workflow and node names in its system instruction', () => {
		const tool = createInputDataTool(makeContext([], 'item'));
		expect(tool.systemInstruction).toContain('Order processing');
		expect(tool.systemInstruction).toContain('Message an Agent');
	});

	it('returns the input items with scope when called without a query', async () => {
		const tool = createInputDataTool(
			makeContext([{ json: { a: 1 } }, { json: { a: 2 } }], 'all'),
		);

		const result = await tool.handler!({}, makeCtx());

		expect(result).toEqual({
			scope: 'all',
			totalItems: 2,
			items: [{ json: { a: 1 } }, { json: { a: 2 } }],
			truncated: false,
		});
	});

	it('reports scope item for a single current item', async () => {
		const tool = createInputDataTool(makeContext([{ json: { only: true } }], 'item'));

		const result = (await tool.handler!({}, makeCtx())) as { scope: string; totalItems: number };

		expect(result.scope).toBe('item');
		expect(result.totalItems).toBe(1);
	});

	it('runs a JMESPath query against the full input json', async () => {
		const tool = createInputDataTool(
			makeContext([{ json: { id: 1 } }, { json: { id: 2 } }], 'all'),
		);

		const result = await tool.handler!({ query: '[*].id' }, makeCtx());

		expect(result).toEqual({ query: '[*].id', result: [1, 2], truncated: false });
	});

	it('returns an error payload for an unsafe query', async () => {
		const tool = createInputDataTool(makeContext([{ json: { a: 1 } }], 'item'));

		const result = (await tool.handler!({ query: '[0].__proto__' }, makeCtx())) as {
			query: string;
			error: string;
		};

		expect(result.error).toContain('Query failed');
	});
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `pushd packages/cli && pnpm test modules/agents/tools/__tests__/input-data-tool.test.ts 2>&1 | tail -15 && popd`
Expected: FAIL — cannot find module `../input-data-tool`

- [ ] **Step 3: Implement**

Create `packages/cli/src/modules/agents/tools/input-data-tool.ts`:

```typescript
import type { BuiltTool } from '@n8n/agents';
import { Tool } from '@n8n/agents/tool';
import type { ExecuteAgentWorkflowContext } from 'n8n-workflow';
import { z } from 'zod';

import { trimItems, runQuery } from './agent-data-utils';

const DESCRIPTION =
	'Read the data passed into this agent step. ' +
	'Call without arguments for the input items (trimmed if large). ' +
	'Pass a JMESPath query to retrieve a specific part of the input, untrimmed.';

/**
 * Builds the always-on `fetch_input_data` tool for agents invoked from a
 * workflow. Exposes the calling node's own input — the current item or all
 * items, depending on how the node invokes the agent. The system instruction
 * (which carries the workflow/node identity) is merged into the agent prompt
 * by the runtime.
 */
export function createInputDataTool(context: ExecuteAgentWorkflowContext): BuiltTool {
	const items = context.inputData ?? [];
	const scope = context.inputDataScope ?? 'item';
	const workflowLabel = context.workflowName ?? context.workflowId ?? 'unknown';
	const scopeText = scope === 'all' ? 'all input items' : 'the current input item';

	return (
		new Tool('fetch_input_data')
			.description(DESCRIPTION)
			.input(
				z.object({
					query: z
						.string()
						.optional()
						.describe('JMESPath query to extract a specific part of the input data, untrimmed.'),
				}),
			)
			.systemInstruction(
				`You were invoked from the n8n workflow '${workflowLabel}' by its node '${context.callingNodeName}'. ` +
					`Call fetch_input_data to read the data passed into this step (${scopeText}). ` +
					'Pass a JMESPath query to retrieve a specific part of large data. ' +
					'Use it whenever the message references the input data.',
			)
			// eslint-disable-next-line @typescript-eslint/require-await -- Tool.handler() expects an async callback
			.handler(async (input) => {
				const { query } = input as { query?: string };

				if (query) {
					return {
						query,
						...runQuery(
							items.map((item) => item.json ?? null),
							query,
						),
					};
				}

				const { items: trimmed, truncated } = trimItems(items);
				return { scope, totalItems: items.length, items: trimmed, truncated };
			})
			.build()
	);
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pushd packages/cli && pnpm test modules/agents/tools/__tests__/input-data-tool.test.ts 2>&1 | tail -10 && popd`
Expected: PASS (6 tests)

- [ ] **Step 5: Lint**

Run: `pushd packages/cli && pnpm lint src/modules/agents/tools 2>&1 | tail -5 && popd`
Expected: clean

- [ ] **Step 6: Commit**

```bash
git add packages/cli/src/modules/agents/tools/input-data-tool.ts packages/cli/src/modules/agents/tools/__tests__/input-data-tool.test.ts
git commit -m "feat(core): Add fetch_input_data tool factory for agent invocations (no-changelog)"
```

---

### Task 5: Inject both tools conditionally in `AgentsService.executeForWorkflow` (TDD)

**Files:**
- Modify: `packages/cli/src/modules/agents/agents.service.ts` (`executeForWorkflow` ~line 1449; imports)
- Modify: `packages/cli/src/modules/agents/__tests__/agents.service.test.ts` (the `describe('workflow context tool')` block added in the prior iteration)

- [ ] **Step 1: Rewrite the failing tests**

In `packages/cli/src/modules/agents/__tests__/agents.service.test.ts`, replace the existing `describe('workflow context tool', ...)` block (inside `describe('executeForWorkflow')`) with:

```typescript
		describe('workflow data tools', () => {
			const baseContext = {
				workflowId: 'wf-1',
				workflowName: 'My workflow',
				callingNodeName: 'Message an Agent',
				inputData: [{ json: { a: 1 } }],
				inputDataScope: 'item' as const,
				nodes: [{ name: 'Webhook', type: 'n8n-nodes-base.webhook' }],
				runExecutionData: { resultData: { runData: {} } } as unknown as IRunExecutionData,
			};

			const setupAgentWithToolSpy = () => {
				const schema: AgentJsonConfig = {
					name: 'Test Agent',
					model: 'anthropic/claude-sonnet-4-5',
					instructions: 'Be helpful',
				};
				const agent = makeAgent({
					schema,
					activeVersionId: versionId,
					activeVersion: makeAgentHistory({ schema, publishedById: userId }),
				});
				agentRepository.findByIdAndProjectId.mockResolvedValue(agent);
				Container.set(CredentialsService, mock<CredentialsService>());

				const toolFn = jest.fn();
				jest.spyOn(service as never, 'reconstructFromConfig').mockResolvedValue({
					agent: {
						name: 'Test Agent',
						structuredOutput: jest.fn(),
						tool: toolFn,
						declaredTools: [],
						stream: jest.fn().mockResolvedValue({
							stream: {
								getReader: () => ({
									read: jest.fn().mockResolvedValue({ done: true, value: undefined }),
									releaseLock: jest.fn(),
								}),
							},
						}),
						close: jest.fn(),
					},
					toolRegistry: {},
				} as never);
				return toolFn;
			};

			const toolNamesFrom = (toolFn: jest.Mock): string[] => {
				const [tools] = toolFn.mock.calls[0] as [Array<{ name: string }>];
				return tools.map((t) => t.name);
			};

			it('always injects fetch_input_data when workflowContext is provided', async () => {
				const toolFn = setupAgentWithToolSpy();
				const workflowContext: ExecuteAgentWorkflowContext = {
					...baseContext,
					exposeWorkflowData: false,
				};

				await service.executeForWorkflow(
					agentId,
					'hello',
					'execution-1',
					'thread-1',
					userId,
					projectId,
					undefined,
					undefined,
					undefined,
					workflowContext,
				);

				expect(toolFn).toHaveBeenCalledTimes(1);
				expect(toolNamesFrom(toolFn)).toEqual(['fetch_input_data']);
			});

			it('also injects fetch_workflow_context when exposeWorkflowData is true', async () => {
				const toolFn = setupAgentWithToolSpy();
				const workflowContext: ExecuteAgentWorkflowContext = {
					...baseContext,
					exposeWorkflowData: true,
				};

				await service.executeForWorkflow(
					agentId,
					'hello',
					'execution-1',
					'thread-1',
					userId,
					projectId,
					undefined,
					undefined,
					undefined,
					workflowContext,
				);

				expect(toolNamesFrom(toolFn)).toEqual(['fetch_input_data', 'fetch_workflow_context']);
			});

			it('injects no tools without workflowContext', async () => {
				const toolFn = setupAgentWithToolSpy();

				await service.executeForWorkflow(
					agentId,
					'hello',
					'execution-1',
					'thread-1',
					userId,
					projectId,
				);

				expect(toolFn).not.toHaveBeenCalled();
			});
		});
```

(Ensure `ExecuteAgentWorkflowContext` and `IRunExecutionData` are imported as types from `'n8n-workflow'` at the top of the file — added in the prior iteration; keep them.)

- [ ] **Step 2: Run to verify the new behavior fails**

Run: `pushd packages/cli && pnpm test modules/agents/__tests__/agents.service.test.ts -t "workflow data tools" 2>&1 | tail -20 && popd`
Expected: FAIL — current code injects only `fetch_workflow_context` (or nothing); `fetch_input_data` not present

- [ ] **Step 3: Implement**

In `packages/cli/src/modules/agents/agents.service.ts`:

(a) Add the input-tool import next to the existing `createWorkflowContextTool` import:

```typescript
import { createInputDataTool } from './tools/input-data-tool';
```

(b) Replace **both** the `extraTools` line **and** the `const compiled = await this.compileIsolated(...)` call that immediately follows it (currently ~lines 1449–1456):

```typescript
		const extraTools = workflowContext ? [createWorkflowContextTool(workflowContext)] : undefined;
		const compiled = await this.compileIsolated(
			agentData,
			credentialProvider,
			userId,
			outputSchema,
			extraTools,
		);
```

with this single block (do not leave the old `const compiled` behind — there must be exactly one):

```typescript
		const extraTools: BuiltTool[] = [];
		if (workflowContext) {
			extraTools.push(createInputDataTool(workflowContext));
			if (workflowContext.exposeWorkflowData) {
				extraTools.push(createWorkflowContextTool(workflowContext));
			}
		}
		const compiled = await this.compileIsolated(
			agentData,
			credentialProvider,
			userId,
			outputSchema,
			extraTools.length ? extraTools : undefined,
		);
```

(`BuiltTool` is already imported in this file. `compileIsolated` already filters `extraTools` against the agent's `declaredTools` for name collisions — no change needed there.)

- [ ] **Step 4: Run the new tests**

Run: `pushd packages/cli && pnpm test modules/agents/__tests__/agents.service.test.ts -t "workflow data tools" 2>&1 | tail -10 && popd`
Expected: PASS (3 tests)

- [ ] **Step 5: Run the full agents.service file** (regression guard)

Run: `pushd packages/cli && pnpm test modules/agents/__tests__/agents.service.test.ts 2>&1 | tail -10 && popd`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add packages/cli/src/modules/agents/agents.service.ts packages/cli/src/modules/agents/__tests__/agents.service.test.ts
git commit -m "feat(core): Inject input-data tool always and context tool opt-in (no-changelog)"
```

---

### Task 6: Build scoped input + flags in `BaseExecuteContext.executeAgent` (TDD)

**Files:**
- Modify: `packages/core/src/execution-engine/node-execution-context/base-execute-context.ts` (`executeAgent` ~line 160)
- Modify: `packages/core/src/execution-engine/node-execution-context/__tests__/execute-context.test.ts` (the `describe('executeAgent')` block from the prior iteration)

**packages/core uses Vitest** (`vi.fn()`).

- [ ] **Step 1: Update the existing test + add an all-items test**

In `execute-context.test.ts`, inside `describe('executeAgent', ...)`, **replace** the existing assertion object in the test `'passes the workflow context to additionalData.executeAgent'` so the expected context includes the new fields, and **add** a second test. The block becomes:

```typescript
		it('passes the workflow context to additionalData.executeAgent', async () => {
			agentAdditionalData.executeAgent = vi
				.fn()
				.mockResolvedValue({ response: 'ok' }) as IWorkflowExecuteAdditionalData['executeAgent'];

			await agentExecuteContext.executeAgent(
				{ agentId: 'agent-1', inputDataScope: 'item', exposeWorkflowData: false },
				'hello',
				'exec-1',
				0,
			);

			expect(agentAdditionalData.executeAgent).toHaveBeenCalledWith(
				'agent-1',
				'hello',
				'exec-1',
				'exec-1-0',
				agentAdditionalData,
				'manual',
				undefined,
				{
					workflowId: 'wf-id',
					workflowName: 'My workflow',
					callingNodeName: node.name,
					inputData: [{ json: { test: 'data' } }],
					inputDataScope: 'item',
					exposeWorkflowData: false,
					nodes: [
						{ name: node.name, type: node.type },
						{ name: 'Webhook', type: 'n8n-nodes-base.webhook' },
					],
					runExecutionData,
				},
			);
		});

		it('passes all input items when inputDataScope is all', async () => {
			agentAdditionalData.executeAgent = vi
				.fn()
				.mockResolvedValue({ response: 'ok' }) as IWorkflowExecuteAdditionalData['executeAgent'];

			await agentExecuteContext.executeAgent(
				{ agentId: 'agent-1', inputDataScope: 'all', exposeWorkflowData: true },
				'hello',
				'exec-1',
				0,
			);

			expect(agentAdditionalData.executeAgent).toHaveBeenCalledWith(
				'agent-1',
				'hello',
				'exec-1',
				'exec-1-0',
				agentAdditionalData,
				'manual',
				undefined,
				expect.objectContaining({
					inputData: [{ json: { test: 'data' } }],
					inputDataScope: 'all',
					exposeWorkflowData: true,
				}),
			);
		});
```

Note: the shared `inputData` fixture at the top of this file is `{ main: [[{ json: { test: 'data' } }]] }` (one item), so both `'item'` (index 0) and `'all'` scope yield the same single item here — that's fine; the assertions verify the scope flag and the slicing path. If the shared `inputData` const differs, set the expectation to match its `main[0]`.

- [ ] **Step 2: Run to verify it fails**

Run: `pushd packages/core && pnpm test src/execution-engine/node-execution-context/__tests__/execute-context.test.ts 2>&1 | tail -20 && popd`
Expected: FAIL — context lacks `inputData` / `inputDataScope` / `exposeWorkflowData`

- [ ] **Step 3: Implement**

In `base-execute-context.ts`, replace the `executeAgent` return (the `return await this.additionalData.executeAgent(...)` block at ~line 172) with:

```typescript
		const inputDataScope = agentInfo.inputDataScope ?? 'item';
		const mainItems = this.inputData?.main?.[0] ?? [];
		const scopedInput =
			inputDataScope === 'all'
				? mainItems
				: mainItems[itemIndex]
					? [mainItems[itemIndex]]
					: [];

		return await this.additionalData.executeAgent(
			agentInfo.agentId,
			message,
			executionId,
			threadId,
			this.additionalData,
			this.additionalData.rootExecutionMode ?? this.getMode(),
			agentInfo.outputSchema,
			{
				workflowId: this.workflow.id,
				workflowName: this.workflow.name,
				callingNodeName: this.node.name,
				inputData: scopedInput,
				inputDataScope,
				exposeWorkflowData: agentInfo.exposeWorkflowData ?? false,
				nodes: Object.values(this.workflow.nodes).map(({ name, type }) => ({ name, type })),
				runExecutionData: this.runExecutionData,
			},
		);
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pushd packages/core && pnpm test src/execution-engine/node-execution-context/__tests__/execute-context.test.ts 2>&1 | tail -10 && popd`
Expected: PASS (all tests in the file)

- [ ] **Step 5: Typecheck core**

Run: `pushd packages/core && pnpm typecheck 2>&1 | tail -5 && popd`
Expected: PASS (no errors mentioning base-execute-context)

- [ ] **Step 6: Commit**

```bash
git add packages/core/src/execution-engine/node-execution-context/base-execute-context.ts packages/core/src/execution-engine/node-execution-context/__tests__/execute-context.test.ts
git commit -m "feat(core): Scope agent input data and forward expose flag (no-changelog)"
```

---

### Task 7: MessageAnAgent node — Invoke Agent mode + opt-in param (TDD)

**Files:**
- Modify: `packages/nodes-base/nodes/MessageAnAgent/MessageAnAgent.node.ts` (`properties` array + `execute`)
- Modify: `packages/nodes-base/nodes/MessageAnAgent/__tests__/MessageAnAgent.node.test.ts`

**packages/nodes-base uses Jest.**

- [ ] **Step 1: Update existing tests + add mode tests**

In `MessageAnAgent.node.test.ts`:

(a) The existing `getNodeParameter` mocks don't return `invokeMode` / `allowOtherNodesData`, so they'll fall back to the third-arg default — make sure each `getNodeParameter` mock returns the `fallback` for unknown params (they already do via `return undefined` / `return fallback ?? {}`; update those that `return undefined` to `return fallback`). Concretely, in every `getNodeParameter.mockImplementation`, change the final `return undefined;` / `return undefined as unknown as string;` to `return fallback;` so `invokeMode` defaults to `'perItem'` and `allowOtherNodesData` to `false`.

(b) Every existing `toHaveBeenCalledWith` on `executeAgent` passes an agentInfo object — add `inputDataScope: 'item', exposeWorkflowData: false` to each. For example the first test becomes:

```typescript
		expect(executeFunctions.executeAgent).toHaveBeenCalledWith(
			{ agentId: 'agent-1', sessionId: undefined, inputDataScope: 'item', exposeWorkflowData: false },
			'Hello agent',
			'exec-123',
			0,
		);
```

Apply the same addition to the agentInfo objects in: `'should forward a user-supplied sessionId...'`, `'should treat a whitespace-only sessionId...'`, `'should process multiple items...'` (both calls), `'should forward the parsed output schema...'` (the object also has `outputSchema`), and `'forwards an already-parsed object schema...'`.

(c) Add two new tests at the end of the `describe`:

```typescript
	it('invokes the agent once with all-items scope in "Once for All Items" mode', async () => {
		executeFunctions.getInputData.mockReturnValue([{ json: { i: 0 } }, { json: { i: 1 } }]);
		executeFunctions.getNodeParameter.mockImplementation(
			(param: string, _itemIndex?: number, fallback?: unknown) => {
				if (param === 'agentId') return { mode: 'id', value: 'agent-1' };
				if (param === 'message') return 'Summarize all items';
				if (param === 'advanced') return fallback ?? {};
				if (param === 'invokeMode') return 'allItems';
				if (param === 'allowOtherNodesData') return false;
				return fallback;
			},
		);
		executeFunctions.executeAgent.mockResolvedValue(mockAgentResult);

		const result = await node.execute.call(executeFunctions);

		expect(executeFunctions.executeAgent).toHaveBeenCalledTimes(1);
		expect(executeFunctions.executeAgent).toHaveBeenCalledWith(
			{ agentId: 'agent-1', sessionId: undefined, inputDataScope: 'all', exposeWorkflowData: false },
			'Summarize all items',
			'exec-123',
			0,
		);
		expect(result[0]).toHaveLength(1);
	});

	it('passes exposeWorkflowData when "Allow agent to access other nodes data" is on', async () => {
		executeFunctions.getInputData.mockReturnValue([{ json: {} }]);
		executeFunctions.getNodeParameter.mockImplementation(
			(param: string, _itemIndex?: number, fallback?: unknown) => {
				if (param === 'agentId') return { mode: 'id', value: 'agent-1' };
				if (param === 'message') return 'Hello';
				if (param === 'advanced') return fallback ?? {};
				if (param === 'invokeMode') return 'perItem';
				if (param === 'allowOtherNodesData') return true;
				return fallback;
			},
		);
		executeFunctions.executeAgent.mockResolvedValue(mockAgentResult);

		await node.execute.call(executeFunctions);

		expect(executeFunctions.executeAgent).toHaveBeenCalledWith(
			{ agentId: 'agent-1', sessionId: undefined, inputDataScope: 'item', exposeWorkflowData: true },
			'Hello',
			'exec-123',
			0,
		);
	});
```

- [ ] **Step 2: Run to verify failures**

Run: `pushd packages/nodes-base && pnpm test MessageAnAgent 2>&1 | tail -20 && popd`
Expected: FAIL — agentInfo missing the new fields; all-items mode still loops twice

- [ ] **Step 3: Add the node parameters**

In `MessageAnAgent.node.ts`, in the `properties` array, add after the `Message` property (and before `Require Specific Output Format`):

```typescript
			{
				displayName: 'Invoke Agent',
				name: 'invokeMode',
				type: 'options',
				noDataExpression: true,
				default: 'perItem',
				description: 'Whether to call the agent once per input item or a single time for all items',
				options: [
					{
						name: 'Once Per Item',
						value: 'perItem',
						description: 'Call the agent separately for each input item',
					},
					{
						name: 'Once for All Items',
						value: 'allItems',
						description: 'Call the agent a single time; it can read all input items',
					},
				],
			},
			{
				displayName: "Allow Agent to Access Other Nodes' Data",
				name: 'allowOtherNodesData',
				type: 'boolean',
				default: false,
				description:
					"Whether to give the agent a tool to read other workflow nodes' execution data, beyond its own input",
			},
```

- [ ] **Step 4: Branch the execute loop**

In `MessageAnAgent.node.ts`, replace the `execute` method body's loop setup and the `executeAgent` call. Specifically, after `const executionId = ...;` add the param reads and loop bound:

```typescript
		const invokeMode = this.getNodeParameter('invokeMode', 0, 'perItem') as string;
		const allowOtherNodesData = this.getNodeParameter('allowOtherNodesData', 0, false) as boolean;
		const runOnceForAll = invokeMode === 'allItems';
		const loopCount = runOnceForAll ? Math.min(1, items.length) : items.length;

		for (let i = 0; i < loopCount; i++) {
```

(Change the `for` loop header from `i < items.length` to `i < loopCount`.)

Then change the `executeAgent` call's agentInfo object to include the two new fields:

```typescript
				const result = await this.executeAgent(
					{
						agentId,
						sessionId: sessionIdOverride || undefined,
						outputSchema,
						inputDataScope: runOnceForAll ? 'all' : 'item',
						exposeWorkflowData: allowOtherNodesData,
					},
					message,
					executionId,
					i,
				);
```

(Leave the rest of the loop body — `returnData.push(...)`, the `catch`/`continueOnFail` — unchanged.)

- [ ] **Step 5: Run the node tests**

Run: `pushd packages/nodes-base && pnpm test MessageAnAgent 2>&1 | tail -15 && popd`
Expected: PASS (all, including the two new tests)

- [ ] **Step 6: Lint + typecheck**

Run: `pushd packages/nodes-base && pnpm typecheck 2>&1 | tail -5 && pnpm lint nodes/MessageAnAgent 2>&1 | tail -5 && popd`
Expected: PASS / clean

- [ ] **Step 7: Commit**

```bash
git add packages/nodes-base/nodes/MessageAnAgent/MessageAnAgent.node.ts packages/nodes-base/nodes/MessageAnAgent/__tests__/MessageAnAgent.node.test.ts
git commit -m "feat(core): Add invoke mode and other-nodes opt-in to Message an Agent node (no-changelog)"
```

---

### Task 8: Full verification + manual demo

**Files:** none (verification only)

- [ ] **Step 1: Typecheck touched packages**

```bash
pushd packages/workflow && pnpm typecheck && popd
pushd packages/core && pnpm typecheck 2>&1 | tail -3 && popd
pushd packages/cli && pnpm typecheck 2>&1 | tail -15 && popd
pushd packages/nodes-base && pnpm typecheck 2>&1 | tail -5 && popd
```
Expected: PASS (cli may show pre-existing TS6305/TS2307 noise from unbuilt sibling dists — confirm none reference the files changed in this plan)

- [ ] **Step 2: Full build**

Run: `pnpm build > build.log 2>&1; echo "exit=$?"; tail -n 20 build.log`
Expected: build succeeds

- [ ] **Step 3: Re-run all touched test files**

```bash
pushd packages/workflow && pnpm test jmespath-query 2>&1 | tail -4 && popd
pushd packages/cli && pnpm test modules/agents/tools/__tests__/agent-data-utils.test.ts modules/agents/tools/__tests__/input-data-tool.test.ts modules/agents/tools/__tests__/workflow-context-tool.test.ts modules/agents/__tests__/agents.service.test.ts 2>&1 | tail -8 && popd
pushd packages/core && pnpm test src/execution-engine/node-execution-context/__tests__/execute-context.test.ts 2>&1 | tail -4 && popd
pushd packages/nodes-base && pnpm test MessageAnAgent 2>&1 | tail -4 && popd
```
Expected: all PASS

- [ ] **Step 4: Manual demo** (requires backend restart to pick up the rebuilt dist)

1. Restart backend / `pnpm dev`.
2. Publish an agent (tool-calling model).
3. Workflow: `Manual Trigger → Edit Fields (sample array of items) → Message an Agent`.
   - **Per item, query:** message "What is the id of this item? Use fetch_input_data." → verify a `fetch_input_data` call (optionally with a `query`) in the node output `toolCalls`.
   - **Once for All Items:** set Invoke Agent = Once for All Items; message "How many items are there and summarize them." → verify a single output item and a `fetch_input_data` call returning `scope: 'all'`.
   - **Opt-in:** toggle "Allow agent to access other nodes' data" on; message referencing an earlier node by name → verify a `fetch_workflow_context` call. Toggle off → verify the tool is absent.
   - **JMESPath:** prompt the agent to fetch a specific deep field → verify a `query` round-trip.

- [ ] **Step 5: Report results**, including any deviation found during the demo.
