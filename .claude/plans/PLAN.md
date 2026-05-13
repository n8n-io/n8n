# Chat-With-Workflow Side Panel Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a 1-day MVP of a collapsible side panel that lets a user ask read-only questions about the workflow currently open in the editor (e.g. "What triggers this workflow?", "Which credentials are used?", "What happens if the HTTP node fails?"). Strictly read-only — the agent describes and traces, never modifies.

**Architecture:** Reuse the existing **Instance AI** runtime (thread runtime, SSE streaming, agent timeline UI). The chat panel is a thin wrapper around a *thread-scoped* embedding of `InstanceAiThreadView.vue`, opened in the editor route. A new **workflow-context tool** (in `@n8n/instance-ai/src/tools/`) exposes the currently open workflow's JSON + the open node id to the agent. A new **system-prompt suffix** clamps the agent into read-only Q&A mode for these threads. The tool only EXPOSES the workflow snapshot and metadata — there is no mutation path; the existing `workflows.tool.ts` write actions are filtered out via an `allowedActions` whitelist (the same mechanism `createOrchestratorDomainTools` uses today).

**Tech Stack:**
- Frontend: Vue 3, Pinia, `@n8n/design-system` (`N8nResizeWrapper`, `N8nIcon`, `N8nButton`), `@n8n/i18n`, Vitest.
- Backend: `@n8n/instance-ai` (Mastra agents, zod schemas), `packages/cli` Express controller, `@n8n/api-types` request schema, Jest.
- Existing patterns reused: `chatPanel.store.ts` (sliding collapsible panel), `InstanceAiThreadView.vue` (chat UI), `instanceAi.threadRuntime.ts` (SSE + sendMessage), `workflowsStore.workflowId` + `useWorkflowDocumentStore` (current workflow), `ndvStore.activeNodeName` (open node).

**Scope (in vs out):**
- ✅ In (MVP): panel entry button, collapsible side panel, dedicated read-only thread per editor session, `workflow-context` tool, read-only system prompt, end-to-end Q&A wired to existing streaming UI.
- ❌ Out of scope (stretch): citation-driven node highlighting on canvas, per-workflow persistent threads, starter-question chips, telemetry, multi-language strings beyond English, audit-log push events.

---

## File Structure

New files (frontend):
- `packages/frontend/editor-ui/src/features/ai/workflowChat/WorkflowChatPanel.vue` — mounted side panel host (collapsible, resizable).
- `packages/frontend/editor-ui/src/features/ai/workflowChat/WorkflowChatToggleButton.vue` — button rendered in the editor header to open/close the panel.
- `packages/frontend/editor-ui/src/features/ai/workflowChat/workflowChatPanel.store.ts` — Pinia store: `isOpen`, `width`, `threadId`, `open()`, `close()`, `toggle()`, `updateWidth()`.
- `packages/frontend/editor-ui/src/features/ai/workflowChat/useWorkflowContext.ts` — composable that snapshots `{ workflowId, nodes, connections, activeNodeName }` from the editor stores for sending on each message.
- `packages/frontend/editor-ui/src/features/ai/workflowChat/constants.ts` — width/min/max constants, store id, thread-mode literal.
- `packages/frontend/editor-ui/src/features/ai/workflowChat/__tests__/workflowChatPanel.store.test.ts` — Vitest.
- `packages/frontend/editor-ui/src/features/ai/workflowChat/__tests__/useWorkflowContext.test.ts` — Vitest.
- `packages/frontend/editor-ui/src/features/ai/workflowChat/__tests__/WorkflowChatPanel.test.ts` — Vitest (component smoke).

Modified files (frontend):
- `packages/frontend/editor-ui/src/features/ai/instanceAi/instanceAi.api.ts` — extend `postMessage` to forward an optional `workflowContext` payload.
- `packages/frontend/editor-ui/src/features/ai/instanceAi/instanceAi.threadRuntime.ts` — accept an optional context-provider hook; pass per-message context through `postMessage`.
- `packages/frontend/editor-ui/src/features/ai/instanceAi/instanceAi.store.ts` — allow creating a runtime that is flagged as "workflow chat" so the runtime sends `workflowContext` and tags the thread mode `workflow-chat`.
- `packages/frontend/editor-ui/src/app/App.vue` — mount `<WorkflowChatPanel />` alongside the existing `<AppChatPanel />`.
- Editor header (Workflow view) component (`packages/frontend/editor-ui/src/features/canvas/components/canvas-chrome/...` — exact path discovered in task 9): add `<WorkflowChatToggleButton />`.
- `packages/frontend/@n8n/i18n/src/locales/en.json` — new `workflowChat.*` strings.

New files (backend / instance-ai):
- `packages/@n8n/instance-ai/src/tools/workflow-context.tool.ts` — new tool: `describe-current-workflow` (default action) + `get-current-node` (when an NDV is open). Read-only, no service mutations.
- `packages/@n8n/instance-ai/src/agent/workflow-chat-prompt.ts` — exports `WORKFLOW_CHAT_READONLY_INSTRUCTIONS` string appended to the system prompt when the thread is in workflow-chat mode.
- `packages/@n8n/instance-ai/src/tools/__tests__/workflow-context.tool.test.ts` — Jest tests for input validation, snapshot fidelity, node lookup, and the absence of mutation surface.

Modified files (backend):
- `packages/@n8n/instance-ai/src/types.ts` — extend `InstanceAiContext` with optional `currentWorkflowSnapshot?: { workflowId: string; name?: string; nodes: WorkflowNode[]; connections: Record<string, unknown>; activeNodeName?: string }` (runtime-only field; not persisted, mirrors `currentUserAttachments` pattern).
- `packages/@n8n/instance-ai/src/tools/index.ts` — register `workflow-context` only when `context.currentWorkflowSnapshot` is set (same conditional-registration pattern as `parse-file`).
- `packages/@n8n/instance-ai/src/agent/system-prompt.ts` — accept `workflowChatMode?: boolean` and conditionally append `WORKFLOW_CHAT_READONLY_INSTRUCTIONS` (which also instructs the agent to use a *whitelist* of read-only tools and refuse write requests).
- `packages/@n8n/instance-ai/src/agent/__tests__/system-prompt.test.ts` — add cases for the new mode.
- `packages/@n8n/api-types/src/schemas/instance-ai.schema.ts` — add `workflowContext` (optional) to `InstanceAiSendMessageRequest`; export the inferred type.
- `packages/cli/src/modules/instance-ai/instance-ai.controller.ts` — forward `payload.workflowContext` to `startRun`.
- `packages/cli/src/modules/instance-ai/instance-ai.service.ts` — thread `workflowContext` through `startRun` → `runAgent`, attach it to the per-run `InstanceAiContext`, set `workflowChatMode: true` on the system prompt when present.
- `packages/cli/src/modules/instance-ai/__tests__/instance-ai.controller.test.ts` + `…service.test.ts` — extend existing test fixtures for the new field.

---

## Tasks

### 1. Branch sanity check

- [ ] Confirm you are on branch `cstuncsik/hackmation-chat-with-workflow` and inside `/Users/csaba/conductor/workspaces/n8n/hackmation-chat-with-workflow`.

```bash
pwd
git branch --show-current
git status
```

**Expected:**
```
/Users/csaba/conductor/workspaces/n8n/hackmation-chat-with-workflow
cstuncsik/hackmation-chat-with-workflow
nothing to commit, working tree clean
```

### 2. Add `workflowContext` to the request schema (TDD: shape first)

- [ ] Edit `packages/@n8n/api-types/src/schemas/instance-ai.schema.ts`. Locate `InstanceAiSendMessageRequest` (around line 662). Add a workflow-context block that the FE includes only when sending from the workflow chat panel.

Insert above the class definition:
```ts
const workflowContextNodeSchema = z.object({
	name: z.string(),
	type: z.string(),
	typeVersion: z.number().optional(),
	parameters: z.record(z.unknown()).optional(),
	credentials: z.record(z.unknown()).optional(),
	disabled: z.boolean().optional(),
	position: z.array(z.number()).optional(),
	webhookId: z.string().optional(),
});

const workflowContextSchema = z.object({
	workflowId: z.string(),
	name: z.string().optional(),
	nodes: z.array(workflowContextNodeSchema).max(500),
	connections: z.record(z.unknown()),
	activeNodeName: z.string().optional(),
});

export type InstanceAiWorkflowContext = z.infer<typeof workflowContextSchema>;
```

Then add `workflowContext: workflowContextSchema.optional(),` as a new field in `InstanceAiSendMessageRequest`.

- [ ] Re-export `InstanceAiWorkflowContext` from `packages/@n8n/api-types/src/index.ts` (find the `InstanceAiSendMessageRequest` export and add the type alongside).

- [ ] Run typecheck on the api-types package:
```bash
cd packages/@n8n/api-types && pnpm typecheck
```
**Expected:** no errors.

### 3. Extend `InstanceAiContext` with a runtime-only workflow snapshot

- [ ] Edit `packages/@n8n/instance-ai/src/types.ts`. Add to `InstanceAiContext` (next to `currentUserAttachments`):

```ts
/**
 * Snapshot of the workflow the user has open in the editor when chatting in
 * workflow-chat mode. Runtime-only — not persisted. Read-only: tools that
 * consume this snapshot must never call mutating services.
 */
currentWorkflowSnapshot?: {
	workflowId: string;
	name?: string;
	nodes: WorkflowNode[];
	connections: Record<string, unknown>;
	activeNodeName?: string;
};
```

(`WorkflowNode` is already exported from the same file.)

- [ ] Run typecheck:
```bash
cd packages/@n8n/instance-ai && pnpm typecheck
```
**Expected:** no errors.

### 4. Write failing tests for the new `workflow-context` tool

- [ ] Create `packages/@n8n/instance-ai/src/tools/__tests__/workflow-context.tool.test.ts`:

```ts
import type { InstanceAiContext } from '../../types';
import { createWorkflowContextTool, WORKFLOW_CONTEXT_TOOL_ID } from '../workflow-context.tool';

function ctxWithSnapshot(
	overrides: Partial<NonNullable<InstanceAiContext['currentWorkflowSnapshot']>> = {},
): InstanceAiContext {
	return {
		userId: 'u1',
		workflowService: {} as InstanceAiContext['workflowService'],
		executionService: {} as InstanceAiContext['executionService'],
		nodeService: {} as InstanceAiContext['nodeService'],
		credentialService: {} as InstanceAiContext['credentialService'],
		dataTableService: {} as InstanceAiContext['dataTableService'],
		currentWorkflowSnapshot: {
			workflowId: 'wf-1',
			name: 'Demo',
			nodes: [
				{ name: 'Trigger', type: 'n8n-nodes-base.scheduleTrigger', position: [0, 0] },
				{ name: 'HTTP', type: 'n8n-nodes-base.httpRequest', position: [200, 0] },
			],
			connections: { Trigger: { main: [[{ node: 'HTTP', type: 'main', index: 0 }]] } },
			activeNodeName: 'HTTP',
			...overrides,
		},
	} as unknown as InstanceAiContext;
}

function noSuspendCtx() {
	return { agent: { resumeData: undefined, suspend: undefined } } as never;
}

describe('workflow-context tool', () => {
	it('exposes the expected tool id and a description that mentions read-only', () => {
		const tool = createWorkflowContextTool(ctxWithSnapshot());
		expect(tool.id).toBe(WORKFLOW_CONTEXT_TOOL_ID);
		expect(String((tool as { description: string }).description)).toMatch(/read-only/i);
	});

	it('describe-current-workflow returns nodes, connections, and triggers', async () => {
		const tool = createWorkflowContextTool(ctxWithSnapshot());
		const result = await (tool as { execute: Function }).execute(
			{ action: 'describe-current-workflow' },
			noSuspendCtx(),
		);
		expect(result.workflowId).toBe('wf-1');
		expect(result.name).toBe('Demo');
		expect(result.nodes).toHaveLength(2);
		expect(result.connections).toEqual({
			Trigger: { main: [[{ node: 'HTTP', type: 'main', index: 0 }]] },
		});
		expect(result.triggerNodes).toEqual(['Trigger']);
	});

	it('get-current-node returns the node referenced by activeNodeName', async () => {
		const tool = createWorkflowContextTool(ctxWithSnapshot());
		const result = await (tool as { execute: Function }).execute(
			{ action: 'get-current-node' },
			noSuspendCtx(),
		);
		expect(result.node?.name).toBe('HTTP');
	});

	it('get-current-node returns null when no node is active', async () => {
		const tool = createWorkflowContextTool(ctxWithSnapshot({ activeNodeName: undefined }));
		const result = await (tool as { execute: Function }).execute(
			{ action: 'get-current-node' },
			noSuspendCtx(),
		);
		expect(result.node).toBeNull();
	});

	it('returns a clear error when no workflow snapshot is present', async () => {
		const ctx = { ...ctxWithSnapshot(), currentWorkflowSnapshot: undefined } as InstanceAiContext;
		const tool = createWorkflowContextTool(ctx);
		const result = await (tool as { execute: Function }).execute(
			{ action: 'describe-current-workflow' },
			noSuspendCtx(),
		);
		expect(result).toEqual({ error: 'no-open-workflow' });
	});
});
```

- [ ] Run the failing tests:
```bash
cd packages/@n8n/instance-ai && pnpm test workflow-context.tool.test.ts
```
**Expected:** all four tests fail (module not found). This is the red step.

### 5. Implement the `workflow-context` tool (read-only)

- [ ] Create `packages/@n8n/instance-ai/src/tools/workflow-context.tool.ts`:

```ts
/**
 * Workflow-context tool — read-only.
 *
 * Exposes the workflow the user has open in the editor (and the currently
 * selected node, if any) to the agent. NEVER mutates anything: there is no
 * service call here, and the workflow-chat mode strips write tools from the
 * agent's tool surface.
 */
import { createTool } from '@mastra/core/tools';
import { z } from 'zod';

import { sanitizeInputSchema } from '../agent/sanitize-mcp-schemas';
import type { InstanceAiContext, WorkflowNode } from '../types';

export const WORKFLOW_CONTEXT_TOOL_ID = 'workflow-context';

const describeAction = z.object({
	action: z
		.literal('describe-current-workflow')
		.describe(
			'Return the open workflow as JSON: id, name, nodes, connections, and the list of trigger node names. Read-only — does not modify the workflow.',
		),
});

const currentNodeAction = z.object({
	action: z
		.literal('get-current-node')
		.describe(
			'Return the node currently focused in the Node Details View (NDV), or null if no NDV is open. Read-only.',
		),
});

const inputSchema = sanitizeInputSchema(z.discriminatedUnion('action', [describeAction, currentNodeAction]));

type Input = z.infer<typeof describeAction> | z.infer<typeof currentNodeAction>;

const TRIGGER_TYPE_RE = /(^|\.)([a-zA-Z0-9]+)Trigger$/;

function listTriggerNodes(nodes: readonly WorkflowNode[]): string[] {
	return nodes.filter((n) => TRIGGER_TYPE_RE.test(n.type)).map((n) => n.name);
}

export function createWorkflowContextTool(context: InstanceAiContext) {
	return createTool({
		id: WORKFLOW_CONTEXT_TOOL_ID,
		description:
			'Read-only access to the workflow the user currently has open in the editor. Use this to answer questions about triggers, node wiring, credentials, and what each node does. This tool cannot modify the workflow.',
		inputSchema,
		execute: async (input: Input) => {
			const snapshot = context.currentWorkflowSnapshot;
			if (!snapshot) return { error: 'no-open-workflow' as const };

			switch (input.action) {
				case 'describe-current-workflow':
					return {
						workflowId: snapshot.workflowId,
						name: snapshot.name,
						nodes: snapshot.nodes,
						connections: snapshot.connections,
						triggerNodes: listTriggerNodes(snapshot.nodes),
						activeNodeName: snapshot.activeNodeName ?? null,
					};
				case 'get-current-node': {
					const name = snapshot.activeNodeName;
					if (!name) return { node: null };
					const node = snapshot.nodes.find((n) => n.name === name) ?? null;
					return { node };
				}
			}
		},
	});
}
```

- [ ] Re-run the tool tests:
```bash
cd packages/@n8n/instance-ai && pnpm test workflow-context.tool.test.ts
```
**Expected:** all tests pass.

### 6. Register `workflow-context` conditionally and write the read-only prompt

- [ ] Edit `packages/@n8n/instance-ai/src/tools/index.ts`:
  - Import: `import { createWorkflowContextTool } from './workflow-context.tool';`
  - In `createAllTools`, add a final spread:
    ```ts
    ...(context.currentWorkflowSnapshot
      ? { 'workflow-context': createWorkflowContextTool(context) }
      : {}),
    ```

- [ ] Create `packages/@n8n/instance-ai/src/agent/workflow-chat-prompt.ts`:

```ts
export const WORKFLOW_CHAT_READONLY_INSTRUCTIONS = `
## Workflow Chat (Read-Only Mode)

You are answering questions about the workflow the user currently has open in the editor.

**You MUST NOT modify anything.** This includes:
- Do NOT call build-workflow-with-agent, plan, create-tasks, delegate, workflows(action="publish"|"setup"|"delete"|"unarchive"|"restore-version"|"update-version"), executions(action="run"|"stop"), data-tables (any action), credentials(action="setup"|"delete"|"test"), workspace tools that create/move/tag, or any MCP write tool.
- If the user asks for a change ("add a node", "fix this", "make it do X"), explain that you are in read-only Q&A mode for this panel and that they can use the AI builder or the editor to make changes.

**Use these tools** to answer the user:
- \`workflow-context(action="describe-current-workflow")\` — get the open workflow's nodes, connections, and triggers.
- \`workflow-context(action="get-current-node")\` — get details about the node the NDV is focused on, if any.
- \`nodes\` — look up node-type documentation, properties, and credential requirements.
- \`credentials(action="list"|"get"|"search-types")\` — read-only credential lookups.
- \`executions(action="list"|"getStatus"|"getResult"|"getDebugInfo"|"getNodeOutput")\` — read recent runs of this workflow.
- \`workflows(action="list"|"get"|"list-versions"|"get-version")\` — read-only workflow lookups.

**Answering style.** Be concise. Reference node names exactly as they appear. When asked "what happens if node X fails", trace the connections and explain branches; mention \`continueOnFail\`/error workflows only if the node parameters set them. When asked about credentials, list the credential type required by each node that uses one, and whether a credential is currently selected.

**Never invent.** If \`workflow-context\` returns \`{ error: "no-open-workflow" }\`, tell the user to open a workflow first.
`;
```

- [ ] Edit `packages/@n8n/instance-ai/src/agent/system-prompt.ts`:
  - Import `WORKFLOW_CHAT_READONLY_INSTRUCTIONS`.
  - Add `workflowChatMode?: boolean` to `SystemPromptOptions`.
  - At the end of `getSystemPrompt`, append the section if the mode is on:
    ```ts
    const workflowChatSection = options.workflowChatMode ? `\n\n${WORKFLOW_CHAT_READONLY_INSTRUCTIONS}` : '';
    return baseReturn + workflowChatSection;
    ```
    (Restructure the existing return into a `const baseReturn = ...` if necessary — keep all current content unchanged.)

- [ ] Run instance-ai unit tests:
```bash
cd packages/@n8n/instance-ai && pnpm test
```
**Expected:** all green. If the existing `system-prompt.test.ts` snapshot fails because the new option defaults to false, the snapshot should be unchanged — only verify that no test broke.

- [ ] Add a small test to `packages/@n8n/instance-ai/src/agent/__tests__/system-prompt.test.ts` covering the new mode:
```ts
it('includes workflow-chat read-only instructions when workflowChatMode is true', () => {
  const prompt = getSystemPrompt({ workflowChatMode: true });
  expect(prompt).toContain('Workflow Chat (Read-Only Mode)');
});

it('omits workflow-chat read-only instructions by default', () => {
  const prompt = getSystemPrompt({});
  expect(prompt).not.toContain('Workflow Chat (Read-Only Mode)');
});
```
Re-run:
```bash
cd packages/@n8n/instance-ai && pnpm test system-prompt.test.ts
```
**Expected:** new tests pass.

### 7. Thread `workflowContext` through the CLI controller and service

- [ ] Edit `packages/cli/src/modules/instance-ai/instance-ai.controller.ts`. In the `chat` handler, pass the new field through:

```ts
const runId = this.instanceAiService.startRun(
    req.user,
    threadId,
    payload.message,
    payload.researchMode,
    payload.attachments,
    payload.timeZone,
    payload.pushRef,
    payload.workflowContext,
);
```

- [ ] Edit `packages/cli/src/modules/instance-ai/instance-ai.service.ts`:
  - Find `startRun(...)` (note its existing parameter order — currently `user, threadId, message, researchMode, attachments, timeZone, pushRef`). Append `workflowContext?: InstanceAiWorkflowContext` as the final parameter.
  - Thread it down through `runAgent` (or whichever method composes the `InstanceAiContext`) and set `currentWorkflowSnapshot` on the context when present.
  - Pass `workflowChatMode: !!workflowContext` to `getSystemPrompt(...)` at the call site that builds the system prompt.

- [ ] Update Jest fixtures in `packages/cli/src/modules/instance-ai/__tests__/instance-ai.controller.test.ts` and `…service.test.ts` so the existing mocks accept the extra argument (most existing tests pass `undefined` for it; do not add new tests in this task — covered in task 12).

- [ ] Typecheck:
```bash
cd packages/cli && pnpm typecheck
```
**Expected:** no errors.

### 8. Frontend: extend `postMessage` and the thread runtime

- [ ] Edit `packages/frontend/editor-ui/src/features/ai/instanceAi/instanceAi.api.ts`. Import the new type:
```ts
import type { InstanceAiAttachment, InstanceAiEnsureThreadResponse, InstanceAiSendMessageResponse, InstanceAiConfirmRequest, InstanceAiWorkflowContext } from '@n8n/api-types';
```
Append an optional `workflowContext?: InstanceAiWorkflowContext` argument to `postMessage` and include it in the request body when present.

- [ ] Edit `packages/frontend/editor-ui/src/features/ai/instanceAi/instanceAi.threadRuntime.ts`:
  - Extend `ThreadRuntimeHooks` with:
    ```ts
    /** Read at sendMessage time — supplies a per-message workflow snapshot for workflow-chat threads. */
    getWorkflowContext?: () => InstanceAiWorkflowContext | undefined;
    ```
  - In `dispatchUserMessage`, call `hooks.getWorkflowContext?.()` and pass the result to `postMessage`.

- [ ] Edit `packages/frontend/editor-ui/src/features/ai/instanceAi/instanceAi.store.ts`. Where runtimes are created, allow callers to inject `getWorkflowContext`. (Search for `createThreadRuntime` or wherever `ThreadRuntimeHooks` are built — pass through an optional override.)

- [ ] Typecheck:
```bash
cd packages/frontend/editor-ui && pnpm typecheck
```
**Expected:** no errors.

### 9. Frontend: build the workflow-chat panel store

- [ ] Create `packages/frontend/editor-ui/src/features/ai/workflowChat/constants.ts`:
```ts
export const WORKFLOW_CHAT_PANEL_STORE_ID = 'workflowChatPanel';
export const WORKFLOW_CHAT_MIN_WIDTH = 360;
export const WORKFLOW_CHAT_MAX_WIDTH = 520;
export const WORKFLOW_CHAT_DEFAULT_WIDTH = 400;
```

- [ ] Create `packages/frontend/editor-ui/src/features/ai/workflowChat/workflowChatPanel.store.ts`:
```ts
import { computed, ref } from 'vue';
import { defineStore } from 'pinia';
import { useLocalStorage } from '@vueuse/core';
import {
	WORKFLOW_CHAT_PANEL_STORE_ID,
	WORKFLOW_CHAT_MIN_WIDTH,
	WORKFLOW_CHAT_MAX_WIDTH,
	WORKFLOW_CHAT_DEFAULT_WIDTH,
} from './constants';

export const useWorkflowChatPanelStore = defineStore(WORKFLOW_CHAT_PANEL_STORE_ID, () => {
	const isOpen = ref(false);
	const width = useLocalStorage('workflowChat.width', WORKFLOW_CHAT_DEFAULT_WIDTH);
	const threadId = ref<string | null>(null);

	function open() { isOpen.value = true; }
	function close() { isOpen.value = false; }
	function toggle() { isOpen.value = !isOpen.value; }
	function setThreadId(id: string) { threadId.value = id; }
	function updateWidth(next: number) {
		width.value = Math.min(Math.max(next, WORKFLOW_CHAT_MIN_WIDTH), WORKFLOW_CHAT_MAX_WIDTH);
	}

	return {
		isOpen: computed(() => isOpen.value),
		width: computed(() => width.value),
		threadId: computed(() => threadId.value),
		MIN_WIDTH: WORKFLOW_CHAT_MIN_WIDTH,
		MAX_WIDTH: WORKFLOW_CHAT_MAX_WIDTH,
		open,
		close,
		toggle,
		setThreadId,
		updateWidth,
	};
});
```

- [ ] Create `packages/frontend/editor-ui/src/features/ai/workflowChat/__tests__/workflowChatPanel.store.test.ts`:
```ts
import { setActivePinia, createPinia } from 'pinia';
import { describe, it, expect, beforeEach } from 'vitest';
import { useWorkflowChatPanelStore } from '../workflowChatPanel.store';

describe('workflowChatPanel store', () => {
	beforeEach(() => setActivePinia(createPinia()));

	it('starts closed and toggles', () => {
		const s = useWorkflowChatPanelStore();
		expect(s.isOpen).toBe(false);
		s.toggle();
		expect(s.isOpen).toBe(true);
		s.close();
		expect(s.isOpen).toBe(false);
	});

	it('clamps width to min/max', () => {
		const s = useWorkflowChatPanelStore();
		s.updateWidth(100);
		expect(s.width).toBe(s.MIN_WIDTH);
		s.updateWidth(9999);
		expect(s.width).toBe(s.MAX_WIDTH);
	});
});
```

- [ ] Run:
```bash
cd packages/frontend/editor-ui && pnpm test workflowChatPanel.store
```
**Expected:** both tests pass.

### 10. Frontend: build the `useWorkflowContext` composable

- [ ] Create `packages/frontend/editor-ui/src/features/ai/workflowChat/useWorkflowContext.ts`:
```ts
import { useWorkflowsStore } from '@/app/stores/workflows.store';
import { useWorkflowDocumentStore, createWorkflowDocumentId } from '@/app/stores/workflowDocument.store';
import { useNDVStore } from '@/features/ndv/shared/ndv.store';
import type { InstanceAiWorkflowContext } from '@n8n/api-types';

export function useWorkflowContext() {
	function snapshot(): InstanceAiWorkflowContext | undefined {
		const workflowsStore = useWorkflowsStore();
		const ndvStore = useNDVStore();
		const workflowId = workflowsStore.workflowId;
		if (!workflowId) return undefined;
		const doc = useWorkflowDocumentStore(createWorkflowDocumentId(workflowId));
		return {
			workflowId,
			name: workflowsStore.workflowName,
			nodes: doc.allNodes,
			connections: doc.connectionsBySourceNode,
			activeNodeName: ndvStore.activeNodeName ?? undefined,
		};
	}
	return { snapshot };
}
```
(If `workflowsStore.workflowName` is not directly exposed, use the equivalent getter — verify by reading the store before writing this; fall back to `doc.name` if needed.)

- [ ] Create `packages/frontend/editor-ui/src/features/ai/workflowChat/__tests__/useWorkflowContext.test.ts` — a minimal Vitest that mocks the three stores and asserts `snapshot()` returns the expected shape, plus `undefined` when there is no workflow id. (Follow the existing pinia-mocking style in `assistant/__tests__/`.)

- [ ] Run:
```bash
cd packages/frontend/editor-ui && pnpm test useWorkflowContext
```
**Expected:** tests pass.

### 11. Frontend: build the panel and toggle components

- [ ] Create `packages/frontend/editor-ui/src/features/ai/workflowChat/WorkflowChatPanel.vue`. Mirror the structure of `AssistantsHub.vue`:
  - Use `<N8nResizeWrapper :supported-directions="['left']" ...>` (from `@n8n/design-system` — no Element Plus / reka-ui imports).
  - Inside the wrapper, mount `<InstanceAiThreadView />` from `@/features/ai/instanceAi/InstanceAiThreadView.vue`, **bound to the thread id from the store**. The thread is ensured (lazy-created) via `instanceAiStore.ensureThread(threadId)` on first open.
  - At first open, call `instanceAiStore.createWorkflowChatRuntime({ getWorkflowContext: () => useWorkflowContext().snapshot() })` (new store action, added in task 8).
  - `data-testid="workflow-chat-panel"` (single value — no spaces).
  - Width bound to `store.width`; resize triggers `store.updateWidth`.

- [ ] Create `packages/frontend/editor-ui/src/features/ai/workflowChat/WorkflowChatToggleButton.vue`:
  - `<N8nIconButton>` from `@n8n/design-system` with a sparkles/chat icon.
  - `data-testid="workflow-chat-toggle"`.
  - On click, call `useWorkflowChatPanelStore().toggle()`.
  - Accessible label from i18n: `workflowChat.toggle.tooltip`.

- [ ] Create `packages/frontend/editor-ui/src/features/ai/workflowChat/__tests__/WorkflowChatPanel.test.ts` — smoke test that mounts the panel with the store open and asserts the panel root + child `InstanceAiThreadView` stub render.

- [ ] Add i18n strings in `packages/frontend/@n8n/i18n/src/locales/en.json`:
```json
"workflowChat.toggle.tooltip": "Ask about this workflow",
"workflowChat.panel.title": "Workflow chat",
"workflowChat.panel.empty.title": "Ask anything about this workflow",
"workflowChat.panel.empty.body": "Try: \"What triggers this workflow?\", \"Which credentials are used?\", \"What happens if a node fails?\""
```
(Insert near other `instanceAi.*` strings to keep file sorted.)

### 12. Wire the panel into the editor

- [ ] Edit `packages/frontend/editor-ui/src/app/App.vue`:
  - Import `WorkflowChatPanel` and mount it alongside `<AppChatPanel ... />` inside the same layout slot. It should be hidden by default (`v-if="workflowChatStore.isOpen"` *inside* the component handles the slide animation — match the `AssistantsHub` pattern).

- [ ] Find the editor header that renders the workflow toolbar (look for the existing "share" / "executions" buttons; common location is in `packages/frontend/editor-ui/src/features/canvas/` or `packages/frontend/editor-ui/src/views/`). Add `<WorkflowChatToggleButton />` next to the existing buttons, only when `currentRoute.name` is the workflow-edit route. Use the Socraticode index to locate the exact file:
  ```bash
  pnpm -s --filter=editor-ui exec true # ensure workspace is initialised
  ```
  Run a `codebase_search` for "workflow header toolbar share button" if unsure.

### 13. Backend Jest tests for controller + service threading

- [ ] In `packages/cli/src/modules/instance-ai/__tests__/instance-ai.controller.test.ts`, add a single test that asserts the controller forwards `workflowContext` to `startRun` unchanged when present.

- [ ] In `…service.test.ts`, add a test that asserts:
  1. `currentWorkflowSnapshot` is set on the `InstanceAiContext` when `workflowContext` is passed.
  2. The system prompt is built with `workflowChatMode: true` when the snapshot is present.

- [ ] Run:
```bash
cd packages/cli && pnpm test instance-ai
```
**Expected:** all instance-ai tests pass.

### 14. Final repo-wide checks

- [ ] From the repo root:
```bash
pnpm typecheck > typecheck.log 2>&1 && tail -n 30 typecheck.log
```
**Expected:** exit 0, no errors in the changed packages.

- [ ] Lint the touched packages:
```bash
cd packages/@n8n/instance-ai && pnpm lint
cd ../../../packages/cli && pnpm lint
cd ../frontend/editor-ui && pnpm lint
cd ../@n8n/i18n && pnpm lint
```
**Expected:** clean.

- [ ] Smoke-run the relevant unit-test suites once more:
```bash
cd packages/@n8n/instance-ai && pnpm test
cd ../../cli && pnpm test instance-ai
cd ../frontend/editor-ui && pnpm test workflowChat
```
**Expected:** all green.

### 15. Manual verification checklist (out of test runner)

- [ ] Run `pnpm dev` in the worktree. Open a non-trivial workflow in the editor.
- [ ] Click the new toggle button — the panel slides in from the right.
- [ ] Ask "What triggers this workflow?" — the agent calls `workflow-context(action="describe-current-workflow")` and answers with the trigger node names.
- [ ] Open the NDV on an HTTP node, ask "What does this node do?" — the agent calls `workflow-context(action="get-current-node")` and describes the node.
- [ ] Ask "Add a Set node after the HTTP request" — the agent refuses politely and points to the AI builder.

---

## Self-Review

This plan reuses Instance AI's runtime, SSE, and timeline UI almost entirely, which is the single biggest risk-mitigator for a 1-day MVP — the only genuinely new code is one tool, one prompt fragment, one schema field, and a small panel shell. Read-only is enforced at three layers: (1) the tool itself has no service mutations and only reads `context.currentWorkflowSnapshot`; (2) the system-prompt suffix explicitly forbids every write tool and instructs the agent to refuse change requests; (3) the snapshot is per-message ephemeral and never persisted. The plan avoids `any`, `as`, direct Element Plus / reka-ui imports, and the `ApplicationError` class; uses zod for the schema, vitest for FE, jest for BE, the `@n8n/design-system` `N8nResizeWrapper` for sizing, and single-value `data-testid`s. Tasks are TDD-ordered (schema → red tool tests → tool implementation → wiring → UI → integration). Two implementation gotchas I want the executor to watch for: the editor-header insertion point in task 12 needs a real lookup (left intentionally as a Socraticode search step rather than a guessed path), and the existing `instance-ai.service.ts` parameter list is long — appending one more parameter is safe but worth grepping all call sites before committing. Out of scope (canvas highlighting, per-workflow persistence, starter chips, telemetry) is explicitly listed to keep the MVP shippable in a day.
