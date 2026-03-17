import { RelayConnection } from '../relayConnection';

// ---------------------------------------------------------------------------
// Mocks for chrome.debugger API
// ---------------------------------------------------------------------------

const mockAttach = jest.fn().mockResolvedValue(undefined);
const mockDetach = jest.fn().mockResolvedValue(undefined);
const mockSendCommand = jest.fn().mockResolvedValue({});

const eventListeners: Array<(...args: unknown[]) => void> = [];
const detachListeners: Array<(...args: unknown[]) => void> = [];

const mockAddEventListener = jest.fn((fn: (...args: unknown[]) => void) => {
	eventListeners.push(fn);
});
const mockRemoveEventListener = jest.fn((fn: (...args: unknown[]) => void) => {
	const idx = eventListeners.indexOf(fn);
	if (idx >= 0) eventListeners.splice(idx, 1);
});
const mockAddDetachListener = jest.fn((fn: (...args: unknown[]) => void) => {
	detachListeners.push(fn);
});
const mockRemoveDetachListener = jest.fn((fn: (...args: unknown[]) => void) => {
	const idx = detachListeners.indexOf(fn);
	if (idx >= 0) detachListeners.splice(idx, 1);
});

Object.assign(globalThis, {
	chrome: {
		debugger: {
			attach: mockAttach,
			detach: mockDetach,
			sendCommand: mockSendCommand,
			onEvent: {
				addListener: mockAddEventListener,
				removeListener: mockRemoveEventListener,
			},
			onDetach: {
				addListener: mockAddDetachListener,
				removeListener: mockRemoveDetachListener,
			},
		},
	},
});

// ---------------------------------------------------------------------------
// Minimal WebSocket stub
// ---------------------------------------------------------------------------

class MockWebSocket {
	static readonly OPEN = 1;
	static readonly CLOSED = 3;

	readyState = MockWebSocket.OPEN;
	onmessage?: (event: { data: string }) => void;
	onclose?: () => void;

	sent: string[] = [];
	closed = false;
	closeCode?: number;
	closeReason?: string;

	send(data: string): void {
		this.sent.push(data);
	}

	close(code?: number, reason?: string): void {
		this.closed = true;
		this.closeCode = code;
		this.closeReason = reason;
		this.readyState = MockWebSocket.CLOSED;
	}
}

// Make the mock class look like WebSocket to the code under test
// eslint-disable-next-line @typescript-eslint/naming-convention
Object.assign(globalThis, { WebSocket: MockWebSocket });

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('RelayConnection', () => {
	let ws: MockWebSocket;
	let relay: RelayConnection;

	beforeEach(() => {
		jest.clearAllMocks();
		eventListeners.length = 0;
		detachListeners.length = 0;

		ws = new MockWebSocket();
		relay = new RelayConnection(ws as unknown as WebSocket);
	});

	it('should register chrome.debugger listeners on construction', () => {
		expect(mockAddEventListener).toHaveBeenCalledTimes(1);
		expect(mockAddDetachListener).toHaveBeenCalledTimes(1);
	});

	it('should set debuggee tabId via setTabId', () => {
		relay.setTabId(42);
		// No direct getter, but we can verify indirectly by sending a message
		// that requires tabId to be set.
		expect(() => relay.setTabId(42)).not.toThrow();
	});

	it('should respond to attachToTab with targetInfo', async () => {
		relay.setTabId(123);

		mockAttach.mockResolvedValueOnce(undefined);
		mockSendCommand.mockResolvedValueOnce({ targetInfo: { targetId: 'abc', type: 'page' } });

		// Simulate incoming attachToTab command
		const message = JSON.stringify({ id: 1, method: 'attachToTab' });
		ws.onmessage?.({ data: message });

		// Wait for async processing
		await new Promise((resolve) => setTimeout(resolve, 10));

		expect(mockAttach).toHaveBeenCalledWith({ tabId: 123 }, '1.3');
		expect(ws.sent).toHaveLength(1);

		const response = JSON.parse(ws.sent[0]);
		expect(response.id).toBe(1);
		expect(response.result).toEqual({ targetInfo: { targetId: 'abc', type: 'page' } });
	});

	it('should forward CDP commands via chrome.debugger.sendCommand', async () => {
		relay.setTabId(123);
		mockSendCommand.mockResolvedValueOnce({ data: 'test-result' });

		const message = JSON.stringify({
			id: 2,
			method: 'forwardCDPCommand',
			params: { method: 'Runtime.evaluate', params: { expression: '1+1' } },
		});
		ws.onmessage?.({ data: message });

		await new Promise((resolve) => setTimeout(resolve, 10));

		expect(mockSendCommand).toHaveBeenCalledWith(
			{ tabId: 123, sessionId: undefined },
			'Runtime.evaluate',
			{ expression: '1+1' },
		);

		const response = JSON.parse(ws.sent[0]);
		expect(response.id).toBe(2);
		expect(response.result).toEqual({ data: 'test-result' });
	});

	it('should send error response for malformed JSON', async () => {
		ws.onmessage?.({ data: 'not-json' });

		await new Promise((resolve) => setTimeout(resolve, 10));

		expect(ws.sent).toHaveLength(1);
		const response = JSON.parse(ws.sent[0]);
		expect(response.error).toBeDefined();
	});

	it('should clean up listeners on close', () => {
		relay.close('test');

		expect(ws.closed).toBe(true);
		expect(mockRemoveEventListener).toHaveBeenCalledTimes(1);
		expect(mockRemoveDetachListener).toHaveBeenCalledTimes(1);
		expect(mockDetach).toHaveBeenCalled();
	});

	it('should forward debugger events for matching tab', () => {
		relay.setTabId(42);

		// Simulate a debugger event for the matching tab
		const listener = eventListeners[0];
		listener({ tabId: 42 }, 'Page.loadEventFired', { timestamp: 123 });

		expect(ws.sent).toHaveLength(1);
		const event = JSON.parse(ws.sent[0]);
		expect(event.method).toBe('forwardCDPEvent');
		expect(event.params.method).toBe('Page.loadEventFired');
	});

	it('should ignore debugger events for other tabs', () => {
		relay.setTabId(42);

		const listener = eventListeners[0];
		listener({ tabId: 99 }, 'Page.loadEventFired', {});

		expect(ws.sent).toHaveLength(0);
	});
});
