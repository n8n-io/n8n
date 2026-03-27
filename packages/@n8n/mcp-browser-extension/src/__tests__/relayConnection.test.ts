import { RelayConnection } from '../relayConnection';

// ---------------------------------------------------------------------------
// Mocks for chrome.debugger API
// ---------------------------------------------------------------------------

const mockAttach = jest.fn().mockResolvedValue(undefined);
const mockDetach = jest.fn().mockResolvedValue(undefined);

/** Deterministic CDP targetId for a given chromeTabId. */
function targetIdForTab(chromeTabId: number): string {
	return `TARGET_${chromeTabId}`;
}

/**
 * Mock sendCommand: returns Target.getTargetInfo result when called with
 * that method (used for agent-created tabs), otherwise returns a generic result.
 */
const mockSendCommand = jest.fn(
	async (debuggee: { tabId: number }, method: string, _params?: object) => {
		if (method === 'Target.getTargetInfo') {
			return await Promise.resolve({
				targetInfo: { targetId: targetIdForTab(debuggee.tabId) },
			});
		}
		return await Promise.resolve({});
	},
);

/**
 * Mock getTargets: returns TargetInfo[] for all known tabs.
 * Tests should configure this to return entries for the tabs they register.
 */
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

const mockTabsGet = jest
	.fn()
	.mockResolvedValue({ id: 42, title: 'Test Tab', url: 'https://example.com' });

/** Helper to create a mock TargetInfo entry for getTargets. */
function mockTarget(chromeTabId: number): {
	id: string;
	tabId: number;
	type: string;
	title: string;
	url: string;
	attached: boolean;
} {
	return {
		id: targetIdForTab(chromeTabId),
		tabId: chromeTabId,
		type: 'page',
		title: `Tab ${chromeTabId}`,
		url: `https://tab${chromeTabId}.com`,
		attached: false,
	};
}

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
			query: jest.fn().mockResolvedValue([]),
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

// eslint-disable-next-line @typescript-eslint/naming-convention
Object.assign(globalThis, { WebSocket: MockWebSocket });

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const tick = async () => await new Promise((resolve) => setTimeout(resolve, 10));

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

		// Reset mockSendCommand to the default implementation
		mockSendCommand.mockImplementation(
			async (debuggee: { tabId: number }, method: string, _params?: object) => {
				if (method === 'Target.getTargetInfo') {
					return await Promise.resolve({
						targetInfo: { targetId: targetIdForTab(debuggee.tabId) },
					});
				}
				return await Promise.resolve({});
			},
		);

		// Default: return empty targets (tests set up their own)
		mockGetTargets.mockResolvedValue([]);

		ws = new MockWebSocket();
		relay = new RelayConnection(ws as unknown as WebSocket);
	});

	it('should register chrome.debugger listeners on construction', () => {
		expect(mockAddEventListener).toHaveBeenCalledTimes(1);
		expect(mockAddDetachListener).toHaveBeenCalledTimes(1);
	});

	describe('registerSelectedTabs', () => {
		it('should resolve CDP targetIds via getTargets without attaching', async () => {
			mockGetTargets.mockResolvedValueOnce([mockTarget(1), mockTarget(2), mockTarget(3)]);

			await relay.registerSelectedTabs([1, 2, 3]);
			const ids = relay.getControlledIds();
			expect(ids).toHaveLength(3);
			expect(ids).toEqual([
				{ targetId: targetIdForTab(1), chromeTabId: 1 },
				{ targetId: targetIdForTab(2), chromeTabId: 2 },
				{ targetId: targetIdForTab(3), chromeTabId: 3 },
			]);

			// Should NOT attach any debuggers (lazy)
			expect(mockAttach).not.toHaveBeenCalled();
			// Should have called getTargets once
			expect(mockGetTargets).toHaveBeenCalledTimes(1);
		});

		it('should set the first tab as primary (route commands without id)', async () => {
			mockGetTargets.mockResolvedValueOnce([mockTarget(10), mockTarget(20)]);
			await relay.registerSelectedTabs([10, 20]);
			mockSendCommand.mockResolvedValueOnce({ data: 'ok' });

			const message = JSON.stringify({
				id: 1,
				method: 'forwardCDPCommand',
				params: { method: 'Runtime.evaluate', params: { expression: '1' } },
			});
			ws.onmessage?.({ data: message });
			await tick();

			// Should lazy-attach and send command to chromeTabId 10 (first registered)
			expect(mockAttach).toHaveBeenCalledWith({ tabId: 10 }, '1.3');
			expect(mockSendCommand).toHaveBeenCalledWith({ tabId: 10 }, 'Runtime.evaluate', {
				expression: '1',
			});
		});

		it('should skip tabs not found in getTargets', async () => {
			// Only return targets for tabs 1 and 3, not 2
			mockGetTargets.mockResolvedValueOnce([mockTarget(1), mockTarget(3)]);

			await relay.registerSelectedTabs([1, 2, 3]);
			const ids = relay.getControlledIds();
			expect(ids).toHaveLength(2);
			expect(ids).toEqual([
				{ targetId: targetIdForTab(1), chromeTabId: 1 },
				{ targetId: targetIdForTab(3), chromeTabId: 3 },
			]);
		});
	});

	describe('addTab / removeTab', () => {
		it('should add a tab with CDP targetId without attaching', async () => {
			mockGetTargets.mockResolvedValueOnce([mockTarget(42)]);

			await relay.addTab(42, 'Test', 'https://test.com');
			expect(relay.getControlledIds()).toHaveLength(1);
			expect(relay.getControlledIds()[0]).toEqual({
				targetId: targetIdForTab(42),
				chromeTabId: 42,
			});

			// Should NOT attach (lazy)
			expect(mockAttach).not.toHaveBeenCalled();

			const sent = JSON.parse(ws.sent[0]);
			expect(sent.method).toBe('tabOpened');
			expect(sent.params.id).toBe(targetIdForTab(42));
			expect(sent.params.title).toBe('Test');
			expect(sent.params.url).toBe('https://test.com');
			expect(sent.params.tabId).toBeUndefined();
		});

		it('should not add duplicate tabs', async () => {
			mockGetTargets.mockResolvedValue([mockTarget(42)]);

			await relay.addTab(42, 'Test', 'https://test.com');
			await relay.addTab(42, 'Test', 'https://test.com');
			expect(relay.getControlledIds()).toHaveLength(1);
			expect(ws.sent).toHaveLength(1);
		});

		it('should remove a tab and send tabClosed event', async () => {
			mockGetTargets.mockResolvedValueOnce([mockTarget(42)]);
			await relay.addTab(42, 'Test', 'https://test.com');
			ws.sent.length = 0;

			relay.removeTab(42);
			expect(relay.getControlledIds()).toEqual([]);

			const sent = JSON.parse(ws.sent[0]);
			expect(sent.method).toBe('tabClosed');
			expect(sent.params.id).toBe(targetIdForTab(42));
		});

		it('should not detach debugger for unattached tabs', async () => {
			mockGetTargets.mockResolvedValueOnce([mockTarget(42)]);
			await relay.addTab(42, 'Test', 'https://test.com');
			relay.removeTab(42);
			expect(mockDetach).not.toHaveBeenCalled();
		});

		it('should close connection when last tab is removed', async () => {
			mockGetTargets.mockResolvedValueOnce([mockTarget(42)]);
			await relay.addTab(42, 'Test', 'https://test.com');
			const onclose = jest.fn();
			relay.onclose = onclose;

			relay.removeTab(42);
			expect(ws.closed).toBe(true);
			expect(onclose).toHaveBeenCalled();
		});

		it('should keep connection when one of multiple tabs is removed', async () => {
			mockGetTargets.mockResolvedValue([mockTarget(42), mockTarget(43)]);
			await relay.addTab(42, 'A', 'https://a.com');
			await relay.addTab(43, 'B', 'https://b.com');

			relay.removeTab(42);
			expect(relay.getControlledIds()).toHaveLength(1);
			expect(ws.closed).toBe(false);
		});

		it('should silently skip addTab when target not found', async () => {
			mockGetTargets.mockResolvedValueOnce([]); // No targets
			await relay.addTab(42, 'Test', 'https://test.com');
			expect(relay.getControlledIds()).toHaveLength(0);
			expect(ws.sent).toHaveLength(0);
		});
	});

	describe('listRegisteredTabs', () => {
		it('should return tab metadata with CDP targetIds', async () => {
			mockGetTargets.mockResolvedValueOnce([mockTarget(42)]);
			await relay.registerSelectedTabs([42]);
			ws.sent.length = 0;

			mockTabsGet.mockResolvedValueOnce({
				id: 42,
				title: 'Example',
				url: 'https://example.com',
			});

			ws.onmessage?.({ data: JSON.stringify({ id: 1, method: 'listRegisteredTabs' }) });
			await tick();

			expect(mockAttach).not.toHaveBeenCalled();
			expect(ws.sent).toHaveLength(1);
			const response = JSON.parse(ws.sent[0]);
			expect(response.id).toBe(1);
			const tabs = response.result.tabs;
			expect(tabs).toHaveLength(1);
			expect(tabs[0].id).toBe(targetIdForTab(42));
			expect(tabs[0].title).toBe('Example');
			expect(tabs[0].url).toBe('https://example.com');
			expect(tabs[0].tabId).toBeUndefined();
		});
	});

	describe('forwardCDPCommand (lazy attach)', () => {
		it('should lazy-attach debugger on first CDP command', async () => {
			mockGetTargets.mockResolvedValueOnce([mockTarget(123)]);
			await relay.registerSelectedTabs([123]);
			const tabId = relay.getControlledIds()[0].targetId;
			ws.sent.length = 0;
			mockSendCommand.mockResolvedValueOnce({ data: 'test-result' });

			ws.onmessage?.({
				data: JSON.stringify({
					id: 2,
					method: 'forwardCDPCommand',
					params: { method: 'Runtime.evaluate', params: { expression: '1+1' }, id: tabId },
				}),
			});
			await tick();

			expect(mockAttach).toHaveBeenCalledTimes(1);
			expect(mockAttach).toHaveBeenCalledWith({ tabId: 123 }, '1.3');
			expect(mockSendCommand).toHaveBeenCalledWith({ tabId: 123 }, 'Runtime.evaluate', {
				expression: '1+1',
			});
		});

		it('should not re-attach on subsequent commands', async () => {
			mockGetTargets.mockResolvedValueOnce([mockTarget(123)]);
			await relay.registerSelectedTabs([123]);
			const tabId = relay.getControlledIds()[0].targetId;
			ws.sent.length = 0;
			mockSendCommand.mockResolvedValue({ data: 'result' });

			ws.onmessage?.({
				data: JSON.stringify({
					id: 1,
					method: 'forwardCDPCommand',
					params: { method: 'Runtime.evaluate', params: {}, id: tabId },
				}),
			});
			await tick();

			ws.onmessage?.({
				data: JSON.stringify({
					id: 2,
					method: 'forwardCDPCommand',
					params: { method: 'DOM.getDocument', params: {}, id: tabId },
				}),
			});
			await tick();

			expect(mockAttach).toHaveBeenCalledTimes(1);
			expect(mockSendCommand).toHaveBeenCalledTimes(2);
		});

		it('should route CDP commands to specific tab by CDP targetId', async () => {
			mockGetTargets.mockResolvedValueOnce([mockTarget(10), mockTarget(20)]);
			await relay.registerSelectedTabs([10, 20]);
			const ids = relay.getControlledIds();
			ws.sent.length = 0;
			mockSendCommand.mockResolvedValueOnce({ data: 'result' });

			// Send to second tab (chromeTabId 20)
			ws.onmessage?.({
				data: JSON.stringify({
					id: 3,
					method: 'forwardCDPCommand',
					params: {
						method: 'Page.navigate',
						params: { url: 'https://example.com' },
						id: ids[1].targetId,
					},
				}),
			});
			await tick();

			expect(mockAttach).toHaveBeenCalledWith({ tabId: 20 }, '1.3');
			expect(mockSendCommand).toHaveBeenCalledWith({ tabId: 20 }, 'Page.navigate', {
				url: 'https://example.com',
			});
		});

		it('should error when no tabs are connected', async () => {
			ws.onmessage?.({
				data: JSON.stringify({
					id: 4,
					method: 'forwardCDPCommand',
					params: { method: 'Runtime.evaluate' },
				}),
			});
			await tick();

			const response = JSON.parse(ws.sent[0]);
			expect(response.error).toContain('No tab is connected');
		});
	});

	describe('isAgentCreatedTab', () => {
		it('should return false for non-agent tabs', async () => {
			mockGetTargets.mockResolvedValueOnce([mockTarget(42)]);
			await relay.registerSelectedTabs([42]);
			expect(relay.isAgentCreatedTab(42)).toBe(false);
		});

		it('should return true for agent-created tabs after createTab', async () => {
			relay.setSettings({ allowTabCreation: true, allowTabClosing: false });
			(globalThis.chrome.tabs.create as jest.Mock).mockResolvedValueOnce({
				id: 999,
				title: 'New',
				url: 'https://new.com',
			});

			ws.onmessage?.({
				data: JSON.stringify({
					id: 1,
					method: 'createTab',
					params: { url: 'https://new.com' },
				}),
			});
			await tick();

			expect(relay.isAgentCreatedTab(999)).toBe(true);
			// Agent-created tabs ARE eagerly attached
			expect(mockAttach).toHaveBeenCalledWith({ tabId: 999 }, '1.3');

			// Response should have CDP targetId, not chromeTabId
			const response = JSON.parse(ws.sent[0]);
			expect(response.result.id).toBe(targetIdForTab(999));
			expect(response.result.tabId).toBeUndefined();
		});
	});

	it('should send error response for malformed JSON', async () => {
		ws.onmessage?.({ data: 'not-json' });
		await tick();

		expect(ws.sent).toHaveLength(1);
		const response = JSON.parse(ws.sent[0]);
		expect(response.error).toBeDefined();
	});

	it('should only detach attached debuggees on close', async () => {
		mockGetTargets.mockResolvedValueOnce([mockTarget(42), mockTarget(43)]);
		await relay.registerSelectedTabs([42, 43]);
		const ids = relay.getControlledIds();
		mockSendCommand.mockResolvedValueOnce({});

		// Attach only one tab via CDP command
		ws.onmessage?.({
			data: JSON.stringify({
				id: 1,
				method: 'forwardCDPCommand',
				params: { method: 'Runtime.evaluate', params: {}, id: ids[0].targetId },
			}),
		});
		await tick();
		ws.sent.length = 0;

		relay.close('test');

		expect(ws.closed).toBe(true);
		expect(mockRemoveEventListener).toHaveBeenCalledTimes(1);
		expect(mockRemoveDetachListener).toHaveBeenCalledTimes(1);
		// Only detach the one that was attached (chromeTabId 42)
		expect(mockDetach).toHaveBeenCalledTimes(1);
		expect(mockDetach).toHaveBeenCalledWith({ tabId: 42 });
	});

	it('should forward debugger events with CDP targetId', async () => {
		mockGetTargets.mockResolvedValueOnce([mockTarget(42)]);
		await relay.addTab(42, 'Test', 'https://test.com');
		ws.sent.length = 0;

		const listener = eventListeners[0];
		listener({ tabId: 42 }, 'Page.loadEventFired', { timestamp: 123 });

		expect(ws.sent).toHaveLength(1);
		const event = JSON.parse(ws.sent[0]);
		expect(event.method).toBe('forwardCDPEvent');
		expect(event.params.method).toBe('Page.loadEventFired');
		expect(event.params.id).toBe(targetIdForTab(42));
		expect(event.params.tabId).toBeUndefined();
	});

	it('should ignore debugger events for uncontrolled tabs', async () => {
		mockGetTargets.mockResolvedValueOnce([mockTarget(42)]);
		await relay.addTab(42, 'Test', 'https://test.com');
		ws.sent.length = 0;

		const listener = eventListeners[0];
		listener({ tabId: 99 }, 'Page.loadEventFired', {});

		expect(ws.sent).toHaveLength(0);
	});

	it('should remove tab on debugger detach and close if no tabs left', async () => {
		mockGetTargets.mockResolvedValueOnce([mockTarget(42)]);
		await relay.addTab(42, 'Test', 'https://test.com');
		const onclose = jest.fn();
		relay.onclose = onclose;

		const detachListener = detachListeners[0];
		detachListener({ tabId: 42 }, 'target_closed');

		expect(relay.getControlledIds()).toEqual([]);
		expect(ws.closed).toBe(true);
		expect(onclose).toHaveBeenCalled();
	});

	it('should keep connection alive when one of multiple tabs detaches', async () => {
		mockGetTargets.mockResolvedValue([mockTarget(42), mockTarget(43)]);
		await relay.addTab(42, 'A', 'https://a.com');
		await relay.addTab(43, 'B', 'https://b.com');

		const detachListener = detachListeners[0];
		detachListener({ tabId: 42 }, 'target_closed');

		expect(relay.getControlledIds()).toHaveLength(1);
		expect(ws.closed).toBe(false);
	});

	it('should reject createTab when tab creation is disabled', async () => {
		relay.setSettings({ allowTabCreation: false, allowTabClosing: false });

		ws.onmessage?.({
			data: JSON.stringify({
				id: 5,
				method: 'createTab',
				params: { url: 'https://example.com' },
			}),
		});
		await tick();

		const response = JSON.parse(ws.sent[0]);
		expect(response.error).toContain('Tab creation is disabled');
	});

	it('should reject closeTab when tab closing is disabled', async () => {
		mockGetTargets.mockResolvedValueOnce([mockTarget(42)]);
		await relay.addTab(42, 'Test', 'https://test.com');
		const addedId = relay.getControlledIds()[0].targetId;
		relay.setSettings({ allowTabCreation: true, allowTabClosing: false });
		ws.sent.length = 0;

		ws.onmessage?.({
			data: JSON.stringify({
				id: 6,
				method: 'closeTab',
				params: { id: addedId },
			}),
		});
		await tick();

		const response = JSON.parse(ws.sent[0]);
		expect(response.error).toContain('Tab closing is disabled');
	});

	describe('spawned tab helpers', () => {
		it('isControlledTab returns true for registered tabs', async () => {
			mockGetTargets.mockResolvedValueOnce([mockTarget(10), mockTarget(20)]);
			await relay.registerSelectedTabs([10, 20]);
			expect(relay.isControlledTab(10)).toBe(true);
			expect(relay.isControlledTab(20)).toBe(true);
			expect(relay.isControlledTab(99)).toBe(false);
		});

		it('isControlledTab returns true for dynamically added tabs', async () => {
			mockGetTargets.mockResolvedValueOnce([mockTarget(42)]);
			await relay.addTab(42, 'Test', 'https://test.com');
			expect(relay.isControlledTab(42)).toBe(true);
		});

		it('isTabCreationAllowed reflects current settings', () => {
			expect(relay.isTabCreationAllowed()).toBe(true);
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

		it('markAsAgentCreated tabs are cleaned up on removeTab', async () => {
			mockGetTargets.mockResolvedValue([mockTarget(50), mockTarget(51)]);
			await relay.addTab(50, 'Spawned', 'https://spawned.com');
			relay.markAsAgentCreated(50);
			expect(relay.isAgentCreatedTab(50)).toBe(true);

			await relay.addTab(51, 'Other', 'https://other.com');
			relay.removeTab(50);
			expect(relay.isAgentCreatedTab(50)).toBe(false);
		});
	});
});
