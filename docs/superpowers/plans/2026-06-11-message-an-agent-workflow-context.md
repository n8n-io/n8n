# Workflow Context for "Message an n8n Agent" — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** When a workflow calls an agent via the `Message an n8n Agent` node, inject a per-invocation `fetch_workflow_context` tool (with system-prompt guidance) that lets the agent inspect the parent workflow's execution data.

**Architecture:** Thread an `ExecuteAgentWorkflowContext` snapshot (workflow id/name, calling node, node list, in-memory `runExecutionData` reference) through the existing `executeAgent` call chain: `BaseExecuteContext` (core) → `additionalData.executeAgent` (cli) → `AgentsService.executeForWorkflow` → `compileIsolated`, where a `BuiltTool` created by a new factory is attached to the isolated `RuntimeAgent` (same pattern as the per-call `structuredOutput`). The tool's `.systemInstruction(...)` is automatically merged into the system prompt by the `@n8n/agents` runtime — no separate prompt plumbing.

**Tech Stack:** TypeScript monorepo (pnpm), `@n8n/agents` Tool SDK, zod, Jest (`packages/cli`), Vitest (`packages/core`).

**Spec:** `docs/superpowers/specs/2026-06-11-message-an-agent-workflow-context-design.md`

**Deviation from spec:** The spec said `compileIsolated` stays untouched and the tool is injected in `executeForWorkflow` on the compiled instance. That's not possible: `compileIsolated` returns `BuiltAgent` (`packages/@n8n/agents/src/types/sdk/agent.ts:234`), which does NOT expose `.tool()`. Injection happens inside `compileIsolated` on the `RuntimeAgent` before the cast — exactly where the per-call `structuredOutput` is applied today (`agents.service.ts:1370-1372`).

**Conventions reminders:**
- Always use pnpm; run package commands from inside the package dir using `pushd`/`popd`.
- Never use `any`; `as` casts are acceptable in test code only.
- `pnpm typecheck` before committing.

---

### Task 1: `ExecuteAgentWorkflowContext` type in `n8n-workflow`

Pure type change — no unit test; typecheck is the verification.

**Files:**
- Modify: `packages/workflow/src/interfaces.ts` (two places: ~line 2014 after `ExecuteAgentInfo`, and the `executeAgent?` fn type at ~line 3265)

- [ ] **Step 1: Add the interface**

In `packages/workflow/src/interfaces.ts`, directly after the `ExecuteAgentInfo` interface (it ends at ~line 2014 with `outputSchema?: JSONSchema7;` followed by `}`), add:

```typescript
/**
 * Context about the calling workflow execution, passed to the agent runtime so
 * it can expose a `fetch_workflow_context` tool to the agent. The
 * `runExecutionData` is a live reference to the calling execution's run data —
 * safe because nodes execute sequentially while the agent call awaits — and
 * must be treated as read-only.
 */
export interface ExecuteAgentWorkflowContext {
	workflowId?: string;
	workflowName?: string;
	/** Name of the node that invoked the agent (e.g. the MessageAnAgent node). */
	callingNodeName: string;
	/** Name and type of every node in the calling workflow. */
	nodes: Array<{ name: string; type: string }>;
	/** The calling execution's run data (read-only by convention). */
	runExecutionData: IRunExecutionData;
}
```

- [ ] **Step 2: Extend the `executeAgent` fn type on `IWorkflowExecuteAdditionalData`**

At ~line 3265 in the same file, change:

```typescript
	executeAgent?: (
		agentId: string,
		message: string,
		executionId: string,
		threadId: string,
		additionalData: IWorkflowExecuteAdditionalData,
		executionMode: WorkflowExecuteMode,
		outputSchema?: JSONSchema7,
	) => Promise<ExecuteAgentData>;
```

to:

```typescript
	executeAgent?: (
		agentId: string,
		message: string,
		executionId: string,
		threadId: string,
		additionalData: IWorkflowExecuteAdditionalData,
		executionMode: WorkflowExecuteMode,
		outputSchema?: JSONSchema7,
		workflowContext?: ExecuteAgentWorkflowContext,
	) => Promise<ExecuteAgentData>;
```

(Do NOT change the other `executeAgent` signature at ~line 1121 — that's the node-facing `IExecuteFunctions` method, which stays as-is.)

- [ ] **Step 3: Typecheck**

Run: `pushd packages/workflow && pnpm typecheck && popd`
Expected: PASS (the new param is optional, no callers break)

- [ ] **Step 4: Build the workflow package** (downstream packages consume the dist types)

Run: `pushd packages/workflow && pnpm build > /tmp/build-workflow.log 2>&1; tail -n 5 /tmp/build-workflow.log && popd`
Expected: build succeeds

- [ ] **Step 5: Commit**

```bash
git add packages/workflow/src/interfaces.ts
git commit -m "feat(core): Add ExecuteAgentWorkflowContext type for agent calls (no-changelog)"
```

---

### Task 2: `fetch_workflow_context` tool factory (TDD)

**Files:**
- Create: `packages/cli/src/modules/agents/tools/workflow-context-tool.ts`
- Test: `packages/cli/src/modules/agents/tools/__tests__/workflow-context-tool.test.ts`

Pattern reference: `packages/cli/src/modules/agents/tools/environment-tool.ts` and its test. Note: unlike `createGetEnvironmentTool()` (returns the builder), this factory returns `.build()` (a `BuiltTool`) so `compileIsolated` can take a plainly-typed `BuiltTool[]`.

- [ ] **Step 1: Write the failing test**

Create `packages/cli/src/modules/agents/tools/__tests__/workflow-context-tool.test.ts`:

```typescript
import type { ExecuteAgentWorkflowContext, IRunExecutionData, ITaskData } from 'n8n-workflow';

import { createWorkflowContextTool } from '../workflow-context-tool';

function makeCtx() {
	return {
		parentTelemetry: undefined,
	};
}

function makeTaskData(
	items: Array<Record<string, unknown>>,
	overrides: Partial<ITaskData> = {},
): ITaskData {
	return {
		startTime: 0,
		executionIndex: 0,
		executionTime: 1,
		source: [],
		executionStatus: 'success',
		data: { main: [items.map((json) => ({ json }))] },
		...overrides,
	} as ITaskData;
}

function makeContext(runData: Record<string, ITaskData[]>): ExecuteAgentWorkflowContext {
	return {
		workflowId: 'wf-1',
		workflowName: 'Order processing',
		callingNodeName: 'Message an Agent',
		nodes: [
			{ name: 'Webhook', type: 'n8n-nodes-base.webhook' },
			{ name: 'HTTP Request', type: 'n8n-nodes-base.httpRequest' },
			{ name: 'Message an Agent', type: 'n8n-nodes-base.messageAnAgent' },
		],
		runExecutionData: { resultData: { runData } } as unknown as IRunExecutionData,
	};
}

describe('createWorkflowContextTool', () => {
	it('builds a tool named fetch_workflow_context', () => {
		const tool = createWorkflowContextTool(makeContext({}));
		expect(tool.name).toBe('fetch_workflow_context');
	});

	it('embeds workflow and calling node names in the system instruction', () => {
		const tool = createWorkflowContextTool(makeContext({}));
		expect(tool.systemInstruction).toContain('Order processing');
		expect(tool.systemInstruction).toContain('Message an Agent');
	});

	it('returns an overview of executed nodes when called without nodeName', async () => {
		const tool = createWorkflowContextTool(
			makeContext({
				Webhook: [makeTaskData([{ a: 1 }, { a: 2 }])],
				'HTTP Request': [makeTaskData([{ b: 1 }]), makeTaskData([{ b: 2 }, { b: 3 }])],
			}),
		);

		const result = await tool.handler!({}, makeCtx());

		expect(result).toEqual({
			workflow: { id: 'wf-1', name: 'Order processing' },
			invokedBy: 'Message an Agent',
			executedNodes: [
				{
					name: 'Webhook',
					type: 'n8n-nodes-base.webhook',
					status: 'success',
					runs: 1,
					items: 2,
				},
				{
					name: 'HTTP Request',
					type: 'n8n-nodes-base.httpRequest',
					status: 'success',
					runs: 2,
					items: 2, // items of the LAST run
				},
			],
		});
	});

	it('returns the json items of the last run for a given node', async () => {
		const tool = createWorkflowContextTool(
			makeContext({
				Webhook: [makeTaskData([{ old: true }]), makeTaskData([{ fresh: 1 }, { fresh: 2 }])],
			}),
		);

		const result = await tool.handler!({ nodeName: 'Webhook' }, makeCtx());

		expect(result).toEqual({
			nodeName: 'Webhook',
			status: 'success',
			runs: 2,
			totalItems: 2,
			items: [{ json: { fresh: 1 } }, { json: { fresh: 2 } }],
			truncated: false,
		});
	});

	it('replaces binary data with key-name stubs', async () => {
		const taskData = makeTaskData([]);
		taskData.data = {
			main: [
				[
					{
						json: { fileName: 'report.pdf' },
						binary: { data: { data: 'AAAA', mimeType: 'application/pdf' } },
					},
				],
			],
		};
		const tool = createWorkflowContextTool(makeContext({ Webhook: [taskData] }));

		const result = (await tool.handler!({ nodeName: 'Webhook' }, makeCtx())) as {
			items: Array<Record<string, unknown>>;
		};

		expect(result.items).toEqual([{ json: { fileName: 'report.pdf' }, binary: ['data'] }]);
	});

	it('caps node output at 20 items and flags truncation', async () => {
		const manyItems = Array.from({ length: 35 }, (_, i) => ({ index: i }));
		const tool = createWorkflowContextTool(makeContext({ Webhook: [makeTaskData(manyItems)] }));

		const result = (await tool.handler!({ nodeName: 'Webhook' }, makeCtx())) as {
			items: unknown[];
			totalItems: number;
			truncated: boolean;
		};

		expect(result.items).toHaveLength(20);
		expect(result.totalItems).toBe(35);
		expect(result.truncated).toBe(true);
	});

	it('stops accumulating items once the serialized size cap is exceeded', async () => {
		// Each item is ~30KB serialized; the 50KB cap admits the first item and
		// stops before the second.
		const bigItems = [{ blob: 'x'.repeat(30_000) }, { blob: 'y'.repeat(30_000) }];
		const tool = createWorkflowContextTool(makeContext({ Webhook: [makeTaskData(bigItems)] }));

		const result = (await tool.handler!({ nodeName: 'Webhook' }, makeCtx())) as {
			items: unknown[];
			truncated: boolean;
		};

		expect(result.items).toHaveLength(1);
		expect(result.truncated).toBe(true);
	});

	it('returns an error payload with available node names for an unknown node', async () => {
		const tool = createWorkflowContextTool(makeContext({ Webhook: [makeTaskData([{ a: 1 }])] }));

		const result = await tool.handler!({ nodeName: 'Nope' }, makeCtx());

		expect(result).toEqual({
			error: "No execution data found for node 'Nope'.",
			availableNodes: ['Webhook'],
		});
	});
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pushd packages/cli && pnpm test modules/agents/tools/__tests__/workflow-context-tool.test.ts 2>&1 | tail -20 && popd`
Expected: FAIL — `Cannot find module '../workflow-context-tool'`

- [ ] **Step 3: Write the implementation**

Create `packages/cli/src/modules/agents/tools/workflow-context-tool.ts`:

```typescript
import type { BuiltTool } from '@n8n/agents';
import { Tool } from '@n8n/agents/tool';
import type { ExecuteAgentWorkflowContext, INodeExecutionData, ITaskData } from 'n8n-workflow';
import { z } from 'zod';

const MAX_ITEMS = 20;
const MAX_OUTPUT_CHARS = 50_000;

const DESCRIPTION =
	'Inspect the n8n workflow execution that invoked this agent. ' +
	'Call without arguments to list the nodes that have executed so far. ' +
	'Call with a nodeName to read the output data that node produced.';

/** Items of the last run's main output, flattened across output branches. */
function lastRunMainItems(runs: ITaskData[]): INodeExecutionData[] {
	const lastRun = runs[runs.length - 1];
	const mainBranches = lastRun?.data?.main ?? [];
	return mainBranches.flatMap((branch) => branch ?? []);
}

/** Strips binary payloads down to their key names — the agent only needs to know they exist. */
function toSafeItem(item: INodeExecutionData): Record<string, unknown> {
	const safe: Record<string, unknown> = { json: item.json };
	if (item.binary) {
		safe.binary = Object.keys(item.binary);
	}
	return safe;
}

/**
 * Builds the per-invocation `fetch_workflow_context` tool for agents invoked
 * from a workflow (MessageAnAgent node). The handler closes over the calling
 * execution's in-memory run data; the tool's system instruction is merged into
 * the agent's prompt by the runtime (`composeEffectiveInstructions`).
 */
export function createWorkflowContextTool(context: ExecuteAgentWorkflowContext): BuiltTool {
	const nodeTypesByName = new Map(context.nodes.map((node) => [node.name, node.type]));
	const workflowLabel = context.workflowName ?? context.workflowId ?? 'unknown';

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
				}),
			)
			.systemInstruction(
				`You were invoked from the n8n workflow '${workflowLabel}' by its node '${context.callingNodeName}'. ` +
					'To inspect data produced by earlier workflow nodes, call fetch_workflow_context with no arguments ' +
					'to list executed nodes, then call it with a nodeName to read that node output. ' +
					'Use it whenever the message references data from the workflow.',
			)
			// eslint-disable-next-line @typescript-eslint/require-await -- Tool.handler() expects an async callback
			.handler(async ({ nodeName }) => {
				const runData = context.runExecutionData.resultData.runData;

				if (!nodeName) {
					return {
						workflow: { id: context.workflowId ?? null, name: context.workflowName ?? null },
						invokedBy: context.callingNodeName,
						executedNodes: Object.entries(runData).map(([name, runs]) => ({
							name,
							type: nodeTypesByName.get(name) ?? 'unknown',
							status: runs[runs.length - 1]?.executionStatus ?? 'unknown',
							runs: runs.length,
							items: lastRunMainItems(runs).length,
						})),
					};
				}

				const runs = runData[nodeName];
				if (!runs?.length) {
					return {
						error: `No execution data found for node '${nodeName}'.`,
						availableNodes: Object.keys(runData),
					};
				}

				const allItems = lastRunMainItems(runs);
				const items: Array<Record<string, unknown>> = [];
				let serializedSize = 0;
				for (const item of allItems.slice(0, MAX_ITEMS)) {
					const safe = toSafeItem(item);
					serializedSize += JSON.stringify(safe).length;
					// Always include the first item so the agent gets something,
					// even when a single item exceeds the cap.
					if (items.length > 0 && serializedSize > MAX_OUTPUT_CHARS) break;
					items.push(safe);
				}

				return {
					nodeName,
					status: runs[runs.length - 1]?.executionStatus ?? 'unknown',
					runs: runs.length,
					totalItems: allItems.length,
					items,
					truncated: items.length < allItems.length,
				};
			})
			.build()
	);
}
```

Note: if TS cannot infer `{ nodeName }` in the handler from the zod schema (builder generics), fall back to `async (input) => { const { nodeName } = input as { nodeName?: string };` — but try inference first; the `Tool` builder is generic over `.input()`.

- [ ] **Step 4: Run the test to verify it passes**

Run: `pushd packages/cli && pnpm test modules/agents/tools/__tests__/workflow-context-tool.test.ts 2>&1 | tail -20 && popd`
Expected: PASS (8 tests)

- [ ] **Step 5: Typecheck + lint**

Run: `pushd packages/cli && pnpm typecheck && pnpm lint src/modules/agents/tools 2>&1 | tail -5 && popd`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add packages/cli/src/modules/agents/tools/workflow-context-tool.ts packages/cli/src/modules/agents/tools/__tests__/workflow-context-tool.test.ts
git commit -m "feat(core): Add workflow context tool factory for agent invocations (no-changelog)"
```

---

### Task 3: Inject the tool in `AgentsService.executeForWorkflow` (TDD)

**Files:**
- Modify: `packages/cli/src/modules/agents/agents.service.ts` (`executeForWorkflow` ~line 1398, `compileIsolated` ~line 1350, imports ~line 1)
- Test: `packages/cli/src/modules/agents/__tests__/agents.service.test.ts` (inside the existing `describe('executeForWorkflow')` ~line 1688)

- [ ] **Step 1: Write the failing tests**

In `packages/cli/src/modules/agents/__tests__/agents.service.test.ts`, add to the imports (if not present): `ExecuteAgentWorkflowContext` and `IRunExecutionData` as types from `'n8n-workflow'`.

Inside `describe('executeForWorkflow', ...)`, add:

```typescript
		describe('workflow context tool', () => {
			const workflowContext: ExecuteAgentWorkflowContext = {
				workflowId: 'wf-1',
				workflowName: 'My workflow',
				callingNodeName: 'Message an Agent',
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

			it('injects the workflow context tool when workflowContext is provided', async () => {
				const toolFn = setupAgentWithToolSpy();

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
				const [tools] = toolFn.mock.calls[0] as [Array<{ name: string }>];
				expect(tools).toHaveLength(1);
				expect(tools[0].name).toBe('fetch_workflow_context');
			});

			it('does not inject the workflow context tool without workflowContext', async () => {
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

(`makeAgent`, `makeAgentHistory`, `agentRepository`, `service`, `agentId`, `userId`, `projectId`, `versionId` are existing fixtures in this file — see the `'passes execution-scoped persistence for workflow executions'` test at ~line 1739 for the pattern being mirrored.)

- [ ] **Step 2: Run tests to verify they fail**

Run: `pushd packages/cli && pnpm test modules/agents/__tests__/agents.service.test.ts -t "workflow context tool" 2>&1 | tail -20 && popd`
Expected: FAIL — first test fails with `expect(toolFn).toHaveBeenCalledTimes(1)` receiving 0 calls (the 10th argument is silently ignored by the current signature)

- [ ] **Step 3: Implement**

In `packages/cli/src/modules/agents/agents.service.ts`:

3a. Add `BuiltTool` to the existing `@n8n/agents` import (line 1-8):

```typescript
import {
	type Agent as RuntimeAgent,
	AgentExecutionCounter,
	BuiltAgent,
	type BuiltTool,
	CredentialProvider,
	StreamChunk,
	ToolDescriptor,
} from '@n8n/agents';
```

3b. Add `ExecuteAgentWorkflowContext` to the file's existing `n8n-workflow` type imports, and add the factory import next to the other `./tools/` imports (or at the top of the import block from local modules):

```typescript
import { createWorkflowContextTool } from './tools/workflow-context-tool';
```

3c. Extend `compileIsolated` (~line 1350):

```typescript
	private async compileIsolated(
		agentEntity: Agent,
		credentialProvider: CredentialProvider,
		userId: string,
		outputSchema?: JSONSchema7,
		extraTools?: BuiltTool[],
	): Promise<{ ok: boolean; agent?: BuiltAgent; error?: string }> {
		if (!agentEntity.schema) {
			return { ok: false, error: 'Agent has no JSON config. Create a config first.' };
		}

		try {
			const { agent: reconstructed } = await this.reconstructFromConfig(
				agentEntity,
				credentialProvider,
				userId,
			);
			// Apply a per-call structured-output schema (e.g. supplied by a
			// workflow node) before the builder is cast to its runtime view. The
			// isolated agent is freshly built and uncached, so this never leaks
			// into concurrent chat / integration executions.
			if (outputSchema) {
				reconstructed.structuredOutput(outputSchema);
			}
			// Same per-call isolation applies to extra tools (e.g. the
			// workflow-context tool injected for MessageAnAgent invocations).
			if (extraTools?.length) {
				reconstructed.tool(extraTools);
			}
			return { ok: true, agent: reconstructed as BuiltAgent };
		} catch (e) {
			return {
				ok: false,
				error: e instanceof Error ? e.message : 'Unknown compilation error',
			};
		}
	}
```

3d. Extend `executeForWorkflow` (~line 1398) — add the trailing param and pass extra tools:

```typescript
	async executeForWorkflow(
		agentId: string,
		message: string,
		executionId: string,
		threadId: string,
		userId: string,
		projectId: string,
		telemetryUserId?: string,
		useDraftVersion?: boolean,
		outputSchema?: JSONSchema7,
		workflowContext?: ExecuteAgentWorkflowContext,
	): Promise<ExecuteAgentData> {
```

and replace the `compileIsolated` call:

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

- [ ] **Step 4: Run the new tests to verify they pass**

Run: `pushd packages/cli && pnpm test modules/agents/__tests__/agents.service.test.ts -t "workflow context tool" 2>&1 | tail -10 && popd`
Expected: PASS (2 tests)

- [ ] **Step 5: Run the whole agents.service test file** (guard against regressions in the other `executeForWorkflow` tests)

Run: `pushd packages/cli && pnpm test modules/agents/__tests__/agents.service.test.ts 2>&1 | tail -10 && popd`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add packages/cli/src/modules/agents/agents.service.ts packages/cli/src/modules/agents/__tests__/agents.service.test.ts
git commit -m "feat(core): Inject workflow context tool into agents invoked from workflows (no-changelog)"
```

---

### Task 4: Forward the context in `workflow-execute-additional-data.ts` (TDD)

**Files:**
- Modify: `packages/cli/src/workflow-execute-additional-data.ts` (`executeAgent` at ~line 316)
- Test: `packages/cli/src/__tests__/workflow-execute-additional-data.test.ts` (existing `describe('executeAgent')` at ~line 976)

- [ ] **Step 1: Write the failing test**

In `packages/cli/src/__tests__/workflow-execute-additional-data.test.ts`, add type imports `ExecuteAgentWorkflowContext` and `IRunExecutionData` from `'n8n-workflow'` (extend the existing type import). Then inside `describe('executeAgent', ...)`, after the `'forwards the outputSchema to executeForWorkflow'` test (~line 1049), add:

```typescript
		it('forwards the workflowContext to executeForWorkflow', async () => {
			const additionalData = mock<IWorkflowExecuteAdditionalData>({
				userId: 'user-1',
				projectId: 'project-1',
				workflowId: 'workflow-1',
			});
			const workflowContext: ExecuteAgentWorkflowContext = {
				workflowId: 'workflow-1',
				workflowName: 'My workflow',
				callingNodeName: 'Message an Agent',
				nodes: [{ name: 'Webhook', type: 'n8n-nodes-base.webhook' }],
				runExecutionData: { resultData: { runData: {} } } as unknown as IRunExecutionData,
			};

			await executeAgent(
				AGENT_ID,
				MESSAGE,
				EXEC_ID,
				THREAD_ID,
				additionalData,
				'manual',
				undefined,
				workflowContext,
			);

			expect(agentsService.executeForWorkflow).toHaveBeenCalledWith(
				AGENT_ID,
				MESSAGE,
				EXEC_ID,
				THREAD_ID,
				'user-1',
				'project-1',
				'user-1',
				true,
				undefined,
				workflowContext,
			);
		});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pushd packages/cli && pnpm test __tests__/workflow-execute-additional-data.test.ts -t "forwards the workflowContext" 2>&1 | tail -15 && popd`
Expected: FAIL — `executeForWorkflow` was called without the `workflowContext` argument

- [ ] **Step 3: Implement**

In `packages/cli/src/workflow-execute-additional-data.ts`:

3a. Add `ExecuteAgentWorkflowContext` to the existing `n8n-workflow` type import.

3b. Extend `executeAgent` (~line 316):

```typescript
export async function executeAgent(
	agentId: string,
	message: string,
	executionId: string,
	threadId: string,
	additionalData: IWorkflowExecuteAdditionalData,
	executionMode: WorkflowExecuteMode,
	outputSchema?: JSONSchema7,
	workflowContext?: ExecuteAgentWorkflowContext,
): Promise<ExecuteAgentData> {
```

3c. Forward it in the `executeForWorkflow` call at the end of the function:

```typescript
	return await agentsService.executeForWorkflow(
		agentId,
		message,
		executionId,
		threadId,
		userId,
		projectId,
		telemetryUserId,
		useDraftVersion,
		outputSchema,
		workflowContext,
	);
```

- [ ] **Step 4: Run the executeAgent test block to verify everything passes**

Run: `pushd packages/cli && pnpm test __tests__/workflow-execute-additional-data.test.ts -t "executeAgent" 2>&1 | tail -10 && popd`
Expected: PASS, including the pre-existing tests (Jest's `toHaveBeenCalledWith` ignores trailing `undefined` args, so the existing 9-arg assertions still pass — verify this is actually the case in the output)

- [ ] **Step 5: Commit**

```bash
git add packages/cli/src/workflow-execute-additional-data.ts packages/cli/src/__tests__/workflow-execute-additional-data.test.ts
git commit -m "feat(core): Forward workflow context through executeAgent (no-changelog)"
```

---

### Task 5: Build the context in `BaseExecuteContext.executeAgent` (TDD)

**Files:**
- Modify: `packages/core/src/execution-engine/node-execution-context/base-execute-context.ts` (`executeAgent` at ~line 160)
- Test: `packages/core/src/execution-engine/node-execution-context/__tests__/execute-context.test.ts`

Note: `packages/core` uses **Vitest** (`vi.fn()`, `vitest-mock-extended`), not Jest.

- [ ] **Step 1: Write the failing test**

In `packages/core/src/execution-engine/node-execution-context/__tests__/execute-context.test.ts`, add a new describe block at the end of the top-level `describe('ExecuteContext', ...)`. It needs its own `ExecuteContext` because the shared `workflow` mock has no concrete `nodes` and the shared `additionalData` deep-mock would return a truthy proxy for `rootExecutionMode`:

```typescript
	describe('executeAgent', () => {
		const webhookNode: INode = {
			id: 'webhook-node-id',
			name: 'Webhook',
			type: 'n8n-nodes-base.webhook',
			typeVersion: 1,
			position: [0, 0],
			parameters: {},
		};
		const agentWorkflow = mock<Workflow>({
			id: 'wf-id',
			name: 'My workflow',
			nodes: { [node.name]: node, [webhookNode.name]: webhookNode },
			expression,
			nodeTypes,
		});
		const agentAdditionalData = mock<IWorkflowExecuteAdditionalData>({
			rootExecutionMode: undefined,
		});

		const agentExecuteContext = new ExecuteContext(
			agentWorkflow,
			node,
			agentAdditionalData,
			mode,
			runExecutionData,
			runIndex,
			connectionInputData,
			inputData,
			executeData,
			[closeFn],
			abortSignal,
		);

		it('passes the workflow context to additionalData.executeAgent', async () => {
			agentAdditionalData.executeAgent = vi
				.fn()
				.mockResolvedValue({ response: 'ok' }) as IWorkflowExecuteAdditionalData['executeAgent'];

			await agentExecuteContext.executeAgent({ agentId: 'agent-1' }, 'hello', 'exec-1', 0);

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
					nodes: [
						{ name: node.name, type: node.type },
						{ name: 'Webhook', type: 'n8n-nodes-base.webhook' },
					],
					runExecutionData,
				},
			);
		});
	});
```

(`node`, `mode`, `runExecutionData`, `runIndex`, `connectionInputData`, `inputData`, `executeData`, `closeFn`, `abortSignal`, `expression`, `nodeTypes` are the existing module-level fixtures in this file.)

- [ ] **Step 2: Run the test to verify it fails**

Run: `pushd packages/core && pnpm test src/execution-engine/node-execution-context/__tests__/execute-context.test.ts 2>&1 | tail -20 && popd`
Expected: FAIL — `executeAgent` called with 7 args, missing the workflow context object

- [ ] **Step 3: Implement**

In `packages/core/src/execution-engine/node-execution-context/base-execute-context.ts`, replace the body of `executeAgent` (~line 160):

```typescript
	async executeAgent(
		agentInfo: ExecuteAgentInfo,
		message: string,
		executionId: string,
		itemIndex: number,
	): Promise<ExecuteAgentData> {
		if (!this.additionalData.executeAgent) {
			throw new OperationalError('Agent execution is not available in this context');
		}

		const threadId = agentInfo.sessionId?.trim() || `${executionId}-${itemIndex}`;

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
				nodes: Object.values(this.workflow.nodes).map(({ name, type }) => ({ name, type })),
				runExecutionData: this.runExecutionData,
			},
		);
	}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pushd packages/core && pnpm test src/execution-engine/node-execution-context/__tests__/execute-context.test.ts 2>&1 | tail -10 && popd`
Expected: PASS (all tests in the file)

- [ ] **Step 5: Typecheck core**

Run: `pushd packages/core && pnpm typecheck && popd`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add packages/core/src/execution-engine/node-execution-context/base-execute-context.ts packages/core/src/execution-engine/node-execution-context/__tests__/execute-context.test.ts
git commit -m "feat(core): Pass workflow execution context to agent invocations (no-changelog)"
```

---

### Task 6: Full verification + manual demo

**Files:** none (verification only)

- [ ] **Step 1: Typecheck and lint the touched packages**

```bash
pushd packages/workflow && pnpm typecheck && popd
pushd packages/core && pnpm typecheck && pnpm lint 2>&1 | tail -3 && popd
pushd packages/cli && pnpm typecheck && pnpm lint 2>&1 | tail -3 && popd
```
Expected: all PASS

- [ ] **Step 2: Build everything**

Run: `pnpm build > build.log 2>&1; tail -n 20 build.log`
Expected: build succeeds

- [ ] **Step 3: Manual demo** (requires user interaction / local dev server)

1. Dev server: hot-reload frontend on port 8080 (already running per user setup), or start `pnpm dev`.
2. Create + publish an agent (any model with tool-calling, e.g. Claude).
3. Create a workflow: `Manual Trigger → Edit Fields (Set)` with sample data (e.g. `{ "orders": [{ "id": 1, "total": 99 }] }`) `→ Message an Agent` with message: *"Summarize the data the previous node produced."*
4. Execute the workflow.
5. Verify in the node's output: `toolCalls` contains a `fetch_workflow_context` round-trip (overview call, then a node-output call), and `response` reflects the Set node's data.
6. Also verify the agent session view shows the tool calls.

- [ ] **Step 4: Report results to the user** — including any deviation found during the demo.
