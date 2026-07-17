import { nextTick } from 'vue';
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

const { mockShowError } = vi.hoisted(() => ({ mockShowError: vi.fn() }));
vi.mock('@/app/composables/useToast', () => ({
	useToast: vi.fn().mockReturnValue({
		showError: mockShowError,
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
		void runtime.loadThreadStatus().then(() => {
			runtime.connectSSE();
		});
		return;
	}

	void runtime.loadHistoricalMessages().then(async (hydrationStatus) => {
		if (activeThreadId !== threadId || hydrationStatus !== 'applied') return;
		await runtime.loadThreadStatus();
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

	test('a durable fact replayed with an already-seen id is dropped', () => {
		const threadId = activeThreadId;
		const event = {
			type: 'tool-call',
			runId: 'run-1',
			agentId: 'agent-root',
			payload: { toolCallId: 'tc-1', toolName: 'search', args: {} },
		};

		capturedOnMessage!(makeSSEEvent(validRunStartEvent('run-1', 'agent-root'), '1'));
		capturedOnMessage!(makeSSEEvent(event, '2'));
		// e.g. an auto-reconnect replaying an id that arrived just before the disconnect
		capturedOnMessage!(makeSSEEvent(event, '2'));

		expect(registry.getRuntime(threadId)?.debugEvents).toHaveLength(2);
	});

	test('an ephemeral frame echoing the previous durable id is not swallowed by the dedup', () => {
		const threadId = activeThreadId;
		// Under the durable log, deltas/status ship with no `id:` line, so the
		// browser's lastEventId on those frames echoes the last durable fact.
		const delta = (text: string) => ({
			type: 'text-delta' as const,
			runId: 'run-1',
			agentId: 'agent-root',
			payload: { text },
		});

		capturedOnMessage!(makeSSEEvent(validRunStartEvent('run-1', 'agent-root'), '7'));
		capturedOnMessage!(makeSSEEvent(delta('a'), '7'));
		capturedOnMessage!(makeSSEEvent(delta('b'), '7'));

		// Both deltas render; the cursor still points at the durable fact.
		expect(registry.getRuntime(threadId)?.debugEvents).toHaveLength(3);
		expect(registry.getRuntime(threadId)?.lastEventId).toBe(7);
	});

	test('the reconnect cursor keeps the max seen id when producers interleave out of order', () => {
		const threadId = activeThreadId;

		capturedOnMessage!(makeSSEEvent(validRunStartEvent('run-1', 'agent-root'), '43'));
		// A concurrent producer on another main can relay a lower id afterwards.
		capturedOnMessage!(
			makeSSEEvent(
				{
					type: 'text-delta',
					runId: 'run-1',
					agentId: 'agent-root',
					payload: { text: 'hello' },
				},
				'42',
			),
		);

		// The out-of-order event is still applied, but the cursor never regresses.
		expect(registry.getRuntime(threadId)?.debugEvents).toHaveLength(2);
		expect(registry.getRuntime(threadId)?.lastEventId).toBe(43);
	});

	test('a backend sequence reset (id 1 re-issued) drops stale dedup state and renders the fresh run', () => {
		const threadId = activeThreadId;
		const event = (text: string) => ({
			type: 'text-delta' as const,
			runId: 'run-1',
			agentId: 'agent-root',
			payload: { text },
		});

		// First run before the backend restarts.
		capturedOnMessage!(makeSSEEvent(validRunStartEvent('run-1', 'agent-root'), '1'));
		capturedOnMessage!(makeSSEEvent(event('a'), '2'));
		expect(registry.getRuntime(threadId)?.lastEventId).toBe(2);

		// Backend restarts and re-issues ids from 1. Without reset detection these
		// would be dropped as already-seen; instead the fresh sequence renders and
		// the cursor snaps back down.
		capturedOnMessage!(makeSSEEvent(validRunStartEvent('run-2', 'agent-root'), '1'));
		capturedOnMessage!(makeSSEEvent(event('b'), '2'));

		expect(registry.getRuntime(threadId)?.debugEvents).toHaveLength(4);
		expect(registry.getRuntime(threadId)?.lastEventId).toBe(2);
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

		await expect(activeRuntime(registry).loadHistoricalMessages()).resolves.toBe('skipped');
		// The skip happens before the fetch — fetchThreadMessages must not be
		// called (and must not be mocked here: vi.clearAllMocks() does not drain
		// once-queues, so an unconsumed mockResolvedValueOnce leaks into the next
		// test's hydration).
		expect(mockFetchThreadMessages).not.toHaveBeenCalled();
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

		// The unsafe group id got no routing entry (and thus no run state), so
		// the event must not reduce anywhere: the message is still found via the
		// runId fallback (no phantom), but stays untouched.
		expect(activeRuntime(registry).messages).toHaveLength(1);
		const hydratedMsg = activeRuntime(registry).messages[0];
		expect(hydratedMsg.messageGroupId).toBe('__proto__');
		expect(hydratedMsg.agentTree?.agentId).toBe('agent-root');
		expect(hydratedMsg.agentTree?.textContent).toBe('');
		expect(hydratedMsg.content).toBe('');
	});

	test('hydration adopts message trees so live events mutate the rendered tree', async () => {
		mockFetchThreadMessages.mockResolvedValueOnce({
			threadId: activeThreadId,
			messages: [
				{
					id: 'msg-restored',
					runId: 'run-h',
					messageGroupId: 'group-h',
					role: 'assistant',
					createdAt: new Date().toISOString(),
					content: 'restored',
					reasoning: '',
					isStreaming: false,
					agentTree: {
						agentId: 'agent-root',
						role: 'orchestrator',
						status: 'active',
						textContent: 'restored',
						reasoning: '',
						toolCalls: [],
						children: [],
						timeline: [{ type: 'text', content: 'restored' }],
					},
				},
			],
			nextEventId: 11,
		});

		await activeRuntime(registry).loadHistoricalMessages();

		capturedOnMessage!(
			makeSSEEvent({
				type: 'text-delta',
				runId: 'run-h',
				agentId: 'agent-root',
				payload: { text: ' + live' },
			}),
		);

		// Identity contract: the hydrated run state ADOPTS msg.agentTree's nodes,
		// so the live event must mutate the very tree the message renders. A
		// defensive copy anywhere on this path would freeze the rendered tree at
		// the snapshot while events mutate an orphaned state.
		expect(activeRuntime(registry).messages).toHaveLength(1);
		const msg = activeRuntime(registry).messages[0];
		expect(msg.agentTree?.textContent).toBe('restored + live');
		expect(msg.agentTree?.timeline).toEqual([{ type: 'text', content: 'restored + live' }]);
		expect(msg.content).toBe('restored + live');
	});

	test('run-sync adopts the snapshot tree so subsequent live events mutate the rendered tree', () => {
		capturedOnMessage!(
			makeSSEEvent({
				type: 'run-start',
				runId: 'run-s',
				agentId: 'agent-root',
				payload: { messageId: 'msg-1', messageGroupId: 'group-s' },
			}),
		);

		capturedInstance!.dispatchNamedEvent('run-sync', {
			runId: 'run-s',
			messageGroupId: 'group-s',
			runIds: ['run-s'],
			agentTree: {
				agentId: 'agent-root',
				role: 'orchestrator',
				status: 'active',
				textContent: 'synced',
				reasoning: '',
				toolCalls: [],
				children: [],
				timeline: [{ type: 'text', content: 'synced' }],
			},
			status: 'active',
			backgroundTasks: [],
		});

		capturedOnMessage!(
			makeSSEEvent({
				type: 'text-delta',
				runId: 'run-s',
				agentId: 'agent-root',
				payload: { text: ' + live' },
			}),
		);

		// Identity contract: run-sync rebuilds the run state by ADOPTING the
		// snapshot tree it assigns to msg.agentTree, so post-sync live events
		// must mutate the rendered tree (not an orphaned copy).
		expect(activeRuntime(registry).messages).toHaveLength(1);
		const msg = activeRuntime(registry).messages[0];
		expect(msg.agentTree?.textContent).toBe('synced + live');
		expect(msg.agentTree?.timeline).toEqual([{ type: 'text', content: 'synced + live' }]);
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

	test('sendMessage tracks whether this is the first user message in the thread', async () => {
		mockPostMessage.mockResolvedValue({ runId: 'run-1' });

		await activeRuntime(registry).sendMessage('first');
		await activeRuntime(registry).sendMessage('second');

		expect(mockTelemetryTrack).toHaveBeenNthCalledWith(1, 'User sent builder message', {
			thread_id: activeThreadId,
			instance_id: 'instance-1',
			is_first_message: true,
		});
		expect(mockTelemetryTrack).toHaveBeenNthCalledWith(2, 'User sent builder message', {
			thread_id: activeThreadId,
			instance_id: 'instance-1',
			is_first_message: false,
		});
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

	test('sendMessage forwards handoff context to postMessage', async () => {
		mockPostMessage.mockResolvedValue({ runId: 'run-1' });
		const context = {
			source: 'credential-modal' as const,
			credential: {
				credentialType: 'gmailOAuth2Api',
				displayName: 'Gmail OAuth2 API',
				documentationUrl:
					'https://docs.n8n.io/integrations/builtin/credentials/google/oauth-single-service/',
			},
		};

		await activeRuntime(registry).sendMessage('hello', undefined, undefined, context);

		expect(mockPostMessage).toHaveBeenCalledWith(
			expect.anything(),
			activeThreadId,
			'hello',
			undefined,
			context,
			expect.any(String),
			undefined,
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

	test('sendMessage sets activeRunId from postMessage response before run-start', async () => {
		mockPostMessage.mockResolvedValue({ runId: 'run-from-post' });

		const sendPromise = activeRuntime(registry).sendMessage('hello');
		await vi.waitFor(() => {
			expect(activeRuntime(registry).activeRunId).toBe('run-from-post');
		});

		await sendPromise;
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

describe('createThreadRuntime - loadThreadStatus and HITL reconnect', () => {
	let registry: RuntimeRegistry;

	beforeEach(() => {
		setupRuntimePinia();
		registry = createRuntimeRegistry();
		activeThreadId = 'thread-hitl';
	});

	afterEach(() => {
		vi.clearAllMocks();
		mockFetchThreadStatus.mockResolvedValue({
			hasActiveRun: false,
			isSuspended: false,
			backgroundTasks: [],
		});
	});

	test('loadThreadStatus sets activeRunId and isStreaming for suspended run using runIds', async () => {
		const runtime = activeRuntime(registry);
		runtime.messages = [
			{
				id: 'msg-1',
				role: 'assistant',
				runId: 'run-a',
				runIds: ['run-a', 'run-b'],
				content: '',
				reasoning: '',
				isStreaming: false,
				createdAt: '2026-01-01T00:00:00.000Z',
			},
		];
		mockFetchThreadStatus.mockResolvedValue({
			hasActiveRun: false,
			isSuspended: true,
			backgroundTasks: [],
		});

		await runtime.loadThreadStatus();

		expect(runtime.activeRunId).toBe('run-b');
		expect(runtime.messages[0].isStreaming).toBe(true);
	});

	test('loadThreadStatus prefers runId from status API over message inference', async () => {
		const runtime = activeRuntime(registry);
		runtime.messages = [
			{
				id: 'msg-1',
				role: 'assistant',
				runId: 'run-a',
				runIds: ['run-a', 'run-b'],
				content: '',
				reasoning: '',
				isStreaming: false,
				createdAt: '2026-01-01T00:00:00.000Z',
			},
		];
		mockFetchThreadStatus.mockResolvedValue({
			hasActiveRun: false,
			isSuspended: true,
			runId: 'run-authoritative',
			backgroundTasks: [],
		});

		await runtime.loadThreadStatus();

		expect(runtime.activeRunId).toBe('run-authoritative');
	});

	test('confirmAction re-arms activeRunId and reconnects SSE after approval', async () => {
		const runtime = activeRuntime(registry);
		runtime.closeSSE();
		runtime.messages = [
			{
				id: 'msg-1',
				role: 'assistant',
				runId: 'run-live',
				runIds: ['run-live'],
				content: '',
				reasoning: '',
				isStreaming: false,
				createdAt: '2026-01-01T00:00:00.000Z',
				agentTree: {
					agentId: 'agent-root',
					role: 'orchestrator',
					status: 'active',
					textContent: '',
					reasoning: '',
					toolCalls: [
						{
							toolCallId: 'tc-1',
							toolName: 'workflows',
							args: { action: 'run' },
							isLoading: true,
							confirmation: { requestId: 'req-1', severity: 'info', message: 'Run?' },
						},
					],
					children: [],
					timeline: [],
				},
			},
		];
		mockPostConfirmation.mockResolvedValue({ ok: true, runId: 'run-from-api' });
		mockFetchThreadStatus.mockResolvedValue({
			hasActiveRun: true,
			isSuspended: false,
			runId: 'run-from-api',
			backgroundTasks: [],
		});

		const ok = await runtime.confirmAction('req-1', { kind: 'approval', approved: true });

		expect(ok).toBe(true);
		expect(runtime.activeRunId).toBe('run-from-api');
		expect(runtime.messages[0].isStreaming).toBe(true);
		expect(runtime.sseState).not.toBe('disconnected');
		expect(mockFetchThreadStatus).toHaveBeenCalled();
	});

	test('confirmAction does not re-arm activeRunId on deny', async () => {
		const runtime = activeRuntime(registry);
		runtime.messages = [
			{
				id: 'msg-1',
				role: 'assistant',
				runId: 'run-live',
				content: '',
				reasoning: '',
				isStreaming: false,
				createdAt: '2026-01-01T00:00:00.000Z',
				agentTree: {
					agentId: 'agent-root',
					role: 'orchestrator',
					status: 'active',
					textContent: '',
					reasoning: '',
					toolCalls: [
						{
							toolCallId: 'tc-1',
							toolName: 'workflows',
							args: { action: 'run' },
							isLoading: true,
							confirmation: { requestId: 'req-deny', severity: 'info', message: 'Run?' },
						},
					],
					children: [],
					timeline: [],
				},
			},
		];
		mockPostConfirmation.mockResolvedValue({ ok: true });

		await runtime.confirmAction('req-deny', { kind: 'approval', approved: false });

		expect(runtime.activeRunId).toBeNull();
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
		mockPostConfirmation.mockResolvedValue({ ok: true });
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

	it('confirmAction surfaces the server UserError message on a 400 response', async () => {
		const { ResponseError } = await import('@n8n/rest-api-client');
		const serverError = new ResponseError(
			'This confirmation was lost when the assistant restarted. Send a new message to continue.',
		);
		(serverError as { httpStatusCode?: number }).httpStatusCode = 400;
		mockPostConfirmation.mockRejectedValueOnce(serverError);
		mockShowError.mockClear();

		const ok = await activeRuntime(registry).confirmAction('req-lost', {
			kind: 'approval',
			approved: true,
		});

		expect(ok).toBe(false);
		expect(mockShowError).toHaveBeenCalledTimes(1);
		const [errorArg, titleArg] = mockShowError.mock.calls[0];
		expect((errorArg as Error).message).toContain('lost when the assistant restarted');
		expect(titleArg).toBe('Confirmation failed');
	});

	it('confirmAction falls back to a generic message on non-400 errors', async () => {
		mockPostConfirmation.mockRejectedValueOnce(new Error('network error'));
		mockShowError.mockClear();

		await activeRuntime(registry).confirmAction('req-network', {
			kind: 'approval',
			approved: true,
		});

		expect(mockShowError).toHaveBeenCalledTimes(1);
		const [errorArg] = mockShowError.mock.calls[0];
		expect((errorArg as Error).message).toBe('Failed to send confirmation. Try again.');
	});
});

describe('createThreadRuntime - session always-allow', () => {
	let registry: RuntimeRegistry;

	beforeEach(() => {
		setupRuntimePinia();
		registry = createRuntimeRegistry();
		activeThreadId = 'thread-always-allow';
		mockPostConfirmation.mockResolvedValue({ ok: true });
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	function pushPendingApproval(
		runtime: ThreadRuntime,
		opts: {
			messageId: string;
			requestId: string;
			toolName: string;
			args?: Record<string, unknown>;
			severity?: 'info' | 'warning' | 'destructive';
			channelConfig?: { integrationType: string; agentId: string };
		},
	): void {
		runtime.messages.push({
			id: opts.messageId,
			role: 'assistant',
			createdAt: new Date().toISOString(),
			content: '',
			reasoning: '',
			isStreaming: false,
			agentTree: {
				agentId: 'agent-1',
				role: 'orchestrator',
				status: 'active',
				textContent: '',
				reasoning: '',
				timeline: [],
				children: [],
				toolCalls: [
					{
						toolCallId: `tc-${opts.requestId}`,
						toolName: opts.toolName,
						args: opts.args ?? {},
						isLoading: true,
						confirmationStatus: 'pending',
						confirmation: {
							requestId: opts.requestId,
							severity: opts.severity ?? 'info',
							message: 'Approve?',
							...(opts.channelConfig ? { channelConfig: opts.channelConfig } : {}),
						},
					},
				],
			},
		});
	}

	it('auto-approves matching generic-eligible confirmations after key is added', async () => {
		const runtime = registry.getOrCreateRuntime(activeThreadId);
		runtime.addAlwaysAllowKey('workflows', { action: 'run' });

		pushPendingApproval(runtime, {
			messageId: 'msg-auto',
			requestId: 'req-auto',
			toolName: 'workflows',
			args: { action: 'run' },
		});

		await vi.waitFor(() => {
			expect(runtime.resolvedConfirmationIds.get('req-auto')).toBe('approved');
		});
		expect(mockPostConfirmation).toHaveBeenCalledWith(expect.anything(), 'req-auto', {
			kind: 'approval',
			approved: true,
		});
	});

	it('does not auto-approve channel-setup confirmations even when the key matches', async () => {
		const runtime = registry.getOrCreateRuntime(activeThreadId);
		runtime.addAlwaysAllowKey('configure_channel', {});

		pushPendingApproval(runtime, {
			messageId: 'msg-channel',
			requestId: 'req-channel',
			toolName: 'configure_channel',
			args: {},
			channelConfig: { integrationType: 'slack', agentId: 'agent-1' },
		});

		await new Promise((resolve) => setTimeout(resolve, 10));
		expect(runtime.resolvedConfirmationIds.has('req-channel')).toBe(false);
		expect(mockPostConfirmation).not.toHaveBeenCalled();
	});

	it('does not auto-approve destructive confirmations even when the key matches', async () => {
		const runtime = registry.getOrCreateRuntime(activeThreadId);
		runtime.addAlwaysAllowKey('workflows', { action: 'delete' });

		pushPendingApproval(runtime, {
			messageId: 'msg-destructive',
			requestId: 'req-destructive',
			toolName: 'workflows',
			args: { action: 'delete' },
			severity: 'destructive',
		});

		await new Promise((resolve) => setTimeout(resolve, 10));
		expect(runtime.resolvedConfirmationIds.has('req-destructive')).toBe(false);
		expect(mockPostConfirmation).not.toHaveBeenCalled();
	});

	it('distinguishes submit-workflow create vs update grants by workflowId presence', async () => {
		const runtime = registry.getOrCreateRuntime(activeThreadId);
		runtime.addAlwaysAllowKey('submit-workflow', {});

		pushPendingApproval(runtime, {
			messageId: 'msg-create',
			requestId: 'req-create',
			toolName: 'submit-workflow',
			args: {},
		});
		await vi.waitFor(() => {
			expect(runtime.resolvedConfirmationIds.get('req-create')).toBe('approved');
		});

		pushPendingApproval(runtime, {
			messageId: 'msg-update',
			requestId: 'req-update',
			toolName: 'submit-workflow',
			args: { workflowId: 'wf-1' },
		});
		await new Promise((resolve) => setTimeout(resolve, 10));
		expect(runtime.resolvedConfirmationIds.has('req-update')).toBe(false);
	});

	it('scopes executions run grants per workflow', async () => {
		const runtime = registry.getOrCreateRuntime(activeThreadId);
		runtime.addAlwaysAllowKey('executions', { action: 'run', workflowId: 'wf-1' });

		pushPendingApproval(runtime, {
			messageId: 'msg-wf-1',
			requestId: 'req-wf-1',
			toolName: 'executions',
			args: { action: 'run', workflowId: 'wf-1' },
		});
		await vi.waitFor(() => {
			expect(runtime.resolvedConfirmationIds.get('req-wf-1')).toBe('approved');
		});

		pushPendingApproval(runtime, {
			messageId: 'msg-wf-2',
			requestId: 'req-wf-2',
			toolName: 'executions',
			args: { action: 'run', workflowId: 'wf-2' },
		});
		await new Promise((resolve) => setTimeout(resolve, 10));
		expect(runtime.resolvedConfirmationIds.has('req-wf-2')).toBe(false);
	});

	it('clears keys on resetState', () => {
		const runtime = registry.getOrCreateRuntime(activeThreadId);
		runtime.addAlwaysAllowKey('workflows', { action: 'run' });
		expect(runtime.sessionAlwaysAllowKeys.size).toBe(1);

		runtime.resetState();
		expect(runtime.sessionAlwaysAllowKeys.size).toBe(0);
	});

	it('keeps the confirmation pending when auto-approve POST fails', async () => {
		mockPostConfirmation.mockRejectedValueOnce(new Error('network down'));
		const runtime = registry.getOrCreateRuntime(activeThreadId);
		runtime.addAlwaysAllowKey('workflows', { action: 'run' });

		pushPendingApproval(runtime, {
			messageId: 'msg-fail',
			requestId: 'req-fail',
			toolName: 'workflows',
			args: { action: 'run' },
		});

		await vi.waitFor(() => {
			expect(mockPostConfirmation).toHaveBeenCalledWith(expect.anything(), 'req-fail', {
				kind: 'approval',
				approved: true,
			});
		});
		expect(runtime.resolvedConfirmationIds.has('req-fail')).toBe(false);
	});
});

describe('createThreadRuntime - "User viewed new builder workflow" telemetry', () => {
	let registry: RuntimeRegistry;

	/** A run-sync snapshot whose agent tree contains one successful build-workflow tool call. */
	function runSyncWithBuild(opts: {
		runId: string;
		messageGroupId: string;
		workflowId: string;
		toolCallId: string;
	}) {
		return {
			runId: opts.runId,
			messageGroupId: opts.messageGroupId,
			runIds: [opts.runId],
			agentTree: {
				agentId: 'agent-root',
				role: 'orchestrator',
				status: 'completed',
				textContent: '',
				reasoning: '',
				toolCalls: [
					{
						toolCallId: opts.toolCallId,
						toolName: 'build-workflow',
						args: {},
						isLoading: false,
						result: { success: true, workflowId: opts.workflowId },
					},
				],
				children: [],
				timeline: [],
			},
			status: 'completed',
			backgroundTasks: [],
		};
	}

	beforeEach(async () => {
		setupRuntimePinia();
		capturedOnMessage = null;
		registry = createRuntimeRegistry();
		activeThreadId = 'thread-active';
		activeRuntime(registry).connectSSE();
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
	});

	test('tracks "User viewed new builder workflow" when the builder produces a workflow', () => {
		capturedInstance!.dispatchNamedEvent(
			'run-sync',
			runSyncWithBuild({
				runId: 'run-1',
				messageGroupId: 'mg-1',
				workflowId: 'wf-123',
				toolCallId: 'tc-1',
			}),
		);

		expect(mockTelemetryTrack).toHaveBeenCalledWith('User viewed new builder workflow', {
			thread_id: 'thread-active',
			instance_id: 'instance-1',
			workflow_id: 'wf-123',
		});
	});

	test('fires exactly once per workflow even when the same workflow is rebuilt', () => {
		// First build, then a rebuild of the same workflow with a fresh toolCallId.
		// The rebuild DOES re-trigger the watcher (toolCallId changes), so a count of
		// exactly 1 proves the dedup ran — not that nothing fired at all.
		capturedInstance!.dispatchNamedEvent(
			'run-sync',
			runSyncWithBuild({
				runId: 'run-1',
				messageGroupId: 'mg-1',
				workflowId: 'wf-123',
				toolCallId: 'tc-1',
			}),
		);
		capturedInstance!.dispatchNamedEvent(
			'run-sync',
			runSyncWithBuild({
				runId: 'run-1',
				messageGroupId: 'mg-1',
				workflowId: 'wf-123',
				toolCallId: 'tc-2',
			}),
		);

		const builderCreatedCalls = mockTelemetryTrack.mock.calls.filter(
			([event]) => event === 'User viewed new builder workflow',
		);
		expect(builderCreatedCalls).toHaveLength(1);
		expect(builderCreatedCalls[0][1]).toMatchObject({ workflow_id: 'wf-123' });
	});

	test('tracks again when a different workflow is built later', () => {
		capturedInstance!.dispatchNamedEvent(
			'run-sync',
			runSyncWithBuild({
				runId: 'run-1',
				messageGroupId: 'mg-1',
				workflowId: 'wf-1',
				toolCallId: 'tc-1',
			}),
		);
		capturedInstance!.dispatchNamedEvent(
			'run-sync',
			runSyncWithBuild({
				runId: 'run-2',
				messageGroupId: 'mg-2',
				workflowId: 'wf-2',
				toolCallId: 'tc-2',
			}),
		);

		expect(mockTelemetryTrack).toHaveBeenCalledWith(
			'User viewed new builder workflow',
			expect.objectContaining({ workflow_id: 'wf-1' }),
		);
		expect(mockTelemetryTrack).toHaveBeenCalledWith(
			'User viewed new builder workflow',
			expect.objectContaining({ workflow_id: 'wf-2' }),
		);
	});

	test('does not track for a workflow that only appears in hydrated history', async () => {
		mockFetchThreadMessages.mockResolvedValueOnce({
			threadId: activeThreadId,
			messages: [
				{
					id: 'msg-hist',
					runId: 'run-hist',
					messageGroupId: 'mg-hist',
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
						toolCalls: [
							{
								toolCallId: 'tc-hist',
								toolName: 'build-workflow',
								args: {},
								isLoading: false,
								result: { success: true, workflowId: 'wf-hist' },
							},
						],
						children: [],
						timeline: [],
					},
				},
			],
			nextEventId: 11,
		});

		await activeRuntime(registry).loadHistoricalMessages();

		// The historical build really was hydrated (so "not tracked" is meaningful,
		// not just an empty no-op hydration).
		expect(activeRuntime(registry).messages).toHaveLength(1);
		expect(mockTelemetryTrack).not.toHaveBeenCalledWith(
			'User viewed new builder workflow',
			expect.anything(),
		);
	});
});

describe('createThreadRuntime - "Builder generation stalled" telemetry', () => {
	let registry: RuntimeRegistry;

	const stalledCalls = () =>
		mockTelemetryTrack.mock.calls.filter(([event]) => event === 'Builder generation stalled');

	beforeEach(async () => {
		vi.useFakeTimers();
		setupRuntimePinia();
		capturedOnMessage = null;
		registry = createRuntimeRegistry();
		activeThreadId = 'thread-active';
		activeRuntime(registry).connectSSE();
		// Flush the MockEventSource constructor's setTimeout(0).
		await vi.advanceTimersByTimeAsync(0);
		expect(capturedOnMessage).not.toBeNull();
	});

	afterEach(() => {
		activeRuntime(registry).closeSSE();
		vi.useRealTimers();
		vi.clearAllMocks();
	});

	test('fires once with thread_id after a minute of stream silence during an active run', async () => {
		capturedOnMessage!(makeSSEEvent(validRunStartEvent('run-1', 'agent-root')));

		await vi.advanceTimersByTimeAsync(59_000);
		expect(stalledCalls()).toHaveLength(0);

		await vi.advanceTimersByTimeAsync(1_000);
		expect(stalledCalls()).toHaveLength(1);
		expect(stalledCalls()[0][1]).toEqual({ thread_id: 'thread-active' });

		// Continued silence does not re-fire — one event per silent stretch.
		await vi.advanceTimersByTimeAsync(180_000);
		expect(stalledCalls()).toHaveLength(1);
	});

	test('every received stream event re-arms the countdown', async () => {
		capturedOnMessage!(makeSSEEvent(validRunStartEvent('run-1', 'agent-root')));

		await vi.advanceTimersByTimeAsync(50_000);
		capturedOnMessage!(
			makeSSEEvent({
				type: 'text-delta',
				runId: 'run-1',
				agentId: 'agent-root',
				payload: { text: 'hello' },
			}),
		);

		// 100s since run start, but only 50s since the last event — not stalled.
		await vi.advanceTimersByTimeAsync(50_000);
		expect(stalledCalls()).toHaveLength(0);

		await vi.advanceTimersByTimeAsync(10_000);
		expect(stalledCalls()).toHaveLength(1);
	});

	test('does not fire when the run finishes within the window', async () => {
		capturedOnMessage!(makeSSEEvent(validRunStartEvent('run-1', 'agent-root')));
		await vi.advanceTimersByTimeAsync(30_000);
		capturedOnMessage!(
			makeSSEEvent({
				type: 'run-finish',
				runId: 'run-1',
				agentId: 'agent-root',
				payload: { status: 'completed' },
			}),
		);

		await vi.advanceTimersByTimeAsync(180_000);
		expect(stalledCalls()).toHaveLength(0);
	});

	test('does not fire while the run waits on a user confirmation', async () => {
		capturedOnMessage!(makeSSEEvent(validRunStartEvent('run-1', 'agent-root')));
		capturedOnMessage!(
			makeSSEEvent({
				type: 'tool-call',
				runId: 'run-1',
				agentId: 'agent-root',
				payload: { toolCallId: 'tc-1', toolName: 'dangerous-tool', args: {} },
			}),
		);
		capturedOnMessage!(
			makeSSEEvent({
				type: 'confirmation-request',
				runId: 'run-1',
				agentId: 'agent-root',
				payload: {
					requestId: 'req-1',
					toolCallId: 'tc-1',
					toolName: 'dangerous-tool',
					args: {},
					severity: 'warning',
					message: 'Are you sure?',
				},
			}),
		);

		await vi.advanceTimersByTimeAsync(180_000);
		expect(stalledCalls()).toHaveLength(0);
	});

	test('arms when a message send starts a run while the stream stays silent', async () => {
		mockPostMessage.mockResolvedValueOnce({ runId: 'run-silent' });

		await activeRuntime(registry).sendMessage('build me a workflow');
		// Let the isGenerationPending watcher observe the new run id.
		await nextTick();

		await vi.advanceTimersByTimeAsync(60_000);
		expect(stalledCalls()).toHaveLength(1);
		expect(stalledCalls()[0][1]).toEqual({ thread_id: 'thread-active' });
	});
});
