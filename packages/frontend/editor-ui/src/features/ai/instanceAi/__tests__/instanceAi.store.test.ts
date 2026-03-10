import { setActivePinia, createPinia } from 'pinia';
import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';
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

vi.mock('../instanceAi.api', () => ({
	postMessage: vi.fn(),
	postCancel: vi.fn(),
	postConfirmation: vi.fn(),
}));

// Mock EventSource globally
let capturedOnMessage: ((ev: MessageEvent) => void) | null = null;
const mockClose = vi.fn();

class MockEventSource {
	onopen: (() => void) | null = null;
	onmessage: ((ev: MessageEvent) => void) | null = null;
	onerror: (() => void) | null = null;
	readyState = 1; // OPEN

	constructor(public url: string) {
		// Capture onmessage after it's assigned (deferred via microtask)
		setTimeout(() => {
			capturedOnMessage = this.onmessage;
			// Trigger onopen to move to connected state
			this.onopen?.();
		}, 0);
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

describe('useInstanceAiStore - onSSEMessage', () => {
	let store: ReturnType<typeof useInstanceAiStore>;

	beforeEach(async () => {
		setActivePinia(createPinia());
		capturedOnMessage = null;
		store = useInstanceAiStore();
		// Connect SSE to create the EventSource and capture onmessage
		store.connectSSE();
		// Wait for the setTimeout in MockEventSource constructor
		await vi.waitFor(() => {
			expect(capturedOnMessage).not.toBeNull();
		});
	});

	afterEach(() => {
		store.closeSSE();
		vi.clearAllMocks();
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
});
