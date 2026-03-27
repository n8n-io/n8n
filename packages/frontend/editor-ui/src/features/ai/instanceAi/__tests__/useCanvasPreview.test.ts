import { describe, test, expect, vi, beforeEach } from 'vitest';
import { ref, reactive, nextTick, type Ref } from 'vue';
import type {
	InstanceAiMessage,
	InstanceAiAgentNode,
	InstanceAiToolCallState,
} from '@n8n/api-types';
import { useCanvasPreview } from '../useCanvasPreview';
import type { ResourceEntry } from '../useResourceRegistry';
import type { ExecutionStatus } from '../useExecutionPushEvents';

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

	return reactive({
		messages,
		isStreaming,
		resourceRegistry,
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
	getExecutionStatus?: (workflowId: string) => ExecutionStatus | undefined;
}) {
	const store = createMockStore();
	if (options?.storeOverrides) Object.assign(store, options.storeOverrides);
	const route = createMockRoute();

	const result = useCanvasPreview({
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		store: store as any,
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		route: route as any,
		getExecutionStatus: options?.getExecutionStatus,
	});

	return { ...result, store, route };
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

		test('includes executionStatus from getExecutionStatus callback', () => {
			const ctx = setup({
				getExecutionStatus: (id) => (id === 'wf-1' ? 'running' : undefined),
			});
			registerWorkflow(ctx.store, 'wf-1', 'My Workflow');
			registerDataTable(ctx.store, 'dt-1', 'My Table', 'proj-1');

			const tabs = ctx.allArtifactTabs.value;
			expect(tabs[0].executionStatus).toBe('running');
			expect(tabs[1].executionStatus).toBeUndefined();
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

		test('switches tab when switching from data table to workflow preview', async () => {
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

			expect(ctx.activeDataTableId.value).toBeNull();
			expect(ctx.activeDataTableProjectId.value).toBeNull();
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
								toolName: 'run-workflow',
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
								toolName: 'run-workflow',
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
								toolName: 'run-workflow',
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
								toolName: 'create-data-table',
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
								toolName: 'create-data-table',
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
								toolName: 'create-data-table',
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
								toolName: 'create-data-table',
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
								toolName: 'delete-data-table',
								args: { dataTableId: 'dt-1' },
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
								toolName: 'delete-data-table',
								args: { dataTableId: 'dt-other' },
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
								toolName: 'delete-data-table',
								args: { dataTableId: 'dt-1' },
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
