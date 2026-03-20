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

const mockTabsQuery = jest.fn().mockResolvedValue([]);

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
		tabs: {
			create: jest.fn().mockResolvedValue({ id: 999, title: 'New Tab', url: 'about:blank' }),
			remove: jest.fn().mockResolvedValue(undefined),
			get: jest.fn().mockResolvedValue({ id: 42, title: 'Test Tab', url: 'https://example.com' }),
			query: mockTabsQuery,
		},
		storage: {
			local: {
				get: jest.fn().mockResolvedValue({}),
				set: jest.fn().mockResolvedValue(undefined),
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

	describe('discoverAndAttachTabs', () => {
		it('should discover and register eligible tabs', async () => {
			mockTabsQuery.mockResolvedValueOnce([
				{ id: 1, url: 'https://example.com' },
				{ id: 2, url: 'https://google.com' },
				{ id: 3, url: 'chrome://extensions/' },
				{ id: 4, url: 'chrome-extension://abc/popup.html' },
				{ id: 5, url: 'about:blank' },
			]);

			await relay.discoverAndAttachTabs();

			// Only tabs 1 and 2 are eligible
			expect(relay.getControlledTabIds()).toEqual([1, 2]);
		});

		it('should set the first eligible tab as primary', async () => {
			mockTabsQuery.mockResolvedValueOnce([
				{ id: 10, url: 'https://example.com' },
				{ id: 20, url: 'https://google.com' },
			]);

			await relay.discoverAndAttachTabs();

			// Verify by sending a CDP command without tabId — should route to tab 10
			mockSendCommand.mockResolvedValueOnce({ data: 'ok' });
			const message = JSON.stringify({
				id: 1,
				method: 'forwardCDPCommand',
				params: { method: 'Runtime.evaluate', params: { expression: '1' } },
			});
			ws.onmessage?.({ data: message });
			await new Promise((resolve) => setTimeout(resolve, 10));

			expect(mockSendCommand).toHaveBeenCalledWith({ tabId: 10 }, 'Runtime.evaluate', {
				expression: '1',
			});
		});
	});

	describe('addTab / removeTab', () => {
		it('should add a tab and send tabOpened event', () => {
			relay.addTab(42, 'Test', 'https://test.com');
			expect(relay.getControlledTabIds()).toEqual([42]);

			const sent = JSON.parse(ws.sent[0]);
			expect(sent.method).toBe('tabOpened');
			expect(sent.params).toEqual({ tabId: 42, title: 'Test', url: 'https://test.com' });
		});

		it('should not add duplicate tabs', () => {
			relay.addTab(42, 'Test', 'https://test.com');
			relay.addTab(42, 'Test', 'https://test.com');
			expect(relay.getControlledTabIds()).toEqual([42]);
			expect(ws.sent).toHaveLength(1);
		});

		it('should remove a tab and send tabClosed event', () => {
			relay.addTab(42, 'Test', 'https://test.com');
			ws.sent.length = 0; // clear tabOpened message

			relay.removeTab(42);
			expect(relay.getControlledTabIds()).toEqual([]);

			const sent = JSON.parse(ws.sent[0]);
			expect(sent.method).toBe('tabClosed');
			expect(sent.params).toEqual({ tabId: 42 });
		});

		it('should close connection when last tab is removed', () => {
			relay.addTab(42, 'Test', 'https://test.com');
			const onclose = jest.fn();
			relay.onclose = onclose;

			relay.removeTab(42);
			expect(ws.closed).toBe(true);
			expect(onclose).toHaveBeenCalled();
		});

		it('should keep connection when one of multiple tabs is removed', () => {
			relay.addTab(42, 'A', 'https://a.com');
			relay.addTab(43, 'B', 'https://b.com');

			relay.removeTab(42);
			expect(relay.getControlledTabIds()).toEqual([43]);
			expect(ws.closed).toBe(false);
		});
	});

	describe('attachToAllTabs', () => {
		it('should attach debugger to all controlled tabs', async () => {
			relay.addTab(10, 'A', 'https://a.com');
			relay.addTab(20, 'B', 'https://b.com');
			relay.addTab(30, 'C', 'https://c.com');
			ws.sent.length = 0;

			mockAttach.mockResolvedValue(undefined);
			mockSendCommand.mockResolvedValueOnce({ targetInfo: { targetId: 'first', type: 'page' } });

			const message = JSON.stringify({ id: 1, method: 'attachToAllTabs' });
			ws.onmessage?.({ data: message });

			await new Promise((resolve) => setTimeout(resolve, 10));

			expect(mockAttach).toHaveBeenCalledTimes(3);
			expect(mockAttach).toHaveBeenCalledWith({ tabId: 10 }, '1.3');
			expect(mockAttach).toHaveBeenCalledWith({ tabId: 20 }, '1.3');
			expect(mockAttach).toHaveBeenCalledWith({ tabId: 30 }, '1.3');
		});

		it('should return primary tab targetInfo', async () => {
			relay.addTab(123, 'Test', 'https://test.com');
			ws.sent.length = 0;

			mockAttach.mockResolvedValueOnce(undefined);
			mockSendCommand.mockResolvedValueOnce({ targetInfo: { targetId: 'abc', type: 'page' } });

			const message = JSON.stringify({ id: 1, method: 'attachToAllTabs' });
			ws.onmessage?.({ data: message });

			await new Promise((resolve) => setTimeout(resolve, 10));

			expect(ws.sent).toHaveLength(1);
			const response = JSON.parse(ws.sent[0]);
			expect(response.id).toBe(1);
			expect(response.result).toEqual({ targetInfo: { targetId: 'abc', type: 'page' } });
		});
	});

	describe('forwardCDPCommand', () => {
		it('should forward CDP commands via chrome.debugger.sendCommand', async () => {
			relay.addTab(123, 'Test', 'https://test.com');
			ws.sent.length = 0;
			mockSendCommand.mockResolvedValueOnce({ data: 'test-result' });

			const message = JSON.stringify({
				id: 2,
				method: 'forwardCDPCommand',
				params: { method: 'Runtime.evaluate', params: { expression: '1+1' } },
			});
			ws.onmessage?.({ data: message });

			await new Promise((resolve) => setTimeout(resolve, 10));

			expect(mockSendCommand).toHaveBeenCalledWith({ tabId: 123 }, 'Runtime.evaluate', {
				expression: '1+1',
			});

			const response = JSON.parse(ws.sent[0]);
			expect(response.id).toBe(2);
			expect(response.result).toEqual({ data: 'test-result' });
		});

		it('should route CDP commands to specific tab when tabId provided', async () => {
			relay.addTab(10, 'A', 'https://a.com');
			relay.addTab(20, 'B', 'https://b.com');
			ws.sent.length = 0;
			mockSendCommand.mockResolvedValueOnce({ data: 'result' });

			const message = JSON.stringify({
				id: 3,
				method: 'forwardCDPCommand',
				params: { method: 'Page.navigate', params: { url: 'https://example.com' }, tabId: 20 },
			});
			ws.onmessage?.({ data: message });

			await new Promise((resolve) => setTimeout(resolve, 10));

			expect(mockSendCommand).toHaveBeenCalledWith({ tabId: 20 }, 'Page.navigate', {
				url: 'https://example.com',
			});
		});

		it('should error when no tabs are connected', async () => {
			const message = JSON.stringify({
				id: 4,
				method: 'forwardCDPCommand',
				params: { method: 'Runtime.evaluate' },
			});
			ws.onmessage?.({ data: message });

			await new Promise((resolve) => setTimeout(resolve, 10));

			const response = JSON.parse(ws.sent[0]);
			expect(response.error).toContain('No tab is connected');
		});
	});

	it('should send error response for malformed JSON', async () => {
		ws.onmessage?.({ data: 'not-json' });

		await new Promise((resolve) => setTimeout(resolve, 10));

		expect(ws.sent).toHaveLength(1);
		const response = JSON.parse(ws.sent[0]);
		expect(response.error).toBeDefined();
	});

	it('should clean up all listeners and debuggees on close', () => {
		relay.addTab(42, 'A', 'https://a.com');
		relay.addTab(43, 'B', 'https://b.com');
		relay.close('test');

		expect(ws.closed).toBe(true);
		expect(mockRemoveEventListener).toHaveBeenCalledTimes(1);
		expect(mockRemoveDetachListener).toHaveBeenCalledTimes(1);
		// Should detach all debuggees
		expect(mockDetach).toHaveBeenCalledTimes(2);
	});

	it('should forward debugger events for matching tab', () => {
		relay.addTab(42, 'Test', 'https://test.com');
		ws.sent.length = 0;

		const listener = eventListeners[0];
		listener({ tabId: 42 }, 'Page.loadEventFired', { timestamp: 123 });

		expect(ws.sent).toHaveLength(1);
		const event = JSON.parse(ws.sent[0]);
		expect(event.method).toBe('forwardCDPEvent');
		expect(event.params.method).toBe('Page.loadEventFired');
		expect(event.params.tabId).toBe(42);
	});

	it('should ignore debugger events for other tabs', () => {
		relay.addTab(42, 'Test', 'https://test.com');
		ws.sent.length = 0;

		const listener = eventListeners[0];
		listener({ tabId: 99 }, 'Page.loadEventFired', {});

		expect(ws.sent).toHaveLength(0);
	});

	it('should remove tab on debugger detach and close if no tabs left', () => {
		relay.addTab(42, 'Test', 'https://test.com');
		const onclose = jest.fn();
		relay.onclose = onclose;

		const detachListener = detachListeners[0];
		detachListener({ tabId: 42 }, 'target_closed');

		expect(relay.getControlledTabIds()).toEqual([]);
		expect(ws.closed).toBe(true);
		expect(onclose).toHaveBeenCalled();
	});

	it('should keep connection alive when one of multiple tabs detaches', () => {
		relay.addTab(42, 'A', 'https://a.com');
		relay.addTab(43, 'B', 'https://b.com');

		const detachListener = detachListeners[0];
		detachListener({ tabId: 42 }, 'target_closed');

		expect(relay.getControlledTabIds()).toEqual([43]);
		expect(ws.closed).toBe(false);
	});

	it('should reject createTab when tab creation is disabled', async () => {
		relay.setSettings({ allowTabCreation: false, allowTabClosing: false });

		const message = JSON.stringify({
			id: 5,
			method: 'createTab',
			params: { url: 'https://example.com' },
		});
		ws.onmessage?.({ data: message });

		await new Promise((resolve) => setTimeout(resolve, 10));

		const response = JSON.parse(ws.sent[0]);
		expect(response.error).toContain('Tab creation is disabled');
	});

	it('should reject closeTab when tab closing is disabled', async () => {
		relay.addTab(42, 'Test', 'https://test.com');
		relay.setSettings({ allowTabCreation: true, allowTabClosing: false });
		ws.sent.length = 0; // clear tabOpened message

		const message = JSON.stringify({
			id: 6,
			method: 'closeTab',
			params: { tabId: 42 },
		});
		ws.onmessage?.({ data: message });

		await new Promise((resolve) => setTimeout(resolve, 10));

		const response = JSON.parse(ws.sent[0]);
		expect(response.error).toContain('Tab closing is disabled');
	});
});
