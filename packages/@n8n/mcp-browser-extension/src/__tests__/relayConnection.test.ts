import { RelayConnection } from '../relayConnection';

// ---------------------------------------------------------------------------
// Mocks for chrome.debugger API
// ---------------------------------------------------------------------------

const mockAttach = jest.fn().mockResolvedValue(undefined);
const mockDetach = jest.fn().mockResolvedValue(undefined);
const mockSendCommand = jest.fn().mockResolvedValue({});
const mockGetTargets = jest.fn().mockResolvedValue([]);

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
const mockTabsGet = jest
	.fn()
	.mockResolvedValue({ id: 42, title: 'Test Tab', url: 'https://example.com' });

Object.assign(globalThis, {
	chrome: {
		debugger: {
			attach: mockAttach,
			detach: mockDetach,
			sendCommand: mockSendCommand,
			getTargets: mockGetTargets,
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
			get: mockTabsGet,
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

	describe('registerSelectedTabs', () => {
		it('should register only specified tab IDs', () => {
			relay.registerSelectedTabs([1, 2, 3]);
			expect(relay.getControlledTabIds()).toEqual([1, 2, 3]);
		});

		it('should set the first tab as primary', async () => {
			relay.registerSelectedTabs([10, 20]);

			// Verify by sending a CDP command without tabId — should route to tab 10
			mockSendCommand.mockResolvedValueOnce({ data: 'ok' });
			const message = JSON.stringify({
				id: 1,
				method: 'forwardCDPCommand',
				params: { method: 'Runtime.evaluate', params: { expression: '1' } },
			});
			ws.onmessage?.({ data: message });
			await new Promise((resolve) => setTimeout(resolve, 10));

			// Should lazy-attach and then send command to tab 10
			expect(mockAttach).toHaveBeenCalledWith({ tabId: 10 }, '1.3');
			expect(mockSendCommand).toHaveBeenCalledWith({ tabId: 10 }, 'Runtime.evaluate', {
				expression: '1',
			});
		});

		it('should not attach debugger on registration', () => {
			relay.registerSelectedTabs([1, 2, 3]);
			expect(mockAttach).not.toHaveBeenCalled();
		});
	});

	describe('addTab / removeTab', () => {
		it('should add a tab and send tabOpened event', async () => {
			relay.addTab(42, 'Test', 'https://test.com');
			expect(relay.getControlledTabIds()).toEqual([42]);

			await new Promise((resolve) => setTimeout(resolve, 10));
			const sent = JSON.parse(ws.sent[0]);
			expect(sent.method).toBe('tabOpened');
			expect(sent.params).toMatchObject({ tabId: 42, title: 'Test', url: 'https://test.com' });
		});

		it('should not add duplicate tabs', async () => {
			relay.addTab(42, 'Test', 'https://test.com');
			relay.addTab(42, 'Test', 'https://test.com');
			expect(relay.getControlledTabIds()).toEqual([42]);
			await new Promise((resolve) => setTimeout(resolve, 10));
			expect(ws.sent).toHaveLength(1);
		});

		it('should remove a tab and send tabClosed event', async () => {
			relay.addTab(42, 'Test', 'https://test.com');
			await new Promise((resolve) => setTimeout(resolve, 10));
			ws.sent.length = 0; // clear tabOpened message

			relay.removeTab(42);
			expect(relay.getControlledTabIds()).toEqual([]);

			const sent = JSON.parse(ws.sent[0]);
			expect(sent.method).toBe('tabClosed');
			expect(sent.params).toEqual({ tabId: 42 });
		});

		it('should only detach debugger for tabs that were actually attached', () => {
			relay.addTab(42, 'Test', 'https://test.com');
			// Tab was never attached via ensureAttached/forwardCDPCommand
			relay.removeTab(42);
			expect(mockDetach).not.toHaveBeenCalled();
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

	describe('listRegisteredTabs', () => {
		it('should return tab metadata without attaching debugger', async () => {
			relay.registerSelectedTabs([42]);
			ws.sent.length = 0;

			mockTabsGet.mockResolvedValueOnce({
				id: 42,
				title: 'Example',
				url: 'https://example.com',
			});

			const message = JSON.stringify({ id: 1, method: 'listRegisteredTabs' });
			ws.onmessage?.({ data: message });

			await new Promise((resolve) => setTimeout(resolve, 10));

			expect(mockAttach).not.toHaveBeenCalled();
			expect(ws.sent).toHaveLength(1);
			const response = JSON.parse(ws.sent[0]);
			expect(response.id).toBe(1);
			expect(response.result).toEqual({
				tabs: [{ tabId: 42, title: 'Example', url: 'https://example.com' }],
			});
		});
	});

	describe('forwardCDPCommand (lazy attach)', () => {
		it('should lazy-attach debugger on first CDP command', async () => {
			relay.registerSelectedTabs([123]);
			ws.sent.length = 0;
			mockSendCommand.mockResolvedValueOnce({ data: 'test-result' });

			const message = JSON.stringify({
				id: 2,
				method: 'forwardCDPCommand',
				params: { method: 'Runtime.evaluate', params: { expression: '1+1' } },
			});
			ws.onmessage?.({ data: message });

			await new Promise((resolve) => setTimeout(resolve, 10));

			// Should have attached first, then sent command
			expect(mockAttach).toHaveBeenCalledTimes(1);
			expect(mockAttach).toHaveBeenCalledWith({ tabId: 123 }, '1.3');
			expect(mockSendCommand).toHaveBeenCalledWith({ tabId: 123 }, 'Runtime.evaluate', {
				expression: '1+1',
			});
		});

		it('should not re-attach on subsequent commands to the same tab', async () => {
			relay.registerSelectedTabs([123]);
			ws.sent.length = 0;
			mockSendCommand.mockResolvedValue({ data: 'result' });

			// First command — triggers attach
			ws.onmessage?.({
				data: JSON.stringify({
					id: 1,
					method: 'forwardCDPCommand',
					params: { method: 'Runtime.evaluate', params: {} },
				}),
			});
			await new Promise((resolve) => setTimeout(resolve, 10));

			// Second command — should NOT re-attach
			ws.onmessage?.({
				data: JSON.stringify({
					id: 2,
					method: 'forwardCDPCommand',
					params: { method: 'DOM.getDocument', params: {} },
				}),
			});
			await new Promise((resolve) => setTimeout(resolve, 10));

			expect(mockAttach).toHaveBeenCalledTimes(1);
			expect(mockSendCommand).toHaveBeenCalledTimes(2);
		});

		it('should route CDP commands to specific tab when tabId provided', async () => {
			relay.registerSelectedTabs([10, 20]);
			ws.sent.length = 0;
			mockSendCommand.mockResolvedValueOnce({ data: 'result' });

			const message = JSON.stringify({
				id: 3,
				method: 'forwardCDPCommand',
				params: { method: 'Page.navigate', params: { url: 'https://example.com' }, tabId: 20 },
			});
			ws.onmessage?.({ data: message });

			await new Promise((resolve) => setTimeout(resolve, 10));

			// Should attach to tab 20, not tab 10
			expect(mockAttach).toHaveBeenCalledWith({ tabId: 20 }, '1.3');
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

	describe('isAgentCreatedTab', () => {
		it('should return false for non-agent tabs', () => {
			relay.registerSelectedTabs([42]);
			expect(relay.isAgentCreatedTab(42)).toBe(false);
		});

		it('should return true for agent-created tabs after createTab', async () => {
			relay.setSettings({ allowTabCreation: true, allowTabClosing: false });
			(globalThis.chrome.tabs.create as jest.Mock).mockResolvedValueOnce({
				id: 999,
				title: 'New',
				url: 'https://new.com',
			});

			const message = JSON.stringify({
				id: 1,
				method: 'createTab',
				params: { url: 'https://new.com' },
			});
			ws.onmessage?.({ data: message });
			await new Promise((resolve) => setTimeout(resolve, 10));

			expect(relay.isAgentCreatedTab(999)).toBe(true);
			// Agent-created tabs are immediately attached
			expect(mockAttach).toHaveBeenCalledWith({ tabId: 999 }, '1.3');
		});
	});

	it('should send error response for malformed JSON', async () => {
		ws.onmessage?.({ data: 'not-json' });

		await new Promise((resolve) => setTimeout(resolve, 10));

		expect(ws.sent).toHaveLength(1);
		const response = JSON.parse(ws.sent[0]);
		expect(response.error).toBeDefined();
	});

	it('should clean up only attached debuggees on close', async () => {
		relay.registerSelectedTabs([42, 43]);

		// Attach only tab 42 via a CDP command
		mockSendCommand.mockResolvedValueOnce({});
		ws.onmessage?.({
			data: JSON.stringify({
				id: 1,
				method: 'forwardCDPCommand',
				params: { method: 'Runtime.evaluate', params: {}, tabId: 42 },
			}),
		});
		await new Promise((resolve) => setTimeout(resolve, 10));
		ws.sent.length = 0;

		relay.close('test');

		expect(ws.closed).toBe(true);
		expect(mockRemoveEventListener).toHaveBeenCalledTimes(1);
		expect(mockRemoveDetachListener).toHaveBeenCalledTimes(1);
		// Should only detach tab 42 (the one that was actually attached)
		expect(mockDetach).toHaveBeenCalledTimes(1);
		expect(mockDetach).toHaveBeenCalledWith({ tabId: 42 });
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
		await new Promise((resolve) => setTimeout(resolve, 10));
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

	describe('spawned tab helpers', () => {
		it('isControlledTab returns true for registered tabs', () => {
			relay.registerSelectedTabs([10, 20]);
			expect(relay.isControlledTab(10)).toBe(true);
			expect(relay.isControlledTab(20)).toBe(true);
			expect(relay.isControlledTab(99)).toBe(false);
		});

		it('isControlledTab returns true for dynamically added tabs', () => {
			relay.addTab(42, 'Test', 'https://test.com');
			expect(relay.isControlledTab(42)).toBe(true);
		});

		it('isTabCreationAllowed reflects current settings', () => {
			expect(relay.isTabCreationAllowed()).toBe(true); // default
			relay.setSettings({ allowTabCreation: false, allowTabClosing: false });
			expect(relay.isTabCreationAllowed()).toBe(false);
			relay.setSettings({ allowTabCreation: true, allowTabClosing: false });
			expect(relay.isTabCreationAllowed()).toBe(true);
		});

		it('markAsAgentCreated causes isAgentCreatedTab to return true', () => {
			expect(relay.isAgentCreatedTab(50)).toBe(false);
			relay.markAsAgentCreated(50);
			expect(relay.isAgentCreatedTab(50)).toBe(true);
		});

		it('markAsAgentCreated tabs are cleaned up on removeTab', () => {
			relay.addTab(50, 'Spawned', 'https://spawned.com');
			relay.markAsAgentCreated(50);
			expect(relay.isAgentCreatedTab(50)).toBe(true);

			relay.addTab(51, 'Other', 'https://other.com'); // keep connection alive
			relay.removeTab(50);
			expect(relay.isAgentCreatedTab(50)).toBe(false);
		});
	});
});
