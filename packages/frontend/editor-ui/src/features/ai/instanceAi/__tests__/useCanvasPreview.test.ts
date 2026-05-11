import { describe, test, expect, vi, beforeEach } from 'vitest';
import { ref, reactive, nextTick, type Ref } from 'vue';
import type {
	InstanceAiMessage,
	InstanceAiAgentNode,
	InstanceAiToolCallState,
} from '@n8n/api-types';
import { useCanvasPreview } from '../useCanvasPreview';
import type { ResourceEntry } from '../useResourceRegistry';

// ---------------------------------------------------------------------------
// Factories
// ---------------------------------------------------------------------------

function makeToolCall(overrides: Partial<InstanceAiToolCallState>): InstanceAiToolCallState {
	return {
		toolCallId: 'tc-1',
		toolName: 'some-tool',
		args: {},
		isLoading: false,
		...overrides,
	};
}

function makeAgentNode(overrides: Partial<InstanceAiAgentNode> = {}): InstanceAiAgentNode {
	return {
		agentId: 'agent-1',
		role: 'orchestrator',
		status: 'completed',
		textContent: '',
		reasoning: '',
		toolCalls: [],
		children: [],
		timeline: [],
		...overrides,
	};
}

function makeMessage(overrides: Partial<InstanceAiMessage> = {}): InstanceAiMessage {
	return {
		id: 'msg-1',
		role: 'assistant',
		content: '',
		createdAt: new Date().toISOString(),
		...overrides,
	} as InstanceAiMessage;
}

// ---------------------------------------------------------------------------
// Thread mock
// ---------------------------------------------------------------------------

function createMockThread() {
	const messages = ref<InstanceAiMessage[]>([]) as Ref<InstanceAiMessage[]>;
	const isStreaming = ref(false);
	const isHydratingThread = ref(false);
	const producedArtifacts = ref(new Map<string, ResourceEntry>());
	const resourceNameIndex = ref(new Map<string, ResourceEntry>());

	return reactive({
		messages,
		isStreaming,
		isHydratingThread,
		producedArtifacts,
		resourceNameIndex,
		currentThreadId: 'thread-1',
	});
}

type MockThread = ReturnType<typeof createMockThread>;

// ---------------------------------------------------------------------------
// Registry helpers — populate the thread's producedArtifacts so computed
// activeWorkflowId / activeDataTableId can derive values from tabs.
// ---------------------------------------------------------------------------

function registerWorkflow(thread: MockThread, id: string, name = `Workflow ${id}`) {
	const entry: ResourceEntry = { type: 'workflow', id, name };
	const nextProduced = new Map(thread.producedArtifacts);
	nextProduced.set(id, entry);
	thread.producedArtifacts = nextProduced;
	const nextByName = new Map(thread.resourceNameIndex);
	nextByName.set(name.toLowerCase(), entry);
	thread.resourceNameIndex = nextByName;
}

function registerDataTable(
	thread: MockThread,
	id: string,
	name = `Table ${id}`,
	projectId?: string,
) {
	const entry: ResourceEntry = { type: 'data-table', id, name, projectId };
	const nextProduced = new Map(thread.producedArtifacts);
	nextProduced.set(id, entry);
	thread.producedArtifacts = nextProduced;
	const nextByName = new Map(thread.resourceNameIndex);
	nextByName.set(name.toLowerCase(), entry);
	thread.resourceNameIndex = nextByName;
}

// ---------------------------------------------------------------------------
// Route mock
// ---------------------------------------------------------------------------

function createMockRoute(threadId = 'thread-1') {
	return reactive({
		params: { threadId },
		path: '/instance-ai',
		name: 'instance-ai',
		matched: [],
		fullPath: '/instance-ai',
		query: {},
		hash: '',
		redirectedFrom: undefined,
		meta: {},
	});
}

// ---------------------------------------------------------------------------
// Test helper — create composable + flush
// ---------------------------------------------------------------------------

function setup(options?: { threadOverrides?: Partial<MockThread> }) {
	const thread = createMockThread();
	if (options?.threadOverrides) Object.assign(thread, options.threadOverrides);
	const route = createMockRoute();

	const result = useCanvasPreview({
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		thread: thread as any,
		threadId: () => route.params.threadId,
	});

	return { ...result, thread, route };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('useCanvasPreview', () => {
	beforeEach(() => {
		vi.restoreAllMocks();
	});

	describe('allArtifactTabs', () => {
		test('derives tabs from resource registry', () => {
			const ctx = setup();
			registerWorkflow(ctx.thread, 'wf-1', 'My Workflow');
			registerDataTable(ctx.thread, 'dt-1', 'My Table', 'proj-1');

			expect(ctx.allArtifactTabs.value).toEqual([
				{
					id: 'wf-1',
					type: 'workflow',
					name: 'My Workflow',
					icon: 'workflow',
					projectId: undefined,
				},
				{ id: 'dt-1', type: 'data-table', name: 'My Table', icon: 'table', projectId: 'proj-1' },
			]);
		});

		test('excludes credential entries', () => {
			const ctx = setup();
			const registry = new Map<string, ResourceEntry>();
			registry.set('wf-1', { type: 'workflow', id: 'wf-1', name: 'WF' });
			registry.set('cred-1', { type: 'credential', id: 'cred-1', name: 'Cred' });
			ctx.thread.producedArtifacts = registry;

			expect(ctx.allArtifactTabs.value).toHaveLength(1);
			expect(ctx.allArtifactTabs.value[0].type).toBe('workflow');
		});
	});

	describe('selectTab / closePreview', () => {
		test('selectTab sets activeTabId', () => {
			const ctx = setup();
			registerWorkflow(ctx.thread, 'wf-1');

			ctx.selectTab('wf-1');

			expect(ctx.activeTabId.value).toBe('wf-1');
			expect(ctx.activeWorkflowId.value).toBe('wf-1');
			expect(ctx.isPreviewVisible.value).toBe(true);
		});

		test('closePreview clears activeTabId', () => {
			const ctx = setup();
			registerWorkflow(ctx.thread, 'wf-1');
			ctx.selectTab('wf-1');

			ctx.closePreview();

			expect(ctx.activeTabId.value).toBeUndefined();
			expect(ctx.isPreviewVisible.value).toBe(false);
		});
	});

	describe('openWorkflowPreview', () => {
		test('sets activeWorkflowId and clears data table state', () => {
			const ctx = setup();
			registerDataTable(ctx.thread, 'dt-1', 'Table', 'proj-1');
			registerWorkflow(ctx.thread, 'wf-1');
			ctx.openDataTablePreview('dt-1', 'proj-1');

			ctx.openWorkflowPreview('wf-1');

			expect(ctx.activeWorkflowId.value).toBe('wf-1');
			expect(ctx.activeDataTableId.value).toBeNull();
			expect(ctx.activeDataTableProjectId.value).toBeNull();
		});

		test('makes isPreviewVisible true', () => {
			const ctx = setup();
			registerWorkflow(ctx.thread, 'wf-1');
			expect(ctx.isPreviewVisible.value).toBe(false);

			ctx.openWorkflowPreview('wf-1');
			expect(ctx.isPreviewVisible.value).toBe(true);
		});
	});

	describe('openDataTablePreview', () => {
		test('sets data table state and clears workflow state', () => {
			const ctx = setup();
			registerWorkflow(ctx.thread, 'wf-1');
			registerDataTable(ctx.thread, 'dt-1', 'Table', 'proj-1');
			ctx.openWorkflowPreview('wf-1');

			ctx.openDataTablePreview('dt-1', 'proj-1');

			expect(ctx.activeDataTableId.value).toBe('dt-1');
			expect(ctx.activeDataTableProjectId.value).toBe('proj-1');
			expect(ctx.activeWorkflowId.value).toBeNull();
		});

		test('makes isPreviewVisible true', () => {
			const ctx = setup();
			registerDataTable(ctx.thread, 'dt-1', 'Table', 'proj-1');
			expect(ctx.isPreviewVisible.value).toBe(false);

			ctx.openDataTablePreview('dt-1', 'proj-1');
			expect(ctx.isPreviewVisible.value).toBe(true);
		});
	});

	describe('thread switch (route.params.threadId change)', () => {
		test('resets all preview state on thread switch', async () => {
			const ctx = setup();
			registerWorkflow(ctx.thread, 'wf-1');
			ctx.openWorkflowPreview('wf-1');

			ctx.route.params.threadId = 'thread-2';
			await nextTick();

			expect(ctx.activeTabId.value).toBeUndefined();
			expect(ctx.activeWorkflowId.value).toBeNull();
			expect(ctx.activeDataTableId.value).toBeNull();
			expect(ctx.activeDataTableProjectId.value).toBeNull();
		});

		test('clears the preview on thread switch, then stays closed while the new thread hydrates', async () => {
			const ctx = setup();
			registerWorkflow(ctx.thread, 'wf-1');
			ctx.openWorkflowPreview('wf-1');
			expect(ctx.isPreviewVisible.value).toBe(true);

			ctx.route.params.threadId = 'thread-2';
			await nextTick();

			// Preview was cleared by thread switch.
			expect(ctx.isPreviewVisible.value).toBe(false);

			// Past artifacts surfacing during the new thread's hydration shouldn't
			// pop the panel — historical data, not a live build.
			ctx.thread.isHydratingThread = true;
			registerWorkflow(ctx.thread, 'wf-historical');
			ctx.thread.messages = [
				makeMessage({
					agentTree: makeAgentNode({
						toolCalls: [
							makeToolCall({
								toolCallId: 'tc-build',
								toolName: 'build-workflow',
								result: { success: true, workflowId: 'wf-historical' },
							}),
						],
					}),
				}),
			];
			await nextTick();

			expect(ctx.isPreviewVisible.value).toBe(false);
		});
	});

	describe('auto-open on build result', () => {
		test('auto-opens canvas when streaming and build result appears', async () => {
			const ctx = setup();
			ctx.thread.isStreaming = true;
			registerWorkflow(ctx.thread, 'wf-new');

			ctx.thread.messages = [
				makeMessage({
					agentTree: makeAgentNode({
						toolCalls: [
							makeToolCall({
								toolCallId: 'tc-build',
								toolName: 'build-workflow',
								result: { success: true, workflowId: 'wf-new' },
							}),
						],
					}),
				}),
			];
			await nextTick();

			expect(ctx.activeWorkflowId.value).toBe('wf-new');
			expect(ctx.isPreviewVisible.value).toBe(true);
		});

		test('does not auto-open while hydrating historical messages', async () => {
			const ctx = setup();
			// Simulate the loadHistoricalMessages window: artifacts that surface
			// as part of past data shouldn't pop the preview panel.
			ctx.thread.isHydratingThread = true;

			ctx.thread.messages = [
				makeMessage({
					agentTree: makeAgentNode({
						toolCalls: [
							makeToolCall({
								toolCallId: 'tc-build',
								toolName: 'build-workflow',
								result: { success: true, workflowId: 'wf-historical' },
							}),
						],
					}),
				}),
			];
			await nextTick();

			expect(ctx.activeTabId.value).toBeUndefined();
			expect(ctx.isPreviewVisible.value).toBe(false);
		});

		test('switches to latest artifact when a new workflow is built while viewing different artifact', async () => {
			const ctx = setup();
			registerDataTable(ctx.thread, 'dt-1', 'Table', 'proj-1');
			registerWorkflow(ctx.thread, 'wf-1');
			ctx.openDataTablePreview('dt-1', 'proj-1');
			ctx.thread.isStreaming = true;

			ctx.thread.messages = [
				makeMessage({
					agentTree: makeAgentNode({
						toolCalls: [
							makeToolCall({
								toolCallId: 'tc-build',
								toolName: 'build-workflow',
								result: { success: true, workflowId: 'wf-1' },
							}),
						],
					}),
				}),
			];
			await nextTick();

			// Should switch to the newly built workflow
			expect(ctx.activeTabId.value).toBe('wf-1');
			expect(ctx.activeWorkflowId.value).toBe('wf-1');
		});

		test('increments workflowRefreshKey on each build', async () => {
			const ctx = setup();
			ctx.thread.isStreaming = true;
			registerWorkflow(ctx.thread, 'wf-1');
			const initialKey = ctx.workflowRefreshKey.value;

			ctx.thread.messages = [
				makeMessage({
					agentTree: makeAgentNode({
						toolCalls: [
							makeToolCall({
								toolCallId: 'tc-1',
								toolName: 'build-workflow',
								result: { success: true, workflowId: 'wf-1' },
							}),
						],
					}),
				}),
			];
			await nextTick();

			expect(ctx.workflowRefreshKey.value).toBe(initialKey + 1);
		});
	});

	describe('auto-open data table preview', () => {
		test('auto-opens data table preview when streaming', async () => {
			const ctx = setup();
			ctx.thread.isStreaming = true;
			registerDataTable(ctx.thread, 'dt-1', 'Test Table');

			ctx.thread.messages = [
				makeMessage({
					agentTree: makeAgentNode({
						toolCalls: [
							makeToolCall({
								toolCallId: 'tc-create-dt',
								toolName: 'data-tables',
								args: { action: 'create' },
								result: { table: { id: 'dt-1', name: 'Test Table' } },
							}),
						],
					}),
				}),
			];
			await nextTick();

			expect(ctx.activeDataTableId.value).toBe('dt-1');
			expect(ctx.activeWorkflowId.value).toBeNull();
		});

		test('does not auto-open data table preview while hydrating', async () => {
			const ctx = setup();
			ctx.thread.isHydratingThread = true;

			ctx.thread.messages = [
				makeMessage({
					agentTree: makeAgentNode({
						toolCalls: [
							makeToolCall({
								toolCallId: 'tc-create-dt',
								toolName: 'data-tables',
								args: { action: 'create' },
								result: { table: { id: 'dt-1', name: 'Test Table' } },
							}),
						],
					}),
				}),
			];
			await nextTick();

			expect(ctx.activeDataTableId.value).toBeNull();
		});

		test('looks up projectId from producedArtifacts', async () => {
			const ctx = setup();
			ctx.thread.isStreaming = true;
			registerDataTable(ctx.thread, 'dt-1', 'Test Table', 'proj-42');

			ctx.thread.messages = [
				makeMessage({
					agentTree: makeAgentNode({
						toolCalls: [
							makeToolCall({
								toolCallId: 'tc-create-dt',
								toolName: 'data-tables',
								args: { action: 'create' },
								result: { table: { id: 'dt-1', name: 'Test Table' } },
							}),
						],
					}),
				}),
			];
			await nextTick();

			expect(ctx.activeDataTableProjectId.value).toBe('proj-42');
		});

		test('increments dataTableRefreshKey on each data table update', async () => {
			const ctx = setup();
			ctx.thread.isStreaming = true;
			const initialKey = ctx.dataTableRefreshKey.value;

			ctx.thread.messages = [
				makeMessage({
					agentTree: makeAgentNode({
						toolCalls: [
							makeToolCall({
								toolCallId: 'tc-create-dt',
								toolName: 'data-tables',
								args: { action: 'create' },
								result: { table: { id: 'dt-1' } },
							}),
						],
					}),
				}),
			];
			await nextTick();

			expect(ctx.dataTableRefreshKey.value).toBe(initialKey + 1);
		});
	});

	describe('close data table on delete', () => {
		test('closes data table preview when active table is deleted', async () => {
			const ctx = setup();
			registerDataTable(ctx.thread, 'dt-1', 'Table', 'proj-1');
			ctx.openDataTablePreview('dt-1', 'proj-1');
			expect(ctx.activeDataTableId.value).toBe('dt-1');

			ctx.thread.messages = [
				makeMessage({
					agentTree: makeAgentNode({
						toolCalls: [
							makeToolCall({
								toolName: 'data-tables',
								args: { action: 'delete', dataTableId: 'dt-1' },
								result: { success: true },
							}),
						],
					}),
				}),
			];
			await nextTick();

			expect(ctx.activeDataTableId.value).toBeNull();
		});

		test('does not close preview when a different table is deleted', async () => {
			const ctx = setup();
			registerDataTable(ctx.thread, 'dt-1', 'Table 1', 'proj-1');
			ctx.openDataTablePreview('dt-1', 'proj-1');

			ctx.thread.messages = [
				makeMessage({
					agentTree: makeAgentNode({
						toolCalls: [
							makeToolCall({
								toolName: 'data-tables',
								args: { action: 'delete', dataTableId: 'dt-other' },
								result: { success: true },
							}),
						],
					}),
				}),
			];
			await nextTick();

			expect(ctx.activeDataTableId.value).toBe('dt-1');
		});

		test('falls back to first remaining tab when active table is deleted', async () => {
			const ctx = setup();
			registerWorkflow(ctx.thread, 'wf-1');
			registerDataTable(ctx.thread, 'dt-1', 'Table', 'proj-1');
			ctx.openDataTablePreview('dt-1', 'proj-1');

			ctx.thread.messages = [
				makeMessage({
					agentTree: makeAgentNode({
						toolCalls: [
							makeToolCall({
								toolName: 'data-tables',
								args: { action: 'delete', dataTableId: 'dt-1' },
								result: { success: true },
							}),
						],
					}),
				}),
			];
			await nextTick();

			// Should fall back to the remaining workflow tab
			expect(ctx.activeTabId.value).toBe('wf-1');
			expect(ctx.activeWorkflowId.value).toBe('wf-1');
		});
	});

	describe('isPreviewVisible', () => {
		test('is true when workflow is active', () => {
			const ctx = setup();
			registerWorkflow(ctx.thread, 'wf-1');
			ctx.openWorkflowPreview('wf-1');
			expect(ctx.isPreviewVisible.value).toBe(true);
		});

		test('is true when data table is active', () => {
			const ctx = setup();
			registerDataTable(ctx.thread, 'dt-1', 'Table', 'proj-1');
			ctx.openDataTablePreview('dt-1', 'proj-1');
			expect(ctx.isPreviewVisible.value).toBe(true);
		});

		test('is false when nothing is active', () => {
			const ctx = setup();
			expect(ctx.isPreviewVisible.value).toBe(false);
		});
	});

	describe('tab guard', () => {
		test('falls back to first tab when active tab is removed from registry', async () => {
			const ctx = setup();
			registerWorkflow(ctx.thread, 'wf-1');
			registerWorkflow(ctx.thread, 'wf-2', 'Second Workflow');
			ctx.selectTab('wf-2');
			await nextTick();

			expect(ctx.activeTabId.value).toBe('wf-2');

			// Remove wf-2 from registry, keeping wf-1
			const next = new Map<string, ResourceEntry>();
			next.set('wf-1', { type: 'workflow', id: 'wf-1', name: 'Workflow wf-1' });
			ctx.thread.producedArtifacts = next;
			await nextTick();

			expect(ctx.activeTabId.value).toBe('wf-1');
		});

		test('does not clear activeTabId when registry is empty (race condition)', async () => {
			const ctx = setup();
			registerWorkflow(ctx.thread, 'wf-1');
			ctx.selectTab('wf-1');
			await nextTick();

			// Temporarily empty registry (simulates race where registry hasn't been populated yet)
			ctx.thread.producedArtifacts = new Map();
			await nextTick();

			// Tab should remain set — guard skips when tabs are empty
			expect(ctx.activeTabId.value).toBe('wf-1');
		});
	});
});
