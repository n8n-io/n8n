import { describe, test, expect, vi, beforeEach } from 'vitest';
import { ref, reactive, nextTick, type Ref } from 'vue';
import type {
	InstanceAiMessage,
	InstanceAiAgentNode,
	InstanceAiToolCallState,
} from '@n8n/api-types';
import { useCanvasPreview } from '../useCanvasPreview';
import type { ResourceEntry } from '../useResourceRegistry';
import type { WorkflowExecutionState } from '../useExecutionPushEvents';
import type { IWorkflowDb } from '@/Interface';

const mockWorkflowsById: Record<string, Partial<IWorkflowDb>> = {};
vi.mock('@/app/stores/workflowsList.store', () => ({
	useWorkflowsListStore: vi.fn(() => ({
		getWorkflowById: (id: string) => mockWorkflowsById[id],
	})),
}));

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
// Store mock
// ---------------------------------------------------------------------------

function createMockStore() {
	const messages = ref<InstanceAiMessage[]>([]) as Ref<InstanceAiMessage[]>;
	const isStreaming = ref(false);
	const resourceRegistry = ref(new Map<string, ResourceEntry>());
	const threadMetadata = new Map<string, Record<string, unknown>>();

	return reactive({
		messages,
		isStreaming,
		resourceRegistry,
		currentThreadId: 'thread-1',
		getThreadMetadata: (threadId: string) => threadMetadata.get(threadId),
		updateThreadMetadata: async (threadId: string, metadata: Record<string, unknown>) => {
			threadMetadata.set(threadId, { ...threadMetadata.get(threadId), ...metadata });
		},
	});
}

type MockStore = ReturnType<typeof createMockStore>;

// ---------------------------------------------------------------------------
// Registry helpers — populate the store's resourceRegistry so computed
// activeWorkflowId / activeDataTableId can derive values from tabs.
// ---------------------------------------------------------------------------

function registerWorkflow(store: MockStore, id: string, name = `Workflow ${id}`) {
	const next = new Map(store.resourceRegistry);
	next.set(name.toLowerCase(), { type: 'workflow', id, name });
	store.resourceRegistry = next;
}

function registerDataTable(store: MockStore, id: string, name = `Table ${id}`, projectId?: string) {
	const next = new Map(store.resourceRegistry);
	next.set(name.toLowerCase(), { type: 'data-table', id, name, projectId });
	store.resourceRegistry = next;
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

function setup(options?: {
	storeOverrides?: Partial<MockStore>;
	workflowExecutions?: Ref<Map<string, WorkflowExecutionState>>;
}) {
	const store = createMockStore();
	if (options?.storeOverrides) Object.assign(store, options.storeOverrides);
	const route = createMockRoute();

	const result = useCanvasPreview({
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		store: store as any,
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		route: route as any,
		workflowExecutions: options?.workflowExecutions,
	});

	return { ...result, store, route };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('useCanvasPreview', () => {
	beforeEach(() => {
		vi.restoreAllMocks();
		for (const key of Object.keys(mockWorkflowsById)) {
			delete mockWorkflowsById[key];
		}
	});

	describe('allArtifactTabs', () => {
		test('derives tabs from resource registry', () => {
			const ctx = setup();
			registerWorkflow(ctx.store, 'wf-1', 'My Workflow');
			registerDataTable(ctx.store, 'dt-1', 'My Table', 'proj-1');

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

		test('includes executionStatus from workflowExecutions ref', () => {
			const executions = ref(
				new Map<string, WorkflowExecutionState>([
					['wf-1', { executionId: 'exec-1', workflowId: 'wf-1', status: 'running', eventLog: [] }],
				]),
			);
			const ctx = setup({ workflowExecutions: executions });
			registerWorkflow(ctx.store, 'wf-1', 'My Workflow');
			registerDataTable(ctx.store, 'dt-1', 'My Table', 'proj-1');

			const tabs = ctx.allArtifactTabs.value;
			expect(tabs[0].executionStatus).toBe('running');
			expect(tabs[1].executionStatus).toBeUndefined();
		});

		test('recomputes when workflowExecutions ref changes', () => {
			const executions = ref(new Map<string, WorkflowExecutionState>());
			const ctx = setup({ workflowExecutions: executions });
			registerWorkflow(ctx.store, 'wf-1', 'My Workflow');

			expect(ctx.allArtifactTabs.value[0].executionStatus).toBeUndefined();

			// Simulate execution starting
			executions.value = new Map([
				[
					'wf-1',
					{ executionId: 'exec-1', workflowId: 'wf-1', status: 'running' as const, eventLog: [] },
				],
			]);

			expect(ctx.allArtifactTabs.value[0].executionStatus).toBe('running');

			// Simulate execution finishing
			executions.value = new Map([
				[
					'wf-1',
					{ executionId: 'exec-1', workflowId: 'wf-1', status: 'success' as const, eventLog: [] },
				],
			]);

			expect(ctx.allArtifactTabs.value[0].executionStatus).toBe('success');
		});

		test('recomputes from success back to running on re-execution', () => {
			const executions = ref(new Map<string, WorkflowExecutionState>());
			const ctx = setup({ workflowExecutions: executions });
			registerWorkflow(ctx.store, 'wf-1', 'My Workflow');

			// First execution completes
			executions.value = new Map([
				[
					'wf-1',
					{ executionId: 'exec-1', workflowId: 'wf-1', status: 'success' as const, eventLog: [] },
				],
			]);
			expect(ctx.allArtifactTabs.value[0].executionStatus).toBe('success');

			// Second execution starts on same workflow
			executions.value = new Map([
				[
					'wf-1',
					{ executionId: 'exec-2', workflowId: 'wf-1', status: 'running' as const, eventLog: [] },
				],
			]);
			expect(ctx.allArtifactTabs.value[0].executionStatus).toBe('running');
		});

		test('updates status when re-executing after switching to a different tab', () => {
			const executions = ref(new Map<string, WorkflowExecutionState>());
			const ctx = setup({ workflowExecutions: executions });
			registerWorkflow(ctx.store, 'wf-1', 'Workflow A');
			registerDataTable(ctx.store, 'dt-1', 'Table B', 'proj-1');

			// Execute workflow A → success
			ctx.selectTab('wf-1');
			executions.value = new Map([
				[
					'wf-1',
					{ executionId: 'exec-1', workflowId: 'wf-1', status: 'success' as const, eventLog: [] },
				],
			]);
			expect(ctx.allArtifactTabs.value[0].executionStatus).toBe('success');

			// Switch to table tab
			ctx.selectTab('dt-1');
			expect(ctx.activeTabId.value).toBe('dt-1');

			// Re-execute workflow A while viewing table tab
			executions.value = new Map([
				[
					'wf-1',
					{ executionId: 'exec-2', workflowId: 'wf-1', status: 'running' as const, eventLog: [] },
				],
			]);

			// Workflow A tab should show running even though we're viewing table tab
			const wfTab = ctx.allArtifactTabs.value.find((t) => t.id === 'wf-1');
			expect(wfTab?.executionStatus).toBe('running');
		});

		test('excludes credential entries', () => {
			const ctx = setup();
			const registry = new Map<string, ResourceEntry>();
			registry.set('wf', { type: 'workflow', id: 'wf-1', name: 'WF' });
			registry.set('cred', { type: 'credential', id: 'cred-1', name: 'Cred' });
			ctx.store.resourceRegistry = registry;

			expect(ctx.allArtifactTabs.value).toHaveLength(1);
			expect(ctx.allArtifactTabs.value[0].type).toBe('workflow');
		});
	});

	describe('selectTab / closePreview', () => {
		test('selectTab sets activeTabId', () => {
			const ctx = setup();
			registerWorkflow(ctx.store, 'wf-1');

			ctx.selectTab('wf-1');

			expect(ctx.activeTabId.value).toBe('wf-1');
			expect(ctx.activeWorkflowId.value).toBe('wf-1');
			expect(ctx.isPreviewVisible.value).toBe(true);
		});

		test('closePreview clears activeTabId', () => {
			const ctx = setup();
			registerWorkflow(ctx.store, 'wf-1');
			ctx.selectTab('wf-1');

			ctx.closePreview();

			expect(ctx.activeTabId.value).toBeNull();
			expect(ctx.isPreviewVisible.value).toBe(false);
		});
	});

	describe('openWorkflowPreview', () => {
		test('sets activeWorkflowId and clears data table state', () => {
			const ctx = setup();
			registerDataTable(ctx.store, 'dt-1', 'Table', 'proj-1');
			registerWorkflow(ctx.store, 'wf-1');
			ctx.openDataTablePreview('dt-1', 'proj-1');

			ctx.openWorkflowPreview('wf-1');

			expect(ctx.activeWorkflowId.value).toBe('wf-1');
			expect(ctx.activeDataTableId.value).toBeNull();
			expect(ctx.activeDataTableProjectId.value).toBeNull();
		});

		test('makes isPreviewVisible true', () => {
			const ctx = setup();
			registerWorkflow(ctx.store, 'wf-1');
			expect(ctx.isPreviewVisible.value).toBe(false);

			ctx.openWorkflowPreview('wf-1');
			expect(ctx.isPreviewVisible.value).toBe(true);
		});
	});

	describe('openDataTablePreview', () => {
		test('sets data table state and clears workflow state', () => {
			const ctx = setup();
			registerWorkflow(ctx.store, 'wf-1');
			registerDataTable(ctx.store, 'dt-1', 'Table', 'proj-1');
			ctx.openWorkflowPreview('wf-1');

			ctx.openDataTablePreview('dt-1', 'proj-1');

			expect(ctx.activeDataTableId.value).toBe('dt-1');
			expect(ctx.activeDataTableProjectId.value).toBe('proj-1');
			expect(ctx.activeWorkflowId.value).toBeNull();
			expect(ctx.activeExecutionId.value).toBeNull();
		});

		test('makes isPreviewVisible true', () => {
			const ctx = setup();
			registerDataTable(ctx.store, 'dt-1', 'Table', 'proj-1');
			expect(ctx.isPreviewVisible.value).toBe(false);

			ctx.openDataTablePreview('dt-1', 'proj-1');
			expect(ctx.isPreviewVisible.value).toBe(true);
		});
	});

	describe('markUserSentMessage', () => {
		test('sets userSentMessage to true', () => {
			const ctx = setup();
			expect(ctx.userSentMessage.value).toBe(false);

			ctx.markUserSentMessage();
			expect(ctx.userSentMessage.value).toBe(true);
		});
	});

	describe('thread switch (route.params.threadId change)', () => {
		test('resets all preview state on thread switch', async () => {
			const ctx = setup();
			registerWorkflow(ctx.store, 'wf-1');
			ctx.openWorkflowPreview('wf-1');
			ctx.markUserSentMessage();

			ctx.route.params.threadId = 'thread-2';
			await nextTick();

			expect(ctx.activeTabId.value).toBeNull();
			expect(ctx.activeWorkflowId.value).toBeNull();
			expect(ctx.activeExecutionId.value).toBeNull();
			expect(ctx.activeDataTableId.value).toBeNull();
			expect(ctx.activeDataTableProjectId.value).toBeNull();
			expect(ctx.userSentMessage.value).toBe(false);
		});

		test('preserves wasCanvasOpenBeforeSwitch when preview was visible', async () => {
			const ctx = setup();
			registerWorkflow(ctx.store, 'wf-1');
			ctx.openWorkflowPreview('wf-1');
			expect(ctx.isPreviewVisible.value).toBe(true);

			ctx.route.params.threadId = 'thread-2';
			await nextTick();

			// Preview was cleared by thread switch
			expect(ctx.isPreviewVisible.value).toBe(false);

			// Register the restored workflow so activeWorkflowId can derive
			registerWorkflow(ctx.store, 'wf-restored');

			// But if a build result appears, it should auto-open because canvas was open before
			ctx.store.messages = [
				makeMessage({
					agentTree: makeAgentNode({
						toolCalls: [
							makeToolCall({
								toolCallId: 'tc-build',
								toolName: 'build-workflow',
								result: { success: true, workflowId: 'wf-restored' },
							}),
						],
					}),
				}),
			];
			await nextTick();

			expect(ctx.activeWorkflowId.value).toBe('wf-restored');
		});
	});

	describe('auto-open on build result', () => {
		test('auto-opens canvas when streaming and build result appears', async () => {
			const ctx = setup();
			ctx.store.isStreaming = true;
			registerWorkflow(ctx.store, 'wf-new');

			ctx.store.messages = [
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

		test('auto-opens canvas when user sent a message', async () => {
			const ctx = setup();
			ctx.markUserSentMessage();
			registerWorkflow(ctx.store, 'wf-new');

			ctx.store.messages = [
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
		});

		test('does not auto-open for historical data when canvas was closed', async () => {
			const ctx = setup();
			// Not streaming, user didn't send message, canvas was not open before switch

			ctx.store.messages = [
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

			expect(ctx.activeTabId.value).toBeNull();
			expect(ctx.isPreviewVisible.value).toBe(false);
		});

		test('switches to latest artifact when a new workflow is built while viewing different artifact', async () => {
			const ctx = setup();
			registerDataTable(ctx.store, 'dt-1', 'Table', 'proj-1');
			registerWorkflow(ctx.store, 'wf-1');
			ctx.openDataTablePreview('dt-1', 'proj-1');
			ctx.store.isStreaming = true;

			ctx.store.messages = [
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
			ctx.store.isStreaming = true;
			registerWorkflow(ctx.store, 'wf-1');
			const initialKey = ctx.workflowRefreshKey.value;

			ctx.store.messages = [
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

	describe('auto-show execution', () => {
		test('sets activeExecutionId when run-workflow completes during streaming', async () => {
			const ctx = setup();
			ctx.store.isStreaming = true;
			registerWorkflow(ctx.store, 'wf-1');
			ctx.openWorkflowPreview('wf-1');

			ctx.store.messages = [
				makeMessage({
					agentTree: makeAgentNode({
						toolCalls: [
							makeToolCall({
								toolCallId: 'tc-run',
								toolName: 'executions',
								args: { action: 'run', workflowId: 'wf-1' },
								result: { executionId: 'exec-1' },
							}),
						],
					}),
				}),
			];
			await nextTick();

			expect(ctx.activeExecutionId.value).toBe('exec-1');
		});

		test('does not set executionId for historical data when not streaming', async () => {
			const ctx = setup();

			ctx.store.messages = [
				makeMessage({
					agentTree: makeAgentNode({
						toolCalls: [
							makeToolCall({
								toolCallId: 'tc-run',
								toolName: 'executions',
								args: { action: 'run', workflowId: 'wf-1' },
								result: { executionId: 'exec-historical' },
							}),
						],
					}),
				}),
			];
			await nextTick();

			expect(ctx.activeExecutionId.value).toBeNull();
		});

		test('opens canvas with latest build when execution arrives and canvas is closed', async () => {
			const ctx = setup();
			ctx.store.isStreaming = true;
			registerWorkflow(ctx.store, 'wf-1');

			// First add a build result
			ctx.store.messages = [
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

			// Close the preview manually
			ctx.closePreview();
			expect(ctx.isPreviewVisible.value).toBe(false);

			// Now add an execution result to the same message
			ctx.store.messages = [
				makeMessage({
					agentTree: makeAgentNode({
						toolCalls: [
							makeToolCall({
								toolCallId: 'tc-build',
								toolName: 'build-workflow',
								result: { success: true, workflowId: 'wf-1' },
							}),
							makeToolCall({
								toolCallId: 'tc-run',
								toolName: 'executions',
								args: { action: 'run', workflowId: 'wf-1' },
								result: { executionId: 'exec-1' },
							}),
						],
					}),
				}),
			];
			await nextTick();

			expect(ctx.activeExecutionId.value).toBe('exec-1');
			expect(ctx.activeWorkflowId.value).toBe('wf-1');
		});
	});

	describe('auto-open data table preview', () => {
		test('auto-opens data table preview when streaming', async () => {
			const ctx = setup();
			ctx.store.isStreaming = true;
			registerDataTable(ctx.store, 'dt-1', 'Test Table');

			ctx.store.messages = [
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

		test('does not auto-open for historical data table results', async () => {
			const ctx = setup();

			ctx.store.messages = [
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

		test('looks up projectId from resourceRegistry', async () => {
			const ctx = setup();
			ctx.store.isStreaming = true;
			registerDataTable(ctx.store, 'dt-1', 'Test Table', 'proj-42');

			ctx.store.messages = [
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
			ctx.store.isStreaming = true;
			const initialKey = ctx.dataTableRefreshKey.value;

			ctx.store.messages = [
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
			registerDataTable(ctx.store, 'dt-1', 'Table', 'proj-1');
			ctx.openDataTablePreview('dt-1', 'proj-1');
			expect(ctx.activeDataTableId.value).toBe('dt-1');

			ctx.store.messages = [
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
			registerDataTable(ctx.store, 'dt-1', 'Table 1', 'proj-1');
			ctx.openDataTablePreview('dt-1', 'proj-1');

			ctx.store.messages = [
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
			registerWorkflow(ctx.store, 'wf-1');
			registerDataTable(ctx.store, 'dt-1', 'Table', 'proj-1');
			ctx.openDataTablePreview('dt-1', 'proj-1');

			ctx.store.messages = [
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
			registerWorkflow(ctx.store, 'wf-1');
			ctx.openWorkflowPreview('wf-1');
			expect(ctx.isPreviewVisible.value).toBe(true);
		});

		test('is true when data table is active', () => {
			const ctx = setup();
			registerDataTable(ctx.store, 'dt-1', 'Table', 'proj-1');
			ctx.openDataTablePreview('dt-1', 'proj-1');
			expect(ctx.isPreviewVisible.value).toBe(true);
		});

		test('is false when nothing is active', () => {
			const ctx = setup();
			expect(ctx.isPreviewVisible.value).toBe(false);
		});
	});

	describe('stale execution filtering', () => {
		function addExecutionMessage(
			store: MockStore,
			workflowId: string,
			executionId: string,
			finishedAt?: string,
		) {
			store.messages = [
				...store.messages,
				makeMessage({
					agentTree: makeAgentNode({
						toolCalls: [
							makeToolCall({
								toolName: 'executions',
								args: { action: 'run', workflowId },
								result: { executionId, status: 'success', ...(finishedAt ? { finishedAt } : {}) },
							}),
						],
					}),
				}),
			];
		}

		test('excludes execution when workflow updatedAt > finishedAt', () => {
			const ctx = setup();
			mockWorkflowsById['wf-1'] = { updatedAt: '2026-03-30T12:00:00Z' };
			addExecutionMessage(ctx.store, 'wf-1', 'exec-1', '2026-03-30T10:00:00Z');

			// Workflow was updated 2 hours after execution finished
			const historical = ctx.allArtifactTabs; // force computed evaluation
			void historical.value;
			expect(ctx.activeExecutionId.value).toBeNull();
		});

		test('includes execution when workflow updatedAt <= finishedAt', async () => {
			const ctx = setup();
			registerWorkflow(ctx.store, 'wf-1');
			mockWorkflowsById['wf-1'] = { updatedAt: '2026-03-30T09:00:00Z' };
			addExecutionMessage(ctx.store, 'wf-1', 'exec-1', '2026-03-30T10:00:00Z');

			ctx.selectTab('wf-1');
			await nextTick();

			expect(ctx.activeExecutionId.value).toBe('exec-1');
		});

		test('includes execution when finishedAt is missing', async () => {
			const ctx = setup();
			registerWorkflow(ctx.store, 'wf-1');
			mockWorkflowsById['wf-1'] = { updatedAt: '2026-03-30T12:00:00Z' };
			addExecutionMessage(ctx.store, 'wf-1', 'exec-1'); // no finishedAt

			ctx.selectTab('wf-1');
			await nextTick();

			expect(ctx.activeExecutionId.value).toBe('exec-1');
		});

		test('includes execution when workflow is not in cache', async () => {
			const ctx = setup();
			registerWorkflow(ctx.store, 'wf-1');
			// mockWorkflowsById['wf-1'] intentionally not set
			addExecutionMessage(ctx.store, 'wf-1', 'exec-1', '2026-03-30T10:00:00Z');

			ctx.selectTab('wf-1');
			await nextTick();

			expect(ctx.activeExecutionId.value).toBe('exec-1');
		});
	});

	describe('tab guard', () => {
		test('falls back to first tab when active tab is removed from registry', async () => {
			const ctx = setup();
			registerWorkflow(ctx.store, 'wf-1');
			registerWorkflow(ctx.store, 'wf-2', 'Second Workflow');
			ctx.selectTab('wf-2');
			await nextTick();

			expect(ctx.activeTabId.value).toBe('wf-2');

			// Remove wf-2 from registry, keeping wf-1
			const next = new Map<string, ResourceEntry>();
			next.set('workflow wf-1', { type: 'workflow', id: 'wf-1', name: 'Workflow wf-1' });
			ctx.store.resourceRegistry = next;
			await nextTick();

			expect(ctx.activeTabId.value).toBe('wf-1');
		});

		test('does not clear activeTabId when registry is empty (race condition)', async () => {
			const ctx = setup();
			registerWorkflow(ctx.store, 'wf-1');
			ctx.selectTab('wf-1');
			await nextTick();

			// Temporarily empty registry (simulates race where registry hasn't been populated yet)
			ctx.store.resourceRegistry = new Map();
			await nextTick();

			// Tab should remain set — guard skips when tabs are empty
			expect(ctx.activeTabId.value).toBe('wf-1');
		});
	});
});
