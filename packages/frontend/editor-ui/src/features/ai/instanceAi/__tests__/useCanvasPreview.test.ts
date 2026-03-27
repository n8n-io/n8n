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

function setup(storeOverrides?: Partial<MockStore>) {
	const store = createMockStore();
	if (storeOverrides) Object.assign(store, storeOverrides);
	const route = createMockRoute();

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const result = useCanvasPreview({ store: store as any, route: route as any });

	return { ...result, store, route };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('useCanvasPreview', () => {
	beforeEach(() => {
		vi.restoreAllMocks();
	});

	describe('openWorkflowPreview', () => {
		test('sets activeWorkflowId and clears data table state', () => {
			const ctx = setup();
			ctx.openDataTablePreview('dt-1', 'proj-1');

			ctx.openWorkflowPreview('wf-1');

			expect(ctx.activeWorkflowId.value).toBe('wf-1');
			expect(ctx.activeDataTableId.value).toBeNull();
			expect(ctx.activeDataTableProjectId.value).toBeNull();
		});

		test('makes isPreviewVisible true', () => {
			const ctx = setup();
			expect(ctx.isPreviewVisible.value).toBe(false);

			ctx.openWorkflowPreview('wf-1');
			expect(ctx.isPreviewVisible.value).toBe(true);
		});
	});

	describe('openDataTablePreview', () => {
		test('sets data table state and clears workflow state', () => {
			const ctx = setup();
			ctx.openWorkflowPreview('wf-1');

			ctx.openDataTablePreview('dt-1', 'proj-1');

			expect(ctx.activeDataTableId.value).toBe('dt-1');
			expect(ctx.activeDataTableProjectId.value).toBe('proj-1');
			expect(ctx.activeWorkflowId.value).toBeNull();
			expect(ctx.activeExecutionId.value).toBeNull();
		});

		test('makes isPreviewVisible true', () => {
			const ctx = setup();
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
			ctx.openWorkflowPreview('wf-1');
			ctx.markUserSentMessage();

			ctx.route.params.threadId = 'thread-2';
			await nextTick();

			expect(ctx.activeWorkflowId.value).toBeNull();
			expect(ctx.activeExecutionId.value).toBeNull();
			expect(ctx.activeDataTableId.value).toBeNull();
			expect(ctx.activeDataTableProjectId.value).toBeNull();
			expect(ctx.userSentMessage.value).toBe(false);
		});

		test('preserves wasCanvasOpenBeforeSwitch when preview was visible', async () => {
			const ctx = setup();
			ctx.openWorkflowPreview('wf-1');
			expect(ctx.isPreviewVisible.value).toBe(true);

			ctx.route.params.threadId = 'thread-2';
			await nextTick();

			// Preview was cleared by thread switch
			expect(ctx.isPreviewVisible.value).toBe(false);

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

			expect(ctx.activeWorkflowId.value).toBeNull();
			expect(ctx.isPreviewVisible.value).toBe(false);
		});

		test('does not auto-switch when a panel is already open', async () => {
			const ctx = setup();
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

			// Panel already had a data table open — build should not auto-switch
			expect(ctx.activeDataTableId.value).toBe('dt-1');
			expect(ctx.activeDataTableProjectId.value).toBe('proj-1');
			expect(ctx.activeWorkflowId.value).toBeNull();
		});

		test('increments workflowRefreshKey on each build', async () => {
			const ctx = setup();
			ctx.store.isStreaming = true;
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
			ctx.activeWorkflowId.value = null;
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
			ctx.store.resourceRegistry = new Map([
				[
					'test table',
					{ type: 'data-table', id: 'dt-1', name: 'Test Table', projectId: 'proj-42' },
				],
			]);

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
			expect(ctx.activeDataTableProjectId.value).toBeNull();
		});

		test('does not close preview when a different table is deleted', async () => {
			const ctx = setup();
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
	});

	describe('isPreviewVisible', () => {
		test('is true when workflow is active', () => {
			const ctx = setup();
			ctx.openWorkflowPreview('wf-1');
			expect(ctx.isPreviewVisible.value).toBe(true);
		});

		test('is true when data table is active', () => {
			const ctx = setup();
			ctx.openDataTablePreview('dt-1', 'proj-1');
			expect(ctx.isPreviewVisible.value).toBe(true);
		});

		test('is false when nothing is active', () => {
			const ctx = setup();
			expect(ctx.isPreviewVisible.value).toBe(false);
		});
	});
});
