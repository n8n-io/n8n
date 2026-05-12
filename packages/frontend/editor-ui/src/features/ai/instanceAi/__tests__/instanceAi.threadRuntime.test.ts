import { setActivePinia } from 'pinia';
import { createTestingPinia } from '@pinia/testing';
import { describe, test, it, expect, vi, beforeEach, afterEach, beforeAll, afterAll } from 'vitest';
import { useRootStore } from '@n8n/stores/useRootStore';
import { mockedStore } from '@/__tests__/utils';
import { useWorkflowsListStore } from '@/app/stores/workflowsList.store';
import { fetchThreadMessages, fetchThreadStatus } from '../instanceAi.memory.api';
import { ensureThread, postMessage, postConfirmation } from '../instanceAi.api';
import { createThreadRuntime, type ThreadRuntime } from '../instanceAi.threadRuntime';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

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

let activeThreadId = '';

function setupRuntimePinia() {
	const pinia = createTestingPinia();
	setActivePinia(pinia);
	const rootStore = mockedStore(useRootStore);
	rootStore.restApiContext = {
		baseUrl: 'http://localhost:5678/api',
		pushRef: 'test-ref',
	};
	rootStore.instanceId = 'instance-1';

	const workflowsListStore = mockedStore(useWorkflowsListStore);
	workflowsListStore.getWorkflowById.mockReturnValue(
		undefined as unknown as ReturnType<typeof workflowsListStore.getWorkflowById>,
	);
}

type RuntimeRegistry = {
	getOrCreateRuntime: (threadId: string) => ThreadRuntime;
	getRuntime: (threadId: string) => ThreadRuntime | undefined;
	deleteThread: (threadId: string) => Promise<boolean>;
};

function createRuntimeRegistry(): RuntimeRegistry {
	const runtimes = new Map<string, ThreadRuntime>();
	const hooks = {
		getResearchMode: () => false,
		onTitleUpdated: vi.fn(),
		onRunFinish: vi.fn(),
	} satisfies Parameters<typeof createThreadRuntime>[1];

	return {
		getOrCreateRuntime(threadId) {
			const existing = runtimes.get(threadId);
			if (existing) return existing;

			const runtime = createThreadRuntime(threadId, hooks);
			runtimes.set(threadId, runtime);
			return runtime;
		},
		getRuntime(threadId) {
			return runtimes.get(threadId);
		},
		async deleteThread(threadId) {
			runtimes.get(threadId)?.dispose();
			runtimes.delete(threadId);
			return true;
		},
	};
}

function activeRuntime(registry: RuntimeRegistry) {
	return registry.getOrCreateRuntime(activeThreadId);
}

function activateThread(registry: RuntimeRegistry, threadId: string): void {
	activeRuntime(registry).closeSSE();
	activeThreadId = threadId;
	const runtime = registry.getOrCreateRuntime(threadId);

	if (runtime.hydrationStatus === 'hydrating') return;
	if (runtime.hydrationStatus === 'ready') {
		void runtime.loadThreadStatus();
		runtime.connectSSE();
		return;
	}

	void runtime.loadHistoricalMessages().then((hydrationStatus) => {
		if (activeThreadId !== threadId || hydrationStatus !== 'applied') return;
		void runtime.loadThreadStatus();
		runtime.connectSSE();
	});
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

describe('createThreadRuntime - SSE and hydration', () => {
	let registry: RuntimeRegistry;

	beforeEach(async () => {
		setupRuntimePinia();
		capturedOnMessage = null;
		registry = createRuntimeRegistry();
		activeThreadId = 'thread-active';
		activeRuntime(registry).connectSSE();
		// Wait for the setTimeout in MockEventSource constructor
		await vi.waitFor(() => {
			expect(capturedOnMessage).not.toBeNull();
		});
	});

	afterEach(() => {
		activeRuntime(registry).closeSSE();
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

		expect(activeRuntime(registry).messages).toHaveLength(0);
		expect(activeRuntime(registry).activeRunId).toBeNull();
	});

	test('valid SSE event dispatched updates messages state correctly', () => {
		capturedOnMessage!(makeSSEEvent(validRunStartEvent('run-1', 'agent-root')));

		expect(activeRuntime(registry).messages).toHaveLength(1);
		expect(activeRuntime(registry).messages[0].runId).toBe('run-1');
		expect(activeRuntime(registry).activeRunId).toBe('run-1');
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

		expect(activeRuntime(registry).activeRunId).toBe('run-active');
		expect(activeRuntime(registry).messages).toHaveLength(2);

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
		expect(activeRuntime(registry).activeRunId).toBe('run-active');

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
		expect(activeRuntime(registry).activeRunId).toBe('run-active');
		// The old message should be updated with the background group's tree
		const oldMsg = activeRuntime(registry).messages.find((m) => m.messageGroupId === 'mg-old');
		// Background-only: isStreaming must be false so hasActiveBackgroundTasks
		// computed in InstanceAiMessage.vue correctly shows the background indicator
		expect(oldMsg?.isStreaming).toBe(false);
		expect(oldMsg?.agentTree?.children).toHaveLength(1);
	});

	test('lastEventId is updated from sseEvent.lastEventId on every message', () => {
		const threadId = activeThreadId;

		capturedOnMessage!(makeSSEEvent(validRunStartEvent('run-1', 'agent-root'), '42'));

		expect(registry.getRuntime(threadId)?.lastEventId).toBe(42);

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

		expect(registry.getRuntime(threadId)?.lastEventId).toBe(43);
	});

	test('deleting the last active thread clears stale routing state before the replacement thread starts', async () => {
		const deletedThreadId = activeThreadId;
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

		await registry.deleteThread(deletedThreadId);
		activeThreadId = 'thread-replacement';
		expect(activeThreadId).not.toBe(deletedThreadId);
		activeRuntime(registry).connectSSE();
		await vi.waitFor(() => {
			expect(capturedInstance).not.toBe(previousEventSource);
			expect(capturedOnMessage).not.toBe(previousOnMessage);
		});

		capturedOnMessage!(
			makeSSEEvent({
				type: 'text-delta',
				runId: 'run-old',
				agentId: 'fresh-root',
				payload: { text: 'hello again' },
			}),
		);

		expect(activeRuntime(registry).messages).toHaveLength(1);
		expect(activeRuntime(registry).messages[0].messageGroupId).toBe('run-old');
		expect(activeRuntime(registry).messages[0].agentTree?.agentId).toBe('fresh-root');
	});

	test('route activation creates isolated runtime state before historical messages resolve', async () => {
		const seededThreadId = activeThreadId;

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
		activeRuntime(registry).submitFeedback('resp-1', { rating: 'up' });
		activeRuntime(registry).resolveConfirmation('request-1', 'approved');

		expect(activeThreadId).toBe(seededThreadId);
		expect(activeRuntime(registry).messages).toHaveLength(1);
		expect(activeRuntime(registry).activeRunId).toBe('run-seeded');
		expect(activeRuntime(registry).debugEvents).toHaveLength(1);
		expect(activeRuntime(registry).feedbackByResponseId).toEqual({ 'resp-1': { rating: 'up' } });
		expect(activeRuntime(registry).resolvedConfirmationIds.size).toBe(1);

		activateThread(registry, 'thread-2');

		expect(activeThreadId).toBe('thread-2');
		expect(activeRuntime(registry).isHydratingThread).toBe(true);
		expect(activeRuntime(registry).messages).toEqual([]);
		expect(activeRuntime(registry).activeRunId).toBeNull();
		expect(activeRuntime(registry).debugEvents).toEqual([]);
		expect(activeRuntime(registry).feedbackByResponseId).toEqual({});
		expect(activeRuntime(registry).resolvedConfirmationIds.size).toBe(0);

		resolveFetchThreadMessages?.({
			threadId: 'thread-2',
			messages: [],
			nextEventId: 0,
		});

		await vi.waitFor(() => {
			expect(activeRuntime(registry).isHydratingThread).toBe(false);
		});
	});

	test('route activation ignores stale historical hydration completion from a previous route', async () => {
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

		activateThread(registry, 'thread-a');
		activateThread(registry, 'thread-b');

		expect(activeThreadId).toBe('thread-b');
		expect(activeRuntime(registry).isHydratingThread).toBe(true);

		resolveThreadA?.({
			threadId: 'thread-a',
			messages: [],
			nextEventId: 0,
		});
		await new Promise((resolve) => setTimeout(resolve, 0));

		expect(activeThreadId).toBe('thread-b');
		expect(activeRuntime(registry).sseState).toBe('disconnected');
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

	test('route activation reuses pending A hydration in an A -> B -> A sequence', async () => {
		let resolveFirstA:
			| ((value: Awaited<ReturnType<typeof fetchThreadMessages>>) => void)
			| undefined;
		let resolveB: ((value: Awaited<ReturnType<typeof fetchThreadMessages>>) => void) | undefined;

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
			);

		const sseBeforeSwitches = capturedInstance;

		activateThread(registry, 'thread-a');
		activateThread(registry, 'thread-b');
		activateThread(registry, 'thread-a');

		expect(activeThreadId).toBe('thread-a');
		expect(activeRuntime(registry).isHydratingThread).toBe(true);
		expect(activeRuntime(registry).messages).toEqual([]);

		resolveFirstA?.({
			threadId: 'thread-a',
			messages: [
				{
					id: 'msg-restored-a',
					runId: 'run-restored-a',
					messageGroupId: 'mg-restored-a',
					role: 'assistant',
					createdAt: new Date().toISOString(),
					content: 'restored',
					reasoning: '',
					isStreaming: false,
					agentTree: {
						agentId: 'agent-root',
						role: 'orchestrator',
						status: 'completed',
						textContent: 'restored',
						reasoning: '',
						toolCalls: [],
						children: [],
						timeline: [],
					},
				},
			],
			nextEventId: 11,
		});

		await vi.waitFor(() => {
			expect(activeRuntime(registry).isHydratingThread).toBe(false);
		});
		expect(activeRuntime(registry).messages).toHaveLength(1);
		expect(activeRuntime(registry).messages[0].id).toBe('msg-restored-a');
		expect(registry.getRuntime('thread-a')?.lastEventId).toBe(10);
		await vi.waitFor(() => {
			expect(mockFetchThreadStatus).toHaveBeenCalledWith(
				expect.objectContaining({ baseUrl: 'http://localhost:5678/api' }),
				'thread-a',
			);
		});
		await vi.waitFor(() => {
			expect(capturedInstance).not.toBe(sseBeforeSwitches);
		});

		const sseAfterAReconnect = capturedInstance;
		resolveB?.({
			threadId: 'thread-b',
			messages: [],
			nextEventId: 0,
		});
		await new Promise((resolve) => setTimeout(resolve, 0));

		expect(activeThreadId).toBe('thread-a');
		expect(capturedInstance).toBe(sseAfterAReconnect);
		expect(mockFetchThreadStatus).not.toHaveBeenCalledWith(expect.anything(), 'thread-b');
	});

	test('loadHistoricalMessages hydrates separate thread runtimes independently', async () => {
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

		activeThreadId = 'thread-a';
		const threadAHydration = registry.getOrCreateRuntime('thread-a').loadHistoricalMessages();

		activeThreadId = 'thread-b';
		const currentHydration = registry.getOrCreateRuntime('thread-b').loadHistoricalMessages();

		resolveThreadA?.({
			threadId: 'thread-a',
			messages: [],
			nextEventId: 11,
		});
		await expect(threadAHydration).resolves.toBe('applied');
		expect(registry.getRuntime('thread-a')?.lastEventId).toBe(10);

		resolveThreadB?.({
			threadId: 'thread-b',
			messages: [],
			nextEventId: 21,
		});
		await expect(currentHydration).resolves.toBe('applied');
		expect(registry.getRuntime('thread-b')?.lastEventId).toBe(20);
	});

	test('loadHistoricalMessages returns skipped when current thread already has messages', async () => {
		activeRuntime(registry).messages = [
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
			threadId: activeThreadId,
			messages: [],
			nextEventId: 10,
		});

		await expect(activeRuntime(registry).loadHistoricalMessages()).resolves.toBe('skipped');
		expect(activeRuntime(registry).messages).toHaveLength(1);
		expect(activeRuntime(registry).lastEventId).toBeUndefined();
	});

	test('loadHistoricalMessages returns applied on fetch failure when hydration request is current', async () => {
		mockFetchThreadMessages.mockRejectedValueOnce(new Error('fetch failed'));

		await expect(activeRuntime(registry).loadHistoricalMessages()).resolves.toBe('applied');
		expect(activeRuntime(registry).isHydratingThread).toBe(false);
	});

	test('loadHistoricalMessages skips unsafe routing identifiers when rebuilding state', async () => {
		mockFetchThreadMessages.mockResolvedValueOnce({
			threadId: activeThreadId,
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

		await activeRuntime(registry).loadHistoricalMessages();

		capturedOnMessage!(
			makeSSEEvent({
				type: 'text-delta',
				runId: 'safe-run',
				agentId: 'fresh-root',
				payload: { text: 'restored safely' },
			}),
		);

		expect(activeRuntime(registry).messages).toHaveLength(1);
		expect(activeRuntime(registry).messages[0].messageGroupId).toBe('safe-run');
		expect(activeRuntime(registry).messages[0].agentTree?.agentId).toBe('fresh-root');
		expect(activeRuntime(registry).messages[0].content).toBe('restored safely');
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

		expect(activeRuntime(registry).messages).toHaveLength(1);
		expect(activeRuntime(registry).messages[0].messageGroupId).toBe('run-safe');
		expect(activeRuntime(registry).messages[0].agentTree?.textContent).toBe('');
	});

	test('sendMessage pushes the optimistic user message synchronously and posts without syncing the thread', async () => {
		mockPostMessage.mockResolvedValue({ runId: 'run-1' });

		const sendPromise = activeRuntime(registry).sendMessage('first');

		expect(activeRuntime(registry).messages).toHaveLength(1);
		expect(activeRuntime(registry).messages[0]).toMatchObject({
			role: 'user',
			content: 'first',
			isStreaming: false,
		});

		await sendPromise;

		expect(mockEnsureThread).not.toHaveBeenCalled();
		expect(mockPostMessage).toHaveBeenCalledTimes(1);
	});

	test('sendMessage forwards pushRef to postMessage', async () => {
		mockPostMessage.mockResolvedValue({ runId: 'run-1' });

		await activeRuntime(registry).sendMessage('hello', undefined, 'iframe-push-ref-123');

		expect(mockPostMessage).toHaveBeenCalledWith(
			expect.anything(),
			activeThreadId,
			'hello',
			undefined,
			undefined,
			expect.any(String),
			'iframe-push-ref-123',
		);
	});

	test('sendMessage omits pushRef when not provided', async () => {
		mockPostMessage.mockResolvedValue({ runId: 'run-1' });

		await activeRuntime(registry).sendMessage('hello');

		expect(mockPostMessage).toHaveBeenCalledWith(
			expect.anything(),
			activeThreadId,
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
		activeRuntime(registry).closeSSE();
		expect(activeRuntime(registry).sseState).toBe('disconnected');

		// Clear capturedInstance so we can verify a *new* EventSource is created
		capturedInstance = null;

		await activeRuntime(registry).sendMessage('hello');

		// sendMessage should have re-opened an EventSource before posting
		expect(capturedInstance).not.toBeNull();
		expect(mockPostMessage).toHaveBeenCalled();
	});

	test('sendMessage rolls back the optimistic message when postMessage fails', async () => {
		mockPostMessage.mockRejectedValueOnce(new Error('post failed'));

		const sendPromise = activeRuntime(registry).sendMessage('first');

		expect(activeRuntime(registry).isSendingMessage).toBe(true);
		expect(activeRuntime(registry).messages).toHaveLength(1);
		expect(activeRuntime(registry).messages[0]).toMatchObject({
			role: 'user',
			content: 'first',
			isStreaming: false,
		});

		await sendPromise;

		expect(activeRuntime(registry).messages).toHaveLength(0);
		expect(activeRuntime(registry).isSendingMessage).toBe(false);
	});
});

// ---------------------------------------------------------------------------
// Runtime-level feedback integration tests
// (Composable logic is tested in useResponseFeedback.test.ts)
// ---------------------------------------------------------------------------

describe('createThreadRuntime - feedback integration', () => {
	let registry: RuntimeRegistry;

	beforeEach(async () => {
		setupRuntimePinia();
		capturedOnMessage = null;
		registry = createRuntimeRegistry();
		activeThreadId = 'thread-feedback';
		activeRuntime(registry).connectSSE();
		await vi.waitFor(() => {
			expect(capturedOnMessage).not.toBeNull();
		});
	});

	afterEach(() => {
		activeRuntime(registry).closeSSE();
		vi.clearAllMocks();
	});

	test('runtime exposes rateableResponseId, feedbackByResponseId, and submitFeedback', () => {
		expect(activeRuntime(registry).rateableResponseId).toBeNull();
		expect(activeRuntime(registry).feedbackByResponseId).toEqual({});
		expect(typeof activeRuntime(registry).submitFeedback).toBe('function');
	});

	test('feedbackByResponseId is isolated per runtime', async () => {
		const firstRuntime = activeRuntime(registry);
		firstRuntime.submitFeedback('resp-1', { rating: 'up' });
		expect(firstRuntime.feedbackByResponseId['resp-1']).toBeDefined();

		activeThreadId = 'thread-feedback-new';

		expect(Object.keys(activeRuntime(registry).feedbackByResponseId)).toHaveLength(0);
		expect(firstRuntime.feedbackByResponseId['resp-1']).toBeDefined();
	});
});

// ---------------------------------------------------------------------------
// confirmResourceDecision / confirmAction (resource-decision token)
// ---------------------------------------------------------------------------

describe('createThreadRuntime - gateway resource-decision confirmation', () => {
	let registry: RuntimeRegistry;

	beforeEach(async () => {
		setupRuntimePinia();
		capturedOnMessage = null;
		registry = createRuntimeRegistry();
		activeThreadId = 'thread-confirmation';
		activeRuntime(registry).connectSSE();
		await vi.waitFor(() => {
			expect(capturedOnMessage).not.toBeNull();
		});
		mockPostConfirmation.mockResolvedValue(undefined);
	});

	afterEach(() => {
		activeRuntime(registry).closeSSE();
		vi.clearAllMocks();
	});

	it('confirmAction passes resourceDecision payload through to postConfirmation', async () => {
		await activeRuntime(registry).confirmAction('req-1', {
			kind: 'resourceDecision',
			resourceDecision: 'allowOnce',
		});

		expect(mockPostConfirmation).toHaveBeenCalledOnce();
		expect(mockPostConfirmation).toHaveBeenCalledWith(expect.anything(), 'req-1', {
			kind: 'resourceDecision',
			resourceDecision: 'allowOnce',
		});
	});

	it('confirmResourceDecision calls postConfirmation with the decision token', async () => {
		await activeRuntime(registry).confirmResourceDecision('req-2', 'allowForSession');

		expect(mockPostConfirmation).toHaveBeenCalledOnce();
		expect(mockPostConfirmation).toHaveBeenCalledWith(expect.anything(), 'req-2', {
			kind: 'resourceDecision',
			resourceDecision: 'allowForSession',
		});
	});

	it('confirmResourceDecision does not call postConfirmation when confirmAction throws', async () => {
		mockPostConfirmation.mockRejectedValueOnce(new Error('network error'));

		await activeRuntime(registry).confirmResourceDecision('req-3', 'denyOnce');

		// postConfirmation was called once (inside confirmAction) but threw
		expect(mockPostConfirmation).toHaveBeenCalledOnce();
	});
});
