import { setActivePinia, createPinia } from 'pinia';
import { describe, test, it, expect, vi, beforeEach, afterEach, beforeAll, afterAll } from 'vitest';
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

const localStorageStub = {
	getItem: vi.fn(() => 'false'),
	setItem: vi.fn(),
	removeItem: vi.fn(),
	clear: vi.fn(),
};

const originalLocalStorage = globalThis.localStorage;

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

beforeAll(() => {
	vi.stubGlobal('localStorage', localStorageStub);
});

afterAll(() => {
	if (typeof originalLocalStorage === 'undefined') {
		Reflect.deleteProperty(globalThis, 'localStorage');
	} else {
		Object.defineProperty(globalThis, 'localStorage', {
			configurable: true,
			value: originalLocalStorage,
		});
	}
});

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

	test('switchThread clears thread-scoped runtime state before historical messages resolve', async () => {
		const seededThreadId = store.currentThreadId;

		let resolveFetchThreadMessages:
			| ((value: Awaited<ReturnType<typeof fetchThreadMessages>>) => void)
			| undefined;

		mockFetchThreadMessages.mockReturnValueOnce(
			new Promise((resolve) => {
				resolveFetchThreadMessages = resolve;
			}),
		);

		capturedOnMessage!(
			makeSSEEvent({
				type: 'run-start',
				runId: 'run-seeded',
				agentId: 'agent-root',
				payload: { messageId: 'msg-1', messageGroupId: 'mg-seeded' },
			}),
		);
		store.submitFeedback('resp-1', { rating: 'up' });
		store.resolveConfirmation('request-1', 'approved');

		expect(store.currentThreadId).toBe(seededThreadId);
		expect(store.messages).toHaveLength(1);
		expect(store.activeRunId).toBe('run-seeded');
		expect(store.debugEvents).toHaveLength(1);
		expect(store.feedbackByResponseId).toEqual({ 'resp-1': { rating: 'up' } });
		expect(store.resolvedConfirmationIds.size).toBe(1);

		store.switchThread('thread-2');

		expect(store.currentThreadId).toBe('thread-2');
		expect(store.isHydratingThread).toBe(true);
		expect(store.messages).toEqual([]);
		expect(store.activeRunId).toBeNull();
		expect(store.debugEvents).toEqual([]);
		expect(store.feedbackByResponseId).toEqual({});
		expect(store.resolvedConfirmationIds.size).toBe(0);

		resolveFetchThreadMessages?.({
			threadId: 'thread-2',
			messages: [],
			nextEventId: 0,
		});

		await vi.waitFor(() => {
			expect(store.isHydratingThread).toBe(false);
		});
	});

	test('switchThread ignores stale historical hydration completion from a previously requested thread', async () => {
		let resolveThreadA:
			| ((value: Awaited<ReturnType<typeof fetchThreadMessages>>) => void)
			| undefined;
		let resolveThreadB:
			| ((value: Awaited<ReturnType<typeof fetchThreadMessages>>) => void)
			| undefined;

		mockFetchThreadMessages
			.mockReturnValueOnce(
				new Promise((resolve) => {
					resolveThreadA = resolve;
				}),
			)
			.mockReturnValueOnce(
				new Promise((resolve) => {
					resolveThreadB = resolve;
				}),
			);

		const sseBeforeSwitches = capturedInstance;

		store.switchThread('thread-a');
		store.switchThread('thread-b');

		expect(store.currentThreadId).toBe('thread-b');
		expect(store.isHydratingThread).toBe(true);

		resolveThreadA?.({
			threadId: 'thread-a',
			messages: [],
			nextEventId: 0,
		});
		await new Promise((resolve) => setTimeout(resolve, 0));

		expect(store.currentThreadId).toBe('thread-b');
		expect(store.sseState).toBe('disconnected');
		expect(mockFetchThreadStatus).not.toHaveBeenCalledWith(expect.anything(), 'thread-a');
		expect(capturedInstance).toBe(sseBeforeSwitches);

		resolveThreadB?.({
			threadId: 'thread-b',
			messages: [],
			nextEventId: 0,
		});

		await vi.waitFor(() => {
			expect(mockFetchThreadStatus).toHaveBeenCalledWith(
				expect.objectContaining({ baseUrl: 'http://localhost:5678/api' }),
				'thread-b',
			);
		});
		await vi.waitFor(() => {
			expect(capturedInstance).not.toBe(sseBeforeSwitches);
		});
	});

	test('switchThread ignores stale A hydration in an A -> B -> A sequence', async () => {
		let resolveFirstA:
			| ((value: Awaited<ReturnType<typeof fetchThreadMessages>>) => void)
			| undefined;
		let resolveB: ((value: Awaited<ReturnType<typeof fetchThreadMessages>>) => void) | undefined;
		let resolveSecondA:
			| ((value: Awaited<ReturnType<typeof fetchThreadMessages>>) => void)
			| undefined;

		mockFetchThreadMessages
			.mockReturnValueOnce(
				new Promise((resolve) => {
					resolveFirstA = resolve;
				}),
			)
			.mockReturnValueOnce(
				new Promise((resolve) => {
					resolveB = resolve;
				}),
			)
			.mockReturnValueOnce(
				new Promise((resolve) => {
					resolveSecondA = resolve;
				}),
			);

		const sseBeforeSwitches = capturedInstance;

		store.switchThread('thread-a');
		store.switchThread('thread-b');
		store.switchThread('thread-a');

		expect(store.currentThreadId).toBe('thread-a');
		expect(store.isHydratingThread).toBe(true);
		expect(store.messages).toEqual([]);

		resolveFirstA?.({
			threadId: 'thread-a',
			messages: [
				{
					id: 'msg-stale-a',
					runId: 'run-stale-a',
					messageGroupId: 'mg-stale-a',
					role: 'assistant',
					createdAt: new Date().toISOString(),
					content: 'stale',
					reasoning: '',
					isStreaming: false,
					agentTree: {
						agentId: 'agent-root',
						role: 'orchestrator',
						status: 'completed',
						textContent: 'stale',
						reasoning: '',
						toolCalls: [],
						children: [],
						timeline: [],
					},
				},
			],
			nextEventId: 11,
		});
		await new Promise((resolve) => setTimeout(resolve, 0));

		expect(store.currentThreadId).toBe('thread-a');
		expect(store.isHydratingThread).toBe(true);
		expect(store.messages).toEqual([]);
		expect(store.lastEventIdByThread['thread-a']).toBeUndefined();
		expect(mockFetchThreadStatus).not.toHaveBeenCalledWith(expect.anything(), 'thread-a');
		expect(store.sseState).toBe('disconnected');
		expect(capturedInstance).toBe(sseBeforeSwitches);

		resolveB?.({
			threadId: 'thread-b',
			messages: [],
			nextEventId: 0,
		});
		await new Promise((resolve) => setTimeout(resolve, 0));

		expect(store.currentThreadId).toBe('thread-a');
		expect(store.isHydratingThread).toBe(true);
		expect(store.messages).toEqual([]);
		expect(store.lastEventIdByThread['thread-a']).toBeUndefined();
		expect(capturedInstance).toBe(sseBeforeSwitches);

		resolveSecondA?.({
			threadId: 'thread-a',
			messages: [
				{
					id: 'msg-fresh-a',
					runId: 'run-fresh-a',
					messageGroupId: 'mg-fresh-a',
					role: 'assistant',
					createdAt: new Date().toISOString(),
					content: 'fresh',
					reasoning: '',
					isStreaming: false,
					agentTree: {
						agentId: 'agent-root',
						role: 'orchestrator',
						status: 'completed',
						textContent: 'fresh',
						reasoning: '',
						toolCalls: [],
						children: [],
						timeline: [],
					},
				},
			],
			nextEventId: 31,
		});

		await vi.waitFor(() => {
			expect(store.isHydratingThread).toBe(false);
		});
		expect(store.messages).toHaveLength(1);
		expect(store.messages[0].id).toBe('msg-fresh-a');
		expect(store.lastEventIdByThread['thread-a']).toBe(30);
		await vi.waitFor(() => {
			expect(mockFetchThreadStatus).toHaveBeenCalledWith(
				expect.objectContaining({ baseUrl: 'http://localhost:5678/api' }),
				'thread-a',
			);
		});
		await vi.waitFor(() => {
			expect(capturedInstance).not.toBe(sseBeforeSwitches);
		});
	});

	test('loadHistoricalMessages reports stale when a later direct hydration request supersedes it', async () => {
		let resolveThreadA:
			| ((value: Awaited<ReturnType<typeof fetchThreadMessages>>) => void)
			| undefined;
		let resolveThreadB:
			| ((value: Awaited<ReturnType<typeof fetchThreadMessages>>) => void)
			| undefined;

		mockFetchThreadMessages
			.mockReturnValueOnce(
				new Promise((resolve) => {
					resolveThreadA = resolve;
				}),
			)
			.mockReturnValueOnce(
				new Promise((resolve) => {
					resolveThreadB = resolve;
				}),
			);

		store.currentThreadId = 'thread-a';
		const staleHydration = store.loadHistoricalMessages('thread-a');

		store.currentThreadId = 'thread-b';
		const currentHydration = store.loadHistoricalMessages('thread-b');

		resolveThreadA?.({
			threadId: 'thread-a',
			messages: [],
			nextEventId: 11,
		});
		await expect(staleHydration).resolves.toBe('stale');
		expect(store.lastEventIdByThread['thread-a']).toBeUndefined();

		resolveThreadB?.({
			threadId: 'thread-b',
			messages: [],
			nextEventId: 21,
		});
		await expect(currentHydration).resolves.toBe('applied');
		expect(store.lastEventIdByThread['thread-b']).toBe(20);
	});

	test('loadHistoricalMessages returns skipped when current thread already has messages', async () => {
		store.messages = [
			{
				id: 'existing-user-message',
				role: 'user',
				createdAt: new Date().toISOString(),
				content: 'already hydrated',
				reasoning: '',
				isStreaming: false,
			},
		];
		mockFetchThreadMessages.mockResolvedValueOnce({
			threadId: store.currentThreadId,
			messages: [],
			nextEventId: 10,
		});

		await expect(store.loadHistoricalMessages(store.currentThreadId)).resolves.toBe('skipped');
		expect(store.messages).toHaveLength(1);
		expect(store.lastEventIdByThread[store.currentThreadId]).toBeUndefined();
	});

	test('loadHistoricalMessages returns applied on fetch failure when hydration request is current', async () => {
		mockFetchThreadMessages.mockRejectedValueOnce(new Error('fetch failed'));

		await expect(store.loadHistoricalMessages(store.currentThreadId)).resolves.toBe('applied');
		expect(store.isHydratingThread).toBe(false);
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

	test('sendMessage enqueues the optimistic user message before a new thread finishes syncing', async () => {
		let resolveEnsureThread:
			| ((value: Awaited<ReturnType<typeof ensureThread>>) => void)
			| undefined;

		mockEnsureThread.mockReturnValueOnce(
			new Promise((resolve) => {
				resolveEnsureThread = resolve;
			}),
		);
		mockPostMessage.mockResolvedValue({ runId: 'run-1' });

		const sendPromise = store.sendMessage('first');

		expect(store.messages).toHaveLength(1);
		expect(store.messages[0]).toMatchObject({
			role: 'user',
			content: 'first',
			isStreaming: false,
		});
		expect(mockPostMessage).not.toHaveBeenCalled();

		resolveEnsureThread?.({
			thread: {
				id: store.currentThreadId,
				title: '',
				resourceId: 'user-1',
				createdAt: '2026-01-01T00:00:00.000Z',
				updatedAt: '2026-01-01T00:00:00.000Z',
			},
			created: true,
		});

		await sendPromise;

		expect(mockPostMessage).toHaveBeenCalledTimes(1);
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

	test('sendMessage reconnects SSE when connection was closed', async () => {
		mockPostMessage.mockResolvedValue({ runId: 'run-1' });

		// SSE is connected after beforeEach setup. Close it to simulate
		// Suspense unmount killing the connection during layout transition.
		store.closeSSE();
		expect(store.sseState).toBe('disconnected');

		// Clear capturedInstance so we can verify a *new* EventSource is created
		capturedInstance = null;

		await store.sendMessage('hello');

		// sendMessage should have re-opened an EventSource before posting
		expect(capturedInstance).not.toBeNull();
		expect(mockPostMessage).toHaveBeenCalled();
	});

	test('sendMessage rolls back optimistic message when thread sync fails and resets sending state', async () => {
		let rejectEnsureThread: ((reason?: unknown) => void) | undefined;

		mockEnsureThread.mockReturnValueOnce(
			new Promise((_resolve, reject) => {
				rejectEnsureThread = reject;
			}),
		);

		const sendPromise = store.sendMessage('first');

		expect(store.isSendingMessage).toBe(true);
		expect(store.messages).toHaveLength(1);
		expect(store.messages[0]).toMatchObject({
			role: 'user',
			content: 'first',
			isStreaming: false,
		});
		expect(mockPostMessage).not.toHaveBeenCalled();

		rejectEnsureThread?.(new Error('sync failed'));
		await sendPromise;

		expect(mockPostMessage).not.toHaveBeenCalled();
		expect(store.messages).toHaveLength(0);
		expect(store.isSendingMessage).toBe(false);
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
