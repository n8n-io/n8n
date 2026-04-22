import { vi } from 'vitest';
import { ref, reactive, nextTick, type Ref } from 'vue';
import type {
	PushMessage,
	InstanceAiMessage,
	InstanceAiAgentNode,
	InstanceAiToolCallState,
} from '@n8n/api-types';
import { useCanvasPreview } from '../useCanvasPreview';
import { useEventRelay } from '../useEventRelay';
import type { useInstanceAiStore } from '../instanceAi.store';
import type { ResourceEntry } from '../useResourceRegistry';

// ---------------------------------------------------------------------------
// Mock push store — must be called before importing useExecutionPushEvents
// ---------------------------------------------------------------------------

let capturedPushHandler: ((event: PushMessage) => void) | null = null;

export function mockPushConnectionStore() {
	vi.mock('@/app/stores/pushConnection.store', () => ({
		usePushConnectionStore: vi.fn(() => ({
			addEventListener: vi.fn((handler: (event: PushMessage) => void) => {
				capturedPushHandler = handler;
				return vi.fn();
			}),
		})),
	}));
	vi.mock('@/app/stores/workflowsList.store', () => ({
		useWorkflowsListStore: vi.fn(() => ({
			getWorkflowById: vi.fn(),
		})),
	}));
}

// ---------------------------------------------------------------------------
// Event factories
// ---------------------------------------------------------------------------

export function executionStartedEvent(executionId: string, workflowId: string): PushMessage {
	return {
		type: 'executionStarted',
		data: {
			executionId,
			workflowId,
			mode: 'integrated' as const,
			startedAt: new Date(),
			flattedRunData: '[]',
		},
	} as PushMessage;
}

export function executionFinishedEvent(
	executionId: string,
	workflowId: string,
	status: 'success' | 'error',
): PushMessage {
	return {
		type: 'executionFinished',
		data: { executionId, workflowId, status },
	} as PushMessage;
}

export function nodeExecuteBeforeEvent(executionId: string, nodeName: string): PushMessage {
	return {
		type: 'nodeExecuteBefore',
		data: { executionId, nodeName, data: {} },
	} as PushMessage;
}

export function nodeExecuteAfterEvent(executionId: string, nodeName: string): PushMessage {
	return {
		type: 'nodeExecuteAfter',
		data: { executionId, nodeName, data: {}, itemCountByConnectionType: {} },
	} as PushMessage;
}

// ---------------------------------------------------------------------------
// Message factories
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
		id: `msg-${Date.now()}-${Math.random()}`,
		role: 'assistant',
		content: '',
		reasoning: '',
		isStreaming: false,
		createdAt: new Date().toISOString(),
		...overrides,
	};
}

// ---------------------------------------------------------------------------
// Harness
// ---------------------------------------------------------------------------

export interface InstanceAiHarness {
	// Reactive state from composables (for assertions)
	activeTabId: Ref<string | null>;
	activeWorkflowId: ReturnType<typeof useCanvasPreview>['activeWorkflowId'];
	activeExecutionId: Ref<string | null>;
	activeDataTableId: ReturnType<typeof useCanvasPreview>['activeDataTableId'];
	isPreviewVisible: ReturnType<typeof useCanvasPreview>['isPreviewVisible'];
	allArtifactTabs: ReturnType<typeof useCanvasPreview>['allArtifactTabs'];
	workflowRefreshKey: Ref<number>;
	dataTableRefreshKey: Ref<number>;
	userSentMessage: Ref<boolean>;

	// Relay tracking
	relayedEvents: PushMessage[];

	// Actions
	registerWorkflow: (id: string, name?: string) => void;
	registerDataTable: (id: string, name?: string, projectId?: string) => void;
	removeResource: (key: string) => void;
	simulatePushEvent: (event: PushMessage) => void;
	simulateIframeReady: () => Promise<void>;
	selectTab: (tabId: string) => void;
	closePreview: () => void;
	markUserSentMessage: () => void;
	switchThread: (threadId: string) => Promise<void>;
	addMessage: (msg: InstanceAiMessage) => void;
	addBuildResult: (workflowId: string, toolCallId?: string) => void;
	addExecutionResult: (workflowId: string, executionId: string, toolCallId?: string) => void;
	addMessageWithExecution: (
		workflowId: string,
		executionId: string,
		status: 'success' | 'error',
	) => void;
	setStreaming: (streaming: boolean) => void;
	flush: () => Promise<void>;
}

export async function createInstanceAiHarness(): Promise<InstanceAiHarness> {
	// Dynamically import after mocks are set up
	const { useExecutionPushEvents } = await import('../useExecutionPushEvents');

	// --- Mock store ---
	const messages = ref<InstanceAiMessage[]>([]) as Ref<InstanceAiMessage[]>;
	const isStreaming = ref(false);
	const producedArtifacts = ref(new Map<string, ResourceEntry>());
	const resourceNameIndex = ref(new Map<string, ResourceEntry>());

	const threadMetadata = new Map<string, Record<string, unknown>>();

	const store = reactive({
		messages,
		isStreaming,
		producedArtifacts,
		resourceNameIndex,
		currentThreadId: 'thread-1',
		getThreadMetadata: (threadId: string) => threadMetadata.get(threadId),
		updateThreadMetadata: async (threadId: string, metadata: Record<string, unknown>) => {
			threadMetadata.set(threadId, { ...threadMetadata.get(threadId), ...metadata });
		},
	});

	// --- Mock route ---
	const route = reactive({
		params: { threadId: 'thread-1' },
		path: '/instance-ai',
		name: 'instance-ai',
		matched: [],
		fullPath: '/instance-ai',
		query: {},
		hash: '',
		redirectedFrom: undefined,
		meta: {},
	});

	// --- Wire real composables ---
	const executionTracking = useExecutionPushEvents();

	const preview = useCanvasPreview({
		store: store as unknown as ReturnType<typeof useInstanceAiStore>,
		route: route as Parameters<typeof useCanvasPreview>[0]['route'],
		workflowExecutions: executionTracking.workflowExecutions,
	});

	const relayedEvents: PushMessage[] = [];

	const eventRelay = useEventRelay({
		workflowExecutions: executionTracking.workflowExecutions,
		activeWorkflowId: preview.activeWorkflowId,
		getBufferedEvents: executionTracking.getBufferedEvents,
		clearEventLog: executionTracking.clearEventLog,
		relay: (event) => relayedEvents.push(event),
	});

	// --- Convenience actions ---

	function registerWorkflow(id: string, name = `Workflow ${id}`) {
		const entry: ResourceEntry = { type: 'workflow', id, name };
		const nextProduced = new Map(store.producedArtifacts);
		nextProduced.set(id, entry);
		store.producedArtifacts = nextProduced;
		const nextByName = new Map(store.resourceNameIndex);
		nextByName.set(name.toLowerCase(), entry);
		store.resourceNameIndex = nextByName;
	}

	function registerDataTable(id: string, name = `Table ${id}`, projectId?: string) {
		const entry: ResourceEntry = { type: 'data-table', id, name, projectId };
		const nextProduced = new Map(store.producedArtifacts);
		nextProduced.set(id, entry);
		store.producedArtifacts = nextProduced;
		const nextByName = new Map(store.resourceNameIndex);
		nextByName.set(name.toLowerCase(), entry);
		store.resourceNameIndex = nextByName;
	}

	function removeResource(idOrName: string) {
		const nextProduced = new Map(store.producedArtifacts);
		const removed = nextProduced.get(idOrName);
		nextProduced.delete(idOrName);
		store.producedArtifacts = nextProduced;
		const nextByName = new Map(store.resourceNameIndex);
		if (removed) nextByName.delete(removed.name.toLowerCase());
		nextByName.delete(idOrName.toLowerCase());
		store.resourceNameIndex = nextByName;
	}

	function simulatePushEvent(event: PushMessage) {
		if (!capturedPushHandler) throw new Error('No push handler registered');
		capturedPushHandler(event);
	}

	async function simulateIframeReady() {
		eventRelay.handleIframeReady();
		await nextTick();
	}

	async function switchThread(threadId: string) {
		executionTracking.clearAll();
		route.params.threadId = threadId;
		await nextTick();
	}

	function addMessage(msg: InstanceAiMessage) {
		store.messages = [...store.messages, msg];
	}

	let toolCallCounter = 0;

	function addBuildResult(workflowId: string, toolCallId?: string) {
		const tcId = toolCallId ?? `tc-build-${++toolCallCounter}`;
		store.messages = [
			...store.messages,
			makeMessage({
				agentTree: makeAgentNode({
					toolCalls: [
						makeToolCall({
							toolCallId: tcId,
							toolName: 'build-workflow',
							result: { success: true, workflowId },
						}),
					],
				}),
			}),
		];
	}

	function addExecutionResult(workflowId: string, executionId: string, toolCallId?: string) {
		const tcId = toolCallId ?? `tc-run-${++toolCallCounter}`;
		// Find existing message with build result for this workflow and add execution to it,
		// or create a new message with both build and execution
		const existingIdx = store.messages.findIndex((m) =>
			m.agentTree?.toolCalls?.some(
				(tc) =>
					tc.toolName === 'build-workflow' &&
					(tc.result as Record<string, unknown> | undefined)?.workflowId === workflowId,
			),
		);

		if (existingIdx >= 0) {
			const msg = store.messages[existingIdx];
			const updatedMsg = makeMessage({
				...msg,
				agentTree: makeAgentNode({
					...msg.agentTree!,
					toolCalls: [
						...msg.agentTree!.toolCalls,
						makeToolCall({
							toolCallId: tcId,
							toolName: 'executions',
							args: { action: 'run', workflowId },
							result: { executionId },
						}),
					],
				}),
			});
			const next = [...store.messages];
			next[existingIdx] = updatedMsg;
			store.messages = next;
		} else {
			store.messages = [
				...store.messages,
				makeMessage({
					agentTree: makeAgentNode({
						toolCalls: [
							makeToolCall({
								toolCallId: tcId,
								toolName: 'executions',
								args: { action: 'run', workflowId },
								result: { executionId },
							}),
						],
					}),
				}),
			];
		}
	}

	function addMessageWithExecution(
		workflowId: string,
		executionId: string,
		status: 'success' | 'error',
	) {
		store.messages = [
			...store.messages,
			makeMessage({
				agentTree: makeAgentNode({
					toolCalls: [
						makeToolCall({
							toolCallId: `tc-build-${++toolCallCounter}`,
							toolName: 'build-workflow',
							result: { success: true, workflowId },
						}),
						makeToolCall({
							toolCallId: `tc-run-${++toolCallCounter}`,
							toolName: 'executions',
							args: { action: 'run', workflowId },
							result: { executionId, status },
						}),
					],
				}),
			}),
		];
	}

	function setStreaming(streaming: boolean) {
		store.isStreaming = streaming;
	}

	async function flush() {
		await nextTick();
	}

	return {
		// State
		activeTabId: preview.activeTabId,
		activeWorkflowId: preview.activeWorkflowId,
		activeExecutionId: preview.activeExecutionId,
		activeDataTableId: preview.activeDataTableId,
		isPreviewVisible: preview.isPreviewVisible,
		allArtifactTabs: preview.allArtifactTabs,
		workflowRefreshKey: preview.workflowRefreshKey,
		dataTableRefreshKey: preview.dataTableRefreshKey,
		userSentMessage: preview.userSentMessage,
		relayedEvents,

		// Actions
		registerWorkflow,
		registerDataTable,
		removeResource,
		simulatePushEvent,
		simulateIframeReady,
		selectTab: preview.selectTab,
		closePreview: preview.closePreview,
		markUserSentMessage: preview.markUserSentMessage,
		switchThread,
		addMessage,
		addBuildResult,
		addExecutionResult,
		addMessageWithExecution,
		setStreaming,
		flush,
	};
}
