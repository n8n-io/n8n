import { setActivePinia, createPinia } from 'pinia';
import { describe, test, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { fetchThreadMessages, fetchThreadStatus } from '../instanceAi.memory.api';
import { ensureThread, postMessage, postConfirmation } from '../instanceAi.api';
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

const mockTelemetryTrack = vi.fn();
vi.mock('@/app/composables/useTelemetry', () => ({
	useTelemetry: vi.fn().mockReturnValue({
		track: (...args: unknown[]) => mockTelemetryTrack(...args),
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
	fetchThreadStatus: vi
		.fn()
		.mockResolvedValue({ hasActiveRun: false, isSuspended: false, backgroundTasks: [] }),
	deleteThread: vi.fn().mockResolvedValue(undefined),
	renameThread: vi.fn().mockResolvedValue({ thread: {} }),
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
const mockPostConfirmation = vi.mocked(postConfirmation);

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

		await store.deleteThread(deletedThreadId);

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

	test('sendMessage forwards pushRef to postMessage', async () => {
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

		await store.sendMessage('hello', undefined, 'iframe-push-ref-123');

		expect(mockPostMessage).toHaveBeenCalledWith(
			expect.anything(),
			store.currentThreadId,
			'hello',
			undefined,
			undefined,
			expect.any(String),
			'iframe-push-ref-123',
		);
	});

	test('sendMessage omits pushRef when not provided', async () => {
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

		await store.sendMessage('hello');

		expect(mockPostMessage).toHaveBeenCalledWith(
			expect.anything(),
			store.currentThreadId,
			'hello',
			undefined,
			undefined,
			expect.any(String),
			undefined,
		);
	});
});

// ---------------------------------------------------------------------------
// Store-level feedback integration tests
// (Composable logic is tested in useResponseFeedback.test.ts)
// ---------------------------------------------------------------------------

describe('useInstanceAiStore - feedback integration', () => {
	let store: ReturnType<typeof useInstanceAiStore>;

	beforeEach(async () => {
		setActivePinia(createPinia());
		capturedOnMessage = null;
		store = useInstanceAiStore();
		store.newThread();
		await vi.waitFor(() => {
			expect(capturedOnMessage).not.toBeNull();
		});
	});

	afterEach(() => {
		store.closeSSE();
		vi.clearAllMocks();
	});

	test('store exposes rateableResponseId, feedbackByResponseId, and submitFeedback', () => {
		expect(store.rateableResponseId).toBeNull();
		expect(store.feedbackByResponseId).toEqual({});
		expect(typeof store.submitFeedback).toBe('function');
	});

	test('feedbackByResponseId is cleared when creating a new thread', async () => {
		store.submitFeedback('resp-1', { rating: 'up' });
		expect(store.feedbackByResponseId['resp-1']).toBeDefined();

		store.newThread();
		await vi.waitFor(() => {
			expect(capturedOnMessage).not.toBeNull();
		});

		expect(Object.keys(store.feedbackByResponseId)).toHaveLength(0);
	});

	// -----------------------------------------------------------------
	// Credits — isLowCredits / creditsPercentageRemaining
	// -----------------------------------------------------------------

	describe('isLowCredits', () => {
		it('should return false when credits are undefined', () => {
			expect(store.isLowCredits).toBe(false);
		});

		it('should return false when credits are above 10%', () => {
			store.creditsQuota = 100;
			store.creditsClaimed = 89;
			expect(store.isLowCredits).toBe(false);
		});

		it('should return true when credits are exactly 10%', () => {
			store.creditsQuota = 100;
			store.creditsClaimed = 90;
			expect(store.isLowCredits).toBe(true);
		});

		it('should return true when credits are below 10%', () => {
			store.creditsQuota = 100;
			store.creditsClaimed = 95;
			expect(store.isLowCredits).toBe(true);
		});

		it('should return false when quota is unlimited (-1)', () => {
			store.creditsQuota = -1;
			store.creditsClaimed = 50;
			expect(store.isLowCredits).toBe(false);
		});

		it('should return true when quota is 0', () => {
			store.creditsQuota = 0;
			store.creditsClaimed = 0;
			expect(store.isLowCredits).toBe(true);
		});

		it('should return true when all credits are consumed', () => {
			store.creditsQuota = 100;
			store.creditsClaimed = 100;
			expect(store.isLowCredits).toBe(true);
		});
	});

	describe('creditsPercentageRemaining', () => {
		it('should return undefined when credits are not initialized', () => {
			expect(store.creditsPercentageRemaining).toBeUndefined();
		});

		it('should return undefined when quota is unlimited (-1)', () => {
			store.creditsQuota = -1;
			store.creditsClaimed = 50;
			expect(store.creditsPercentageRemaining).toBeUndefined();
		});

		it('should return 0 when quota is 0', () => {
			store.creditsQuota = 0;
			store.creditsClaimed = 0;
			expect(store.creditsPercentageRemaining).toBe(0);
		});

		it('should calculate percentage correctly', () => {
			store.creditsQuota = 100;
			store.creditsClaimed = 75;
			expect(store.creditsPercentageRemaining).toBe(25);
		});
	});
});

// ---------------------------------------------------------------------------
// confirmResourceDecision / confirmAction (resource-decision token)
// ---------------------------------------------------------------------------

describe('useInstanceAiStore - gateway resource-decision confirmation', () => {
	let store: ReturnType<typeof useInstanceAiStore>;

	beforeEach(async () => {
		setActivePinia(createPinia());
		capturedOnMessage = null;
		store = useInstanceAiStore();
		store.newThread();
		await vi.waitFor(() => {
			expect(capturedOnMessage).not.toBeNull();
		});
		mockPostConfirmation.mockResolvedValue(undefined);
	});

	afterEach(() => {
		store.closeSSE();
		vi.clearAllMocks();
	});

	it('confirmAction passes resourceDecision to postConfirmation', async () => {
		await store.confirmAction(
			'req-1',
			true,
			undefined,
			undefined,
			undefined,
			undefined,
			undefined,
			undefined,
			undefined,
			'allowOnce',
		);

		expect(mockPostConfirmation).toHaveBeenCalledOnce();
		expect(mockPostConfirmation).toHaveBeenCalledWith(
			expect.anything(),
			'req-1',
			true,
			undefined,
			undefined,
			undefined,
			undefined,
			undefined,
			undefined,
			undefined,
			'allowOnce',
		);
	});

	it('confirmResourceDecision calls postConfirmation with approved=true and the decision', async () => {
		await store.confirmResourceDecision('req-2', 'allowForSession');

		expect(mockPostConfirmation).toHaveBeenCalledOnce();
		expect(mockPostConfirmation).toHaveBeenCalledWith(
			expect.anything(),
			'req-2',
			true,
			undefined,
			undefined,
			undefined,
			undefined,
			undefined,
			undefined,
			undefined,
			'allowForSession',
		);
	});

	it('confirmResourceDecision does not call postConfirmation when confirmAction throws', async () => {
		mockPostConfirmation.mockRejectedValueOnce(new Error('network error'));

		await store.confirmResourceDecision('req-3', 'denyOnce');

		// postConfirmation was called once (inside confirmAction) but threw
		expect(mockPostConfirmation).toHaveBeenCalledOnce();
	});
});
