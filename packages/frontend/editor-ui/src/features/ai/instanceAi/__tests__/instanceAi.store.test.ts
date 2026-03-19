import { setActivePinia, createPinia } from 'pinia';
import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
import { fetchThreadMessages, fetchThreadStatus } from '../instanceAi.memory.api';
import { ensureThread, postMessage } from '../instanceAi.api';
import { useInstanceAiStore } from '../instanceAi.store';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock('@n8n/stores/useRootStore', () => ({
	useRootStore: vi.fn().mockReturnValue({
		restApiContext: { baseUrl: 'http://localhost:5678/api' },
	}),
}));

vi.mock('@/app/composables/useToast', () => ({
	useToast: vi.fn().mockReturnValue({
		showError: vi.fn(),
	}),
}));

vi.mock('@n8n/rest-api-client', () => ({
	ResponseError: class ResponseError extends Error {
		httpStatusCode?: number;
	},
}));

vi.mock('../instanceAi.api', () => ({
	ensureThread: vi.fn().mockResolvedValue({
		thread: {
			id: 'thread-1',
			title: '',
			resourceId: 'user-1',
			createdAt: '2026-01-01T00:00:00.000Z',
			updatedAt: '2026-01-01T00:00:00.000Z',
		},
		created: true,
	}),
	postMessage: vi.fn(),
	postCancel: vi.fn(),
	postCancelTask: vi.fn(),
	postConfirmation: vi.fn(),
}));

vi.mock('../instanceAi.memory.api', () => ({
	fetchThreads: vi.fn().mockResolvedValue({ threads: [], total: 0, page: 1, hasMore: false }),
	fetchThreadMessages: vi
		.fn()
		.mockResolvedValue({ threadId: 'thread-1', messages: [], nextEventId: 0 }),
	fetchThreadStatus: vi.fn().mockResolvedValue({
		hasActiveRun: false,
		isSuspended: false,
		taskRuns: [],
		backgroundTasks: [],
	}),
}));

// Mock EventSource globally
let capturedOnMessage: ((ev: MessageEvent) => void) | null = null;
let capturedInstance: MockEventSource | null = null;
const mockClose = vi.fn();

class MockEventSource {
	onopen: (() => void) | null = null;
	onmessage: ((ev: MessageEvent) => void) | null = null;
	onerror: (() => void) | null = null;
	readyState = 1; // OPEN
	private listeners: Record<string, Array<(ev: MessageEvent) => void>> = {};

	constructor(public url: string) {
		capturedInstance = this;
		// Capture onmessage after it's assigned (deferred via microtask)
		setTimeout(() => {
			capturedOnMessage = this.onmessage;
			// Trigger onopen to move to connected state
			this.onopen?.();
		}, 0);
	}

	addEventListener(type: string, handler: (ev: MessageEvent) => void): void {
		if (!this.listeners[type]) this.listeners[type] = [];
		this.listeners[type].push(handler);
	}

	/** Dispatch a named event (e.g. 'run-sync') to registered listeners. */
	dispatchNamedEvent(type: string, data: unknown): void {
		const handlers = this.listeners[type];
		if (!handlers) return;
		const ev = { data: JSON.stringify(data) } as unknown as MessageEvent;
		for (const h of handlers) h(ev);
	}

	close = mockClose;

	static readonly CONNECTING = 0;
	static readonly OPEN = 1;
	static readonly CLOSED = 2;
}

vi.stubGlobal('EventSource', MockEventSource);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeSSEEvent(data: unknown, lastEventId = ''): MessageEvent {
	return {
		data: JSON.stringify(data),
		lastEventId,
	} as unknown as MessageEvent;
}

function validRunStartEvent(runId: string, agentId: string) {
	return {
		type: 'run-start',
		runId,
		agentId,
		payload: { messageId: 'msg-1' },
	};
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

const mockFetchThreadMessages = vi.mocked(fetchThreadMessages);
const mockFetchThreadStatus = vi.mocked(fetchThreadStatus);
const mockEnsureThread = vi.mocked(ensureThread);
const mockPostMessage = vi.mocked(postMessage);

describe('useInstanceAiStore - onSSEMessage', () => {
	let store: ReturnType<typeof useInstanceAiStore>;

	beforeEach(async () => {
		setActivePinia(createPinia());
		capturedOnMessage = null;
		store = useInstanceAiStore();
		// newThread() clears module-level routing state before reconnecting SSE
		store.newThread();
		// Wait for the setTimeout in MockEventSource constructor
		await vi.waitFor(() => {
			expect(capturedOnMessage).not.toBeNull();
		});
	});

	afterEach(() => {
		store.closeSSE();
		vi.clearAllMocks();
		mockFetchThreadMessages.mockResolvedValue({
			threadId: 'thread-1',
			messages: [],
			nextEventId: 0,
		});
		mockFetchThreadStatus.mockResolvedValue({
			hasActiveRun: false,
			isSuspended: false,
			taskRuns: [],
			backgroundTasks: [],
		});
	});

	test('malformed SSE event (bad JSON shape) does not update messages or activeRunId', () => {
		// Send data that parses as JSON but fails Zod validation
		capturedOnMessage!(makeSSEEvent({ invalid: 'shape' }));

		expect(store.messages).toHaveLength(0);
		expect(store.activeRunId).toBeNull();
	});

	test('valid SSE event dispatched updates messages state correctly', () => {
		capturedOnMessage!(makeSSEEvent(validRunStartEvent('run-1', 'agent-root')));

		expect(store.messages).toHaveLength(1);
		expect(store.messages[0].runId).toBe('run-1');
		expect(store.activeRunId).toBe('run-1');
	});

	test('background-group run-sync does not overwrite activeRunId from orchestrator sync', () => {
		// First, create two assistant messages via normal events
		capturedOnMessage!(
			makeSSEEvent({
				type: 'run-start',
				runId: 'run-old',
				agentId: 'agent-root',
				payload: { messageId: 'msg-1', messageGroupId: 'mg-old' },
			}),
		);
		capturedOnMessage!(
			makeSSEEvent({
				type: 'run-finish',
				runId: 'run-old',
				agentId: 'agent-root',
				payload: { status: 'completed' },
			}),
		);
		capturedOnMessage!(
			makeSSEEvent({
				type: 'run-start',
				runId: 'run-active',
				agentId: 'agent-root',
				payload: { messageId: 'msg-2', messageGroupId: 'mg-active' },
			}),
		);

		expect(store.activeRunId).toBe('run-active');
		expect(store.messages).toHaveLength(2);

		// Now simulate reconnect: two run-sync frames arrive.
		// First: orchestrator group (active)
		capturedInstance!.dispatchNamedEvent('run-sync', {
			runId: 'run-active',
			messageGroupId: 'mg-active',
			runIds: ['run-active'],
			agentTree: {
				agentId: 'agent-root',
				role: 'orchestrator',
				status: 'active',
				textContent: '',
				reasoning: '',
				toolCalls: [],
				children: [],
				timeline: [],
			},
			status: 'active',
			taskRuns: [],
			backgroundTasks: [],
		});
		expect(store.activeRunId).toBe('run-active');

		// Second: background group from the older turn
		capturedInstance!.dispatchNamedEvent('run-sync', {
			runId: 'run-old',
			messageGroupId: 'mg-old',
			runIds: ['run-old'],
			agentTree: {
				agentId: 'agent-root',
				role: 'orchestrator',
				status: 'completed',
				textContent: 'old',
				reasoning: '',
				toolCalls: [],
				children: [
					{
						agentId: 'bg-task',
						role: 'workflow-builder',
						status: 'active',
						textContent: '',
						reasoning: '',
						toolCalls: [],
						children: [],
						timeline: [],
					},
				],
				timeline: [],
			},
			status: 'background',
			taskRuns: [],
			backgroundTasks: [],
		});

		// activeRunId must still point to the orchestrator run, NOT the background group's
		expect(store.activeRunId).toBe('run-active');
		// The old message should be updated with the background group's tree
		const oldMsg = store.messages.find((m) => m.messageGroupId === 'mg-old');
		// Background-only: isStreaming must be false so hasActiveBackgroundTasks
		// computed in InstanceAiMessage.vue correctly shows the background indicator
		expect(oldMsg?.isStreaming).toBe(false);
		expect(oldMsg?.agentTree?.children).toHaveLength(1);
	});

	test('run-sync creates a placeholder assistant message when no matching message exists yet', () => {
		capturedInstance!.dispatchNamedEvent('run-sync', {
			runId: 'run-suspended',
			messageGroupId: 'mg-suspended',
			runIds: ['run-suspended'],
			agentTree: {
				agentId: 'agent-root',
				role: 'orchestrator',
				status: 'suspended',
				textContent: '',
				reasoning: '',
				toolCalls: [
					{
						toolCallId: 'tool-plan-approval',
						toolName: 'request-plan-approval',
						args: {},
						isLoading: true,
						renderHint: 'plan',
						confirmation: {
							requestId: 'req-plan',
							severity: 'info',
							message: 'Review the plan before building.',
							inputType: 'approval',
						},
					},
				],
				children: [],
				timeline: [{ type: 'tool-call', toolCallId: 'tool-plan-approval' }],
				plan: {
					planId: 'plan-1',
					goal: 'Build a dashboard',
					summary: 'Phase-based plan',
					assumptions: [],
					externalSystems: [],
					dataContracts: [],
					acceptanceCriteria: [],
					openQuestions: [],
					status: 'awaiting_approval',
					lastUpdatedAt: '2026-03-18T10:00:00.000Z',
					phases: [],
				},
			},
			status: 'suspended',
			taskRuns: [],
			backgroundTasks: [],
		});

		expect(store.messages).toHaveLength(1);
		expect(store.messages[0].runId).toBe('run-suspended');
		expect(store.messages[0].messageGroupId).toBe('mg-suspended');
		expect(store.messages[0].agentTree?.plan?.planId).toBe('plan-1');
		expect(store.messages[0].isStreaming).toBe(true);
		expect(store.activeRunId).toBe('run-suspended');
	});

	test('currentPlan selects the latest assistant plan in the thread', () => {
		store.messages.push(
			{
				id: 'user-1',
				role: 'user',
				createdAt: '2026-03-18T10:00:00.000Z',
				content: 'Build something',
				reasoning: '',
				isStreaming: false,
			},
			{
				id: 'assistant-plan-1',
				runId: 'run-plan-1',
				role: 'assistant',
				createdAt: '2026-03-18T10:00:01.000Z',
				content: '',
				reasoning: '',
				isStreaming: false,
				agentTree: {
					agentId: 'agent-root-1',
					role: 'orchestrator',
					status: 'completed',
					textContent: '',
					reasoning: '',
					toolCalls: [],
					children: [],
					timeline: [],
					plan: {
						planId: 'plan-1',
						goal: 'First plan',
						summary: 'First summary',
						assumptions: [],
						externalSystems: [],
						dataContracts: [],
						acceptanceCriteria: [],
						openQuestions: [],
						status: 'completed',
						lastUpdatedAt: '2026-03-18T10:00:01.000Z',
						phases: [],
					},
				},
			},
			{
				id: 'assistant-no-plan',
				runId: 'run-no-plan',
				role: 'assistant',
				createdAt: '2026-03-18T10:00:02.000Z',
				content: 'Working',
				reasoning: '',
				isStreaming: false,
				agentTree: {
					agentId: 'agent-root-2',
					role: 'orchestrator',
					status: 'completed',
					textContent: 'Working',
					reasoning: '',
					toolCalls: [],
					children: [],
					timeline: [],
				},
			},
			{
				id: 'assistant-plan-2',
				runId: 'run-plan-2',
				role: 'assistant',
				createdAt: '2026-03-18T10:00:03.000Z',
				content: '',
				reasoning: '',
				isStreaming: false,
				agentTree: {
					agentId: 'agent-root-3',
					role: 'orchestrator',
					status: 'active',
					textContent: '',
					reasoning: '',
					toolCalls: [],
					children: [],
					timeline: [],
					plan: {
						planId: 'plan-2',
						goal: 'Latest plan',
						summary: 'Latest summary',
						assumptions: [],
						externalSystems: [],
						dataContracts: [],
						acceptanceCriteria: [],
						openQuestions: [],
						status: 'running',
						lastUpdatedAt: '2026-03-18T10:00:03.000Z',
						phases: [],
					},
				},
			},
		);

		expect(store.currentPlanMessage?.id).toBe('assistant-plan-2');
		expect(store.currentPlanAgentNode?.agentId).toBe('agent-root-3');
		expect(store.currentPlan?.planId).toBe('plan-2');
	});

	test('lastEventIdByThread is updated from sseEvent.lastEventId on every message', () => {
		const threadId = store.currentThreadId;

		capturedOnMessage!(makeSSEEvent(validRunStartEvent('run-1', 'agent-root'), '42'));

		expect(store.lastEventIdByThread[threadId]).toBe(42);

		// Second event updates the value
		capturedOnMessage!(
			makeSSEEvent(
				{
					type: 'text-delta',
					runId: 'run-1',
					agentId: 'agent-root',
					payload: { text: 'hello' },
				},
				'43',
			),
		);

		expect(store.lastEventIdByThread[threadId]).toBe(43);
	});

	test('deleting the last active thread clears stale routing state before the replacement thread starts', async () => {
		const deletedThreadId = store.currentThreadId;
		const previousEventSource = capturedInstance;
		const previousOnMessage = capturedOnMessage;

		capturedOnMessage!(
			makeSSEEvent({
				type: 'run-start',
				runId: 'run-old',
				agentId: 'old-root',
				payload: { messageId: 'msg-1', messageGroupId: 'mg-old' },
			}),
		);

		store.deleteThread(deletedThreadId);

		await vi.waitFor(() => {
			expect(capturedInstance).not.toBe(previousEventSource);
			expect(capturedOnMessage).not.toBe(previousOnMessage);
			expect(store.currentThreadId).not.toBe(deletedThreadId);
		});

		capturedOnMessage!(
			makeSSEEvent({
				type: 'text-delta',
				runId: 'run-old',
				agentId: 'fresh-root',
				payload: { text: 'hello again' },
			}),
		);

		expect(store.messages).toHaveLength(1);
		expect(store.messages[0].messageGroupId).toBe('run-old');
		expect(store.messages[0].agentTree?.agentId).toBe('fresh-root');
	});

	test('loadHistoricalMessages skips unsafe routing identifiers when rebuilding state', async () => {
		mockFetchThreadMessages.mockResolvedValueOnce({
			threadId: store.currentThreadId,
			messages: [
				{
					id: 'msg-unsafe',
					runId: 'safe-run',
					messageGroupId: '__proto__',
					role: 'assistant',
					createdAt: new Date().toISOString(),
					content: '',
					reasoning: '',
					isStreaming: false,
					agentTree: {
						agentId: 'agent-root',
						role: 'orchestrator',
						status: 'completed',
						textContent: '',
						reasoning: '',
						toolCalls: [],
						children: [],
						timeline: [],
					},
				},
			],
			nextEventId: 11,
		});

		await store.loadHistoricalMessages(store.currentThreadId);

		capturedOnMessage!(
			makeSSEEvent({
				type: 'text-delta',
				runId: 'safe-run',
				agentId: 'fresh-root',
				payload: { text: 'restored safely' },
			}),
		);

		expect(store.messages).toHaveLength(1);
		expect(store.messages[0].messageGroupId).toBe('__proto__');
		expect(store.messages[0].agentTree?.agentId).toBe('agent-root');
		expect(store.messages[0].content).toBe('');
	});

	test('run-sync skips unsafe group identifiers instead of registering them', () => {
		capturedOnMessage!(
			makeSSEEvent({
				type: 'run-start',
				runId: 'run-safe',
				agentId: 'agent-root',
				payload: { messageId: 'msg-1', messageGroupId: 'run-safe' },
			}),
		);

		capturedInstance!.dispatchNamedEvent('run-sync', {
			runId: 'run-safe',
			messageGroupId: '__proto__',
			runIds: ['run-safe', '__proto__'],
			agentTree: {
				agentId: 'agent-root',
				role: 'orchestrator',
				status: 'completed',
				textContent: 'unsafe sync',
				reasoning: '',
				toolCalls: [],
				children: [],
				timeline: [],
			},
			status: 'background',
			taskRuns: [],
			backgroundTasks: [],
		});

		expect(store.messages).toHaveLength(1);
		expect(store.messages[0].messageGroupId).toBe('run-safe');
		expect(store.messages[0].agentTree?.textContent).toBe('');
	});

	test('sendMessage syncs a new thread before the first post and reuses the persisted thread afterwards', async () => {
		mockEnsureThread.mockResolvedValueOnce({
			thread: {
				id: store.currentThreadId,
				title: '',
				resourceId: 'user-1',
				createdAt: '2026-01-01T00:00:00.000Z',
				updatedAt: '2026-01-01T00:00:00.000Z',
			},
			created: true,
		});
		mockPostMessage.mockResolvedValue({ runId: 'run-1' });

		await store.sendMessage('first');
		await store.sendMessage('second');

		expect(mockEnsureThread).toHaveBeenCalledTimes(1);
		expect(mockEnsureThread).toHaveBeenCalledWith(
			expect.objectContaining({ baseUrl: 'http://localhost:5678/api' }),
			store.currentThreadId,
		);
		expect(mockPostMessage).toHaveBeenCalledTimes(2);
	});
});
