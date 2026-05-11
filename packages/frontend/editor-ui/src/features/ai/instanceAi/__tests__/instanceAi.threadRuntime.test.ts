import { setActivePinia } from 'pinia';
import { createTestingPinia } from '@pinia/testing';
import { describe, test, it, expect, vi, beforeEach, afterEach, beforeAll, afterAll } from 'vitest';
import { reactive } from 'vue';
import { useRootStore } from '@n8n/stores/useRootStore';
import { mockedStore } from '@/__tests__/utils';
import { useWorkflowsListStore } from '@/app/stores/workflowsList.store';
import { fetchThreadMessages, fetchThreadStatus } from '../instanceAi.memory.api';
import { ensureThread, postMessage, postConfirmation } from '../instanceAi.api';
import { createThreadRuntime } from '../instanceAi.threadRuntime';

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
	postFeedback: vi.fn(),
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

function createRuntime(threadId = 'thread-active') {
	return reactive(
		createThreadRuntime(threadId, {
			getResearchMode: () => false,
			onTitleUpdated: vi.fn(),
			onRunFinish: vi.fn(),
		}),
	);
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
	let runtime: ReturnType<typeof createRuntime>;

	beforeEach(async () => {
		setupRuntimePinia();
		capturedOnMessage = null;
		runtime = createRuntime();
		runtime.connectSSE();
		// Wait for the setTimeout in MockEventSource constructor
		await vi.waitFor(() => {
			expect(capturedOnMessage).not.toBeNull();
		});
	});

	afterEach(() => {
		runtime.closeSSE();
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

		expect(runtime.messages).toHaveLength(0);
		expect(runtime.activeRunId).toBeNull();
	});

	test('valid SSE event dispatched updates messages state correctly', () => {
		capturedOnMessage!(makeSSEEvent(validRunStartEvent('run-1', 'agent-root')));

		expect(runtime.messages).toHaveLength(1);
		expect(runtime.messages[0].runId).toBe('run-1');
		expect(runtime.activeRunId).toBe('run-1');
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

		expect(runtime.activeRunId).toBe('run-active');
		expect(runtime.messages).toHaveLength(2);

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
		expect(runtime.activeRunId).toBe('run-active');

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
		expect(runtime.activeRunId).toBe('run-active');
		// The old message should be updated with the background group's tree
		const oldMsg = runtime.messages.find((m) => m.messageGroupId === 'mg-old');
		// Background-only: isStreaming must be false so hasActiveBackgroundTasks
		// computed in InstanceAiMessage.vue correctly shows the background indicator
		expect(oldMsg?.isStreaming).toBe(false);
		expect(oldMsg?.agentTree?.children).toHaveLength(1);
	});

	test('lastEventIdByThread is updated from sseEvent.lastEventId on every message', () => {
		const threadId = runtime.currentThreadId;

		capturedOnMessage!(makeSSEEvent(validRunStartEvent('run-1', 'agent-root'), '42'));

		expect(runtime.lastEventIdByThread[threadId]).toBe(42);

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

		expect(runtime.lastEventIdByThread[threadId]).toBe(43);
	});

	test('switchTo clears thread-scoped runtime state before historical messages resolve', async () => {
		const seededThreadId = runtime.currentThreadId;

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
		runtime.submitFeedback('resp-1', { rating: 'up' });
		runtime.resolveConfirmation('request-1', 'approved');

		expect(runtime.currentThreadId).toBe(seededThreadId);
		expect(runtime.messages).toHaveLength(1);
		expect(runtime.activeRunId).toBe('run-seeded');
		expect(runtime.debugEvents).toHaveLength(1);
		expect(runtime.feedbackByResponseId).toEqual({ 'resp-1': { rating: 'up' } });
		expect(runtime.resolvedConfirmationIds.size).toBe(1);

		runtime.switchTo('thread-2');
		const hydration = runtime.loadHistoricalMessages('thread-2');

		expect(runtime.currentThreadId).toBe('thread-2');
		expect(runtime.isHydratingThread).toBe(true);
		expect(runtime.messages).toEqual([]);
		expect(runtime.activeRunId).toBeNull();
		expect(runtime.debugEvents).toEqual([]);
		expect(runtime.feedbackByResponseId).toEqual({});
		expect(runtime.resolvedConfirmationIds.size).toBe(0);

		resolveFetchThreadMessages?.({
			threadId: 'thread-2',
			messages: [],
			nextEventId: 0,
		});

		await hydration;
		await vi.waitFor(() => {
			expect(runtime.isHydratingThread).toBe(false);
		});
	});

	test('switchTo ignores stale historical hydration completion from a previously requested thread', async () => {
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

		runtime.switchTo('thread-a');
		const threadAHydration = runtime.loadHistoricalMessages('thread-a');
		runtime.switchTo('thread-b');
		const threadBHydration = runtime.loadHistoricalMessages('thread-b');

		expect(runtime.currentThreadId).toBe('thread-b');
		expect(runtime.isHydratingThread).toBe(true);

		resolveThreadA?.({
			threadId: 'thread-a',
			messages: [],
			nextEventId: 0,
		});
		await expect(threadAHydration).resolves.toBe('stale');

		expect(runtime.currentThreadId).toBe('thread-b');
		expect(runtime.lastEventIdByThread['thread-a']).toBeUndefined();

		resolveThreadB?.({
			threadId: 'thread-b',
			messages: [],
			nextEventId: 21,
		});

		await expect(threadBHydration).resolves.toBe('applied');
		expect(runtime.lastEventIdByThread['thread-b']).toBe(20);
	});

	test('switchTo ignores stale A hydration in an A -> B -> A sequence', async () => {
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

		runtime.switchTo('thread-a');
		const firstAHydration = runtime.loadHistoricalMessages('thread-a');
		runtime.switchTo('thread-b');
		const threadBHydration = runtime.loadHistoricalMessages('thread-b');
		runtime.switchTo('thread-a');
		const secondAHydration = runtime.loadHistoricalMessages('thread-a');

		expect(runtime.currentThreadId).toBe('thread-a');
		expect(runtime.isHydratingThread).toBe(true);
		expect(runtime.messages).toEqual([]);

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
		await expect(firstAHydration).resolves.toBe('stale');

		expect(runtime.currentThreadId).toBe('thread-a');
		expect(runtime.isHydratingThread).toBe(true);
		expect(runtime.messages).toEqual([]);
		expect(runtime.lastEventIdByThread['thread-a']).toBeUndefined();

		resolveB?.({
			threadId: 'thread-b',
			messages: [],
			nextEventId: 0,
		});
		await expect(threadBHydration).resolves.toBe('stale');

		expect(runtime.currentThreadId).toBe('thread-a');
		expect(runtime.isHydratingThread).toBe(true);
		expect(runtime.messages).toEqual([]);
		expect(runtime.lastEventIdByThread['thread-a']).toBeUndefined();

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

		await expect(secondAHydration).resolves.toBe('applied');
		expect(runtime.isHydratingThread).toBe(false);
		expect(runtime.messages).toHaveLength(1);
		expect(runtime.messages[0].id).toBe('msg-fresh-a');
		expect(runtime.lastEventIdByThread['thread-a']).toBe(30);
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

		runtime.currentThreadId = 'thread-a';
		const staleHydration = runtime.loadHistoricalMessages('thread-a');

		runtime.currentThreadId = 'thread-b';
		const currentHydration = runtime.loadHistoricalMessages('thread-b');

		resolveThreadA?.({
			threadId: 'thread-a',
			messages: [],
			nextEventId: 11,
		});
		await expect(staleHydration).resolves.toBe('stale');
		expect(runtime.lastEventIdByThread['thread-a']).toBeUndefined();

		resolveThreadB?.({
			threadId: 'thread-b',
			messages: [],
			nextEventId: 21,
		});
		await expect(currentHydration).resolves.toBe('applied');
		expect(runtime.lastEventIdByThread['thread-b']).toBe(20);
	});

	test('loadHistoricalMessages returns skipped when current thread already has messages', async () => {
		runtime.messages = [
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
			threadId: runtime.currentThreadId,
			messages: [],
			nextEventId: 10,
		});

		await expect(runtime.loadHistoricalMessages(runtime.currentThreadId)).resolves.toBe('skipped');
		expect(runtime.messages).toHaveLength(1);
		expect(runtime.lastEventIdByThread[runtime.currentThreadId]).toBeUndefined();
	});

	test('loadHistoricalMessages returns applied on fetch failure when hydration request is current', async () => {
		mockFetchThreadMessages.mockRejectedValueOnce(new Error('fetch failed'));

		await expect(runtime.loadHistoricalMessages(runtime.currentThreadId)).resolves.toBe('applied');
		expect(runtime.isHydratingThread).toBe(false);
	});

	test('loadHistoricalMessages skips unsafe routing identifiers when rebuilding state', async () => {
		mockFetchThreadMessages.mockResolvedValueOnce({
			threadId: runtime.currentThreadId,
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

		await runtime.loadHistoricalMessages(runtime.currentThreadId);

		capturedOnMessage!(
			makeSSEEvent({
				type: 'text-delta',
				runId: 'safe-run',
				agentId: 'fresh-root',
				payload: { text: 'restored safely' },
			}),
		);

		expect(runtime.messages).toHaveLength(1);
		expect(runtime.messages[0].messageGroupId).toBe('__proto__');
		expect(runtime.messages[0].agentTree?.agentId).toBe('agent-root');
		expect(runtime.messages[0].content).toBe('');
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

		expect(runtime.messages).toHaveLength(1);
		expect(runtime.messages[0].messageGroupId).toBe('run-safe');
		expect(runtime.messages[0].agentTree?.textContent).toBe('');
	});

	test('sendMessage pushes the optimistic user message synchronously and posts without syncing the thread', async () => {
		mockPostMessage.mockResolvedValue({ runId: 'run-1' });

		const sendPromise = runtime.sendMessage('first');

		expect(runtime.messages).toHaveLength(1);
		expect(runtime.messages[0]).toMatchObject({
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

		await runtime.sendMessage('hello', undefined, 'iframe-push-ref-123');

		expect(mockPostMessage).toHaveBeenCalledWith(
			expect.anything(),
			runtime.currentThreadId,
			'hello',
			undefined,
			undefined,
			expect.any(String),
			'iframe-push-ref-123',
		);
	});

	test('sendMessage omits pushRef when not provided', async () => {
		mockPostMessage.mockResolvedValue({ runId: 'run-1' });

		await runtime.sendMessage('hello');

		expect(mockPostMessage).toHaveBeenCalledWith(
			expect.anything(),
			runtime.currentThreadId,
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
		runtime.closeSSE();
		expect(runtime.sseState).toBe('disconnected');

		// Clear capturedInstance so we can verify a *new* EventSource is created
		capturedInstance = null;

		await runtime.sendMessage('hello');

		// sendMessage should have re-opened an EventSource before posting
		expect(capturedInstance).not.toBeNull();
		expect(mockPostMessage).toHaveBeenCalled();
	});

	test('sendMessage rolls back the optimistic message when postMessage fails', async () => {
		mockPostMessage.mockRejectedValueOnce(new Error('post failed'));

		const sendPromise = runtime.sendMessage('first');

		expect(runtime.isSendingMessage).toBe(true);
		expect(runtime.messages).toHaveLength(1);
		expect(runtime.messages[0]).toMatchObject({
			role: 'user',
			content: 'first',
			isStreaming: false,
		});

		await sendPromise;

		expect(runtime.messages).toHaveLength(0);
		expect(runtime.isSendingMessage).toBe(false);
	});
});

// ---------------------------------------------------------------------------
// Runtime-level feedback integration tests
// (Composable logic is tested in useResponseFeedback.test.ts)
// ---------------------------------------------------------------------------

describe('createThreadRuntime - feedback integration', () => {
	let runtime: ReturnType<typeof createRuntime>;

	beforeEach(async () => {
		setupRuntimePinia();
		capturedOnMessage = null;
		runtime = createRuntime();
		runtime.connectSSE();
		await vi.waitFor(() => {
			expect(capturedOnMessage).not.toBeNull();
		});
	});

	afterEach(() => {
		runtime.closeSSE();
		vi.clearAllMocks();
	});

	test('runtime exposes rateableResponseId, feedbackByResponseId, and submitFeedback', () => {
		expect(runtime.rateableResponseId).toBeNull();
		expect(runtime.feedbackByResponseId).toEqual({});
		expect(typeof runtime.submitFeedback).toBe('function');
	});

	test('feedbackByResponseId is cleared when switching thread', () => {
		runtime.submitFeedback('resp-1', { rating: 'up' });
		expect(runtime.feedbackByResponseId['resp-1']).toBeDefined();

		runtime.switchTo('thread-feedback-new');

		expect(Object.keys(runtime.feedbackByResponseId)).toHaveLength(0);
	});
});

// ---------------------------------------------------------------------------
// confirmResourceDecision / confirmAction (resource-decision token)
// ---------------------------------------------------------------------------

describe('createThreadRuntime - gateway resource-decision confirmation', () => {
	let runtime: ReturnType<typeof createRuntime>;

	beforeEach(async () => {
		setupRuntimePinia();
		capturedOnMessage = null;
		runtime = createRuntime();
		runtime.connectSSE();
		await vi.waitFor(() => {
			expect(capturedOnMessage).not.toBeNull();
		});
		mockPostConfirmation.mockResolvedValue(undefined);
	});

	afterEach(() => {
		runtime.closeSSE();
		vi.clearAllMocks();
	});

	it('confirmAction passes resourceDecision payload through to postConfirmation', async () => {
		await runtime.confirmAction('req-1', {
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
		await runtime.confirmResourceDecision('req-2', 'allowForSession');

		expect(mockPostConfirmation).toHaveBeenCalledOnce();
		expect(mockPostConfirmation).toHaveBeenCalledWith(expect.anything(), 'req-2', {
			kind: 'resourceDecision',
			resourceDecision: 'allowForSession',
		});
	});

	it('confirmResourceDecision does not call postConfirmation when confirmAction throws', async () => {
		mockPostConfirmation.mockRejectedValueOnce(new Error('network error'));

		await runtime.confirmResourceDecision('req-3', 'denyOnce');

		// postConfirmation was called once (inside confirmAction) but threw
		expect(mockPostConfirmation).toHaveBeenCalledOnce();
	});
});
