import { RelayConnection } from './relayConnection';

// ---------------------------------------------------------------------------
// Chrome API mock — single object, access mocks via chrome.debugger.attach etc.
// ---------------------------------------------------------------------------

function targetIdForTab(chromeTabId: number): string {
	return `TARGET_${chromeTabId}`;
}

function mockTarget(chromeTabId: number) {
	return {
		id: targetIdForTab(chromeTabId),
		tabId: chromeTabId,
		type: 'page',
		title: `Tab ${chromeTabId}`,
		url: `https://tab${chromeTabId}.com`,
		attached: false,
	};
}

const chrome = {
	debugger: {
		attach: vi.fn().mockResolvedValue(undefined),
		detach: vi.fn().mockResolvedValue(undefined),
		sendCommand: vi.fn(async (debuggee: { tabId: number }, method: string, _params?: object) => {
			if (method === 'Target.getTargetInfo') {
				return await Promise.resolve({
					targetInfo: { targetId: targetIdForTab(debuggee.tabId) },
				});
			}
			return await Promise.resolve({});
		}),
		getTargets: vi.fn().mockResolvedValue([]),
		onEvent: { addListener: vi.fn(), removeListener: vi.fn() },
		onDetach: { addListener: vi.fn(), removeListener: vi.fn() },
	},
	tabs: {
		create: vi.fn().mockResolvedValue({ id: 999, title: 'New Tab', url: 'about:blank' }),
		remove: vi.fn().mockResolvedValue(undefined),
		get: vi.fn().mockResolvedValue({ id: 42, title: 'Test Tab', url: 'https://example.com' }),
		query: vi.fn().mockResolvedValue([]),
	},
	storage: {
		local: {
			get: vi.fn().mockResolvedValue({}),
			set: vi.fn().mockResolvedValue(undefined),
		},
	},
};
Object.assign(globalThis, { chrome });

/** Fire the debugger event listener registered by RelayConnection's constructor. */
function fireDebuggerEvent(source: object, method: string, params?: object) {
	const listener = chrome.debugger.onEvent.addListener.mock.calls[0]?.[0] as
		| ((...args: unknown[]) => void)
		| undefined;
	listener?.(source, method, params);
}

/** Fire the debugger detach listener registered by RelayConnection's constructor. */
function fireDebuggerDetach(source: object, reason: string) {
	const listener = chrome.debugger.onDetach.addListener.mock.calls[0]?.[0] as
		| ((...args: unknown[]) => void)
		| undefined;
	listener?.(source, reason);
}

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

/** Parse a sent WebSocket frame and return the object for assertions. */
function parseSent(ws: MockWebSocket, index = 0): unknown {
	return JSON.parse(ws.sent[index]);
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('RelayConnection', () => {
	let ws: MockWebSocket;
	let relay: RelayConnection;

	beforeEach(() => {
		vi.clearAllMocks();

		ws = new MockWebSocket();
		relay = new RelayConnection(ws as unknown as WebSocket);
	});

	it('should register chrome.debugger listeners on construction', () => {
		expect(chrome.debugger.onEvent.addListener).toHaveBeenCalledTimes(1);
		expect(chrome.debugger.onDetach.addListener).toHaveBeenCalledTimes(1);
	});

	describe('registerSelectedTabs', () => {
		it('should resolve CDP targetIds via getTargets without attaching', async () => {
			chrome.debugger.getTargets.mockResolvedValueOnce([
				mockTarget(1),
				mockTarget(2),
				mockTarget(3),
			]);

			await relay.registerSelectedTabs([1, 2, 3]);
			const ids = relay.getControlledIds();
			expect(ids).toHaveLength(3);
			expect(ids).toEqual([
				{ targetId: targetIdForTab(1), chromeTabId: 1 },
				{ targetId: targetIdForTab(2), chromeTabId: 2 },
				{ targetId: targetIdForTab(3), chromeTabId: 3 },
			]);

			// Should NOT attach any debuggers (lazy)
			expect(chrome.debugger.attach).not.toHaveBeenCalled();
			// Should have called getTargets once
			expect(chrome.debugger.getTargets).toHaveBeenCalledTimes(1);
		});

		it('should set the first tab as primary (route commands without id)', async () => {
			chrome.debugger.getTargets.mockResolvedValueOnce([mockTarget(10), mockTarget(20)]);
			await relay.registerSelectedTabs([10, 20]);
			chrome.debugger.sendCommand.mockResolvedValueOnce({ data: 'ok' });

			const message = JSON.stringify({
				id: 1,
				method: 'forwardCDPCommand',
				params: { method: 'Runtime.evaluate', params: { expression: '1' } },
			});
			ws.onmessage?.({ data: message });
			await tick();

			// Should lazy-attach and send command to chromeTabId 10 (first registered)
			expect(chrome.debugger.attach).toHaveBeenCalledWith({ tabId: 10 }, '1.3');
			expect(chrome.debugger.sendCommand).toHaveBeenCalledWith({ tabId: 10 }, 'Runtime.evaluate', {
				expression: '1',
			});
		});

		it('should skip tabs not found in getTargets', async () => {
			// Only return targets for tabs 1 and 3, not 2
			chrome.debugger.getTargets.mockResolvedValueOnce([mockTarget(1), mockTarget(3)]);

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
			chrome.debugger.getTargets.mockResolvedValueOnce([mockTarget(42)]);

			await relay.addTab(42, 'Test', 'https://test.com');
			expect(relay.getControlledIds()).toHaveLength(1);
			expect(relay.getControlledIds()[0]).toEqual({
				targetId: targetIdForTab(42),
				chromeTabId: 42,
			});

			// Should NOT attach (lazy)
			expect(chrome.debugger.attach).not.toHaveBeenCalled();

			expect(ws.sent[0]).toEqual(expect.stringContaining('"method":"tabOpened"'));
			expect(parseSent(ws)).toEqual(
				expect.objectContaining({
					method: 'tabOpened',
					params: expect.objectContaining({
						id: targetIdForTab(42),
						title: 'Test',
						url: 'https://test.com',
					}),
				}),
			);
			expect(parseSent(ws)).not.toHaveProperty('params.tabId');
		});

		it('should not add duplicate tabs', async () => {
			chrome.debugger.getTargets.mockResolvedValue([mockTarget(42)]);

			await relay.addTab(42, 'Test', 'https://test.com');
			await relay.addTab(42, 'Test', 'https://test.com');
			expect(relay.getControlledIds()).toHaveLength(1);
			expect(ws.sent).toHaveLength(1);
		});

		it('should remove a tab and send tabClosed event', async () => {
			chrome.debugger.getTargets.mockResolvedValueOnce([mockTarget(42)]);
			await relay.addTab(42, 'Test', 'https://test.com');
			ws.sent.length = 0;

			relay.removeTab(42);
			expect(relay.getControlledIds()).toEqual([]);

			expect(parseSent(ws)).toEqual(
				expect.objectContaining({
					method: 'tabClosed',
					params: expect.objectContaining({ id: targetIdForTab(42) }),
				}),
			);
		});

		it('should not detach debugger for unattached tabs', async () => {
			chrome.debugger.getTargets.mockResolvedValueOnce([mockTarget(42)]);
			await relay.addTab(42, 'Test', 'https://test.com');
			relay.removeTab(42);
			expect(chrome.debugger.detach).not.toHaveBeenCalled();
		});

		it('should close connection when last tab is removed', async () => {
			chrome.debugger.getTargets.mockResolvedValueOnce([mockTarget(42)]);
			await relay.addTab(42, 'Test', 'https://test.com');
			const onclose = vi.fn();
			relay.onclose = onclose;

			relay.removeTab(42);
			expect(ws.closed).toBe(true);
			expect(onclose).toHaveBeenCalled();
		});

		it('should keep connection when one of multiple tabs is removed', async () => {
			chrome.debugger.getTargets.mockResolvedValue([mockTarget(42), mockTarget(43)]);
			await relay.addTab(42, 'A', 'https://a.com');
			await relay.addTab(43, 'B', 'https://b.com');

			relay.removeTab(42);
			expect(relay.getControlledIds()).toHaveLength(1);
			expect(ws.closed).toBe(false);
		});

		it('should silently skip addTab when target not found', async () => {
			chrome.debugger.getTargets.mockResolvedValueOnce([]); // No targets
			await relay.addTab(42, 'Test', 'https://test.com');
			expect(relay.getControlledIds()).toHaveLength(0);
			expect(ws.sent).toHaveLength(0);
		});
	});

	describe('listRegisteredTabs', () => {
		it('should return tab metadata with CDP targetIds', async () => {
			chrome.debugger.getTargets.mockResolvedValueOnce([mockTarget(42)]);
			await relay.registerSelectedTabs([42]);
			ws.sent.length = 0;

			chrome.tabs.get.mockResolvedValueOnce({
				id: 42,
				title: 'Example',
				url: 'https://example.com',
			});

			ws.onmessage?.({ data: JSON.stringify({ id: 1, method: 'listRegisteredTabs' }) });
			await tick();

			expect(chrome.debugger.attach).not.toHaveBeenCalled();
			expect(ws.sent).toHaveLength(1);
			expect(parseSent(ws)).toEqual(
				expect.objectContaining({
					id: 1,
					result: expect.objectContaining({
						tabs: [
							expect.objectContaining({
								id: targetIdForTab(42),
								title: 'Example',
								url: 'https://example.com',
							}),
						],
					}),
				}),
			);
			expect(parseSent(ws)).not.toHaveProperty('result.tabs.0.tabId');
		});
	});

	describe('forwardCDPCommand (lazy attach)', () => {
		it('should lazy-attach debugger on first CDP command', async () => {
			chrome.debugger.getTargets.mockResolvedValueOnce([mockTarget(123)]);
			await relay.registerSelectedTabs([123]);
			const tabId = relay.getControlledIds()[0].targetId;
			ws.sent.length = 0;
			chrome.debugger.sendCommand.mockResolvedValueOnce({ data: 'test-result' });

			ws.onmessage?.({
				data: JSON.stringify({
					id: 2,
					method: 'forwardCDPCommand',
					params: { method: 'Runtime.evaluate', params: { expression: '1+1' }, id: tabId },
				}),
			});
			await tick();

			expect(chrome.debugger.attach).toHaveBeenCalledTimes(1);
			expect(chrome.debugger.attach).toHaveBeenCalledWith({ tabId: 123 }, '1.3');
			expect(chrome.debugger.sendCommand).toHaveBeenCalledWith({ tabId: 123 }, 'Runtime.evaluate', {
				expression: '1+1',
			});
		});

		it('should not re-attach on subsequent commands', async () => {
			chrome.debugger.getTargets.mockResolvedValueOnce([mockTarget(123)]);
			await relay.registerSelectedTabs([123]);
			const tabId = relay.getControlledIds()[0].targetId;
			ws.sent.length = 0;
			chrome.debugger.sendCommand.mockResolvedValueOnce({ data: 'result' });

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

			expect(chrome.debugger.attach).toHaveBeenCalledTimes(1);
			expect(chrome.debugger.sendCommand).toHaveBeenCalledTimes(2);
		});

		it('should route CDP commands to specific tab by CDP targetId', async () => {
			chrome.debugger.getTargets.mockResolvedValueOnce([mockTarget(10), mockTarget(20)]);
			await relay.registerSelectedTabs([10, 20]);
			const ids = relay.getControlledIds();
			ws.sent.length = 0;
			chrome.debugger.sendCommand.mockResolvedValueOnce({ data: 'result' });

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

			expect(chrome.debugger.attach).toHaveBeenCalledWith({ tabId: 20 }, '1.3');
			expect(chrome.debugger.sendCommand).toHaveBeenCalledWith({ tabId: 20 }, 'Page.navigate', {
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

			expect(parseSent(ws)).toEqual(
				expect.objectContaining({ error: expect.stringContaining('No tab is connected') }),
			);
		});
	});

	describe('isAgentCreatedTab', () => {
		it('should return false for non-agent tabs', async () => {
			chrome.debugger.getTargets.mockResolvedValueOnce([mockTarget(42)]);
			await relay.registerSelectedTabs([42]);
			expect(relay.isAgentCreatedTab(42)).toBe(false);
		});

		it('should return true for agent-created tabs after createTab', async () => {
			relay.setSettings({ allowTabCreation: true, allowTabClosing: false });
			(globalThis.chrome.tabs.create as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
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
			expect(chrome.debugger.attach).toHaveBeenCalledWith({ tabId: 999 }, '1.3');

			// Response should have CDP targetId, not chromeTabId
			expect(parseSent(ws)).toEqual(
				expect.objectContaining({
					result: expect.objectContaining({ id: targetIdForTab(999) }),
				}),
			);
			expect(parseSent(ws)).not.toHaveProperty('result.tabId');
		});
	});

	it('should send error response for malformed JSON', async () => {
		ws.onmessage?.({ data: 'not-json' });
		await tick();

		expect(ws.sent).toHaveLength(1);
		expect(parseSent(ws)).toEqual(expect.objectContaining({ error: expect.anything() }));
	});

	it('should only detach attached debuggees on close', async () => {
		chrome.debugger.getTargets.mockResolvedValueOnce([mockTarget(42), mockTarget(43)]);
		await relay.registerSelectedTabs([42, 43]);
		const ids = relay.getControlledIds();
		chrome.debugger.sendCommand.mockResolvedValueOnce({});

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
		expect(chrome.debugger.onEvent.removeListener).toHaveBeenCalledTimes(1);
		expect(chrome.debugger.onDetach.removeListener).toHaveBeenCalledTimes(1);
		// Only detach the one that was attached (chromeTabId 42)
		expect(chrome.debugger.detach).toHaveBeenCalledTimes(1);
		expect(chrome.debugger.detach).toHaveBeenCalledWith({ tabId: 42 });
	});

	it('should forward debugger events with CDP targetId', async () => {
		chrome.debugger.getTargets.mockResolvedValueOnce([mockTarget(42)]);
		await relay.addTab(42, 'Test', 'https://test.com');
		ws.sent.length = 0;

		fireDebuggerEvent({ tabId: 42 }, 'Page.loadEventFired', { timestamp: 123 });

		expect(ws.sent).toHaveLength(1);
		expect(parseSent(ws)).toEqual(
			expect.objectContaining({
				method: 'forwardCDPEvent',
				params: expect.objectContaining({
					method: 'Page.loadEventFired',
					id: targetIdForTab(42),
				}),
			}),
		);
		expect(parseSent(ws)).not.toHaveProperty('params.tabId');
	});

	it('should ignore debugger events for uncontrolled tabs', async () => {
		chrome.debugger.getTargets.mockResolvedValueOnce([mockTarget(42)]);
		await relay.addTab(42, 'Test', 'https://test.com');
		ws.sent.length = 0;

		fireDebuggerEvent({ tabId: 99 }, 'Page.loadEventFired', {});

		expect(ws.sent).toHaveLength(0);
	});

	it('should remove tab on debugger detach and close if no tabs left', async () => {
		chrome.debugger.getTargets.mockResolvedValueOnce([mockTarget(42)]);
		await relay.addTab(42, 'Test', 'https://test.com');
		const onclose = vi.fn();
		relay.onclose = onclose;

		fireDebuggerDetach({ tabId: 42 }, 'target_closed');

		expect(relay.getControlledIds()).toEqual([]);
		expect(ws.closed).toBe(true);
		expect(onclose).toHaveBeenCalled();
	});

	it('should keep connection alive when one of multiple tabs detaches', async () => {
		chrome.debugger.getTargets.mockResolvedValue([mockTarget(42), mockTarget(43)]);
		await relay.addTab(42, 'A', 'https://a.com');
		await relay.addTab(43, 'B', 'https://b.com');

		fireDebuggerDetach({ tabId: 42 }, 'target_closed');

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

		expect(parseSent(ws)).toEqual(
			expect.objectContaining({ error: expect.stringContaining('Tab creation is disabled') }),
		);
	});

	it('should reject closeTab when tab closing is disabled', async () => {
		chrome.debugger.getTargets.mockResolvedValueOnce([mockTarget(42)]);
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

		expect(parseSent(ws)).toEqual(
			expect.objectContaining({ error: expect.stringContaining('Tab closing is disabled') }),
		);
	});

	describe('spawned tab helpers', () => {
		it('isControlledTab returns true for registered tabs', async () => {
			chrome.debugger.getTargets.mockResolvedValueOnce([mockTarget(10), mockTarget(20)]);
			await relay.registerSelectedTabs([10, 20]);
			expect(relay.isControlledTab(10)).toBe(true);
			expect(relay.isControlledTab(20)).toBe(true);
			expect(relay.isControlledTab(99)).toBe(false);
		});

		it('isControlledTab returns true for dynamically added tabs', async () => {
			chrome.debugger.getTargets.mockResolvedValueOnce([mockTarget(42)]);
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
			chrome.debugger.getTargets.mockResolvedValue([mockTarget(50), mockTarget(51)]);
			await relay.addTab(50, 'Spawned', 'https://spawned.com');
			relay.markAsAgentCreated(50);
			expect(relay.isAgentCreatedTab(50)).toBe(true);

			await relay.addTab(51, 'Other', 'https://other.com');
			relay.removeTab(50);
			expect(relay.isAgentCreatedTab(50)).toBe(false);
		});
	});

	// Helper: register a tab and force lazy-attach by sending a CDP command
	async function registerAndAttach(tabId: number) {
		chrome.debugger.getTargets.mockResolvedValueOnce([mockTarget(tabId)]);
		await relay.registerSelectedTabs([tabId]);
		ws.onmessage?.({
			data: JSON.stringify({
				id: 99,
				method: 'forwardCDPCommand',
				params: { method: 'Runtime.evaluate', params: {} },
			}),
		});
		await tick();
		ws.sent.length = 0;
		chrome.debugger.sendCommand.mockClear();
	}

	describe('restricted child target filtering', () => {
		it('should filter chrome-extension:// child targets and detach them', async () => {
			await registerAndAttach(42);

			fireDebuggerEvent({ tabId: 42 }, 'Target.attachedToTarget', {
				sessionId: 's1',
				targetInfo: { url: 'chrome-extension://abc/page.html' },
			});

			// Should not forward to relay
			expect(ws.sent).toHaveLength(0);
			// Should detach the restricted child
			expect(chrome.debugger.sendCommand).toHaveBeenCalledWith(
				{ tabId: 42 },
				'Target.detachFromTarget',
				{ sessionId: 's1' },
			);
		});

		it('should filter chrome:// child targets', async () => {
			await registerAndAttach(42);

			fireDebuggerEvent({ tabId: 42 }, 'Target.attachedToTarget', {
				sessionId: 's2',
				targetInfo: { url: 'chrome://settings' },
			});

			expect(ws.sent).toHaveLength(0);
			expect(chrome.debugger.sendCommand).toHaveBeenCalledWith(
				{ tabId: 42 },
				'Target.detachFromTarget',
				{ sessionId: 's2' },
			);
		});

		it('should forward normal child targets', async () => {
			await registerAndAttach(42);

			fireDebuggerEvent({ tabId: 42 }, 'Target.attachedToTarget', {
				sessionId: 's3',
				targetInfo: { url: 'https://example.com/iframe' },
			});

			expect(ws.sent).toHaveLength(1);

			expect(parseSent(ws)).toEqual(
				expect.objectContaining({
					method: 'forwardCDPEvent',
					params: expect.objectContaining({
						method: 'Target.attachedToTarget',
					}),
				}),
			);
		});
	});

	describe('Target.setAutoAttach caching', () => {
		it('should broadcast setAutoAttach to all attached tabs', async () => {
			// Register and attach two tabs
			chrome.debugger.getTargets.mockResolvedValueOnce([mockTarget(10), mockTarget(20)]);
			await relay.registerSelectedTabs([10, 20]);

			// Attach both via CDP commands
			ws.onmessage?.({
				data: JSON.stringify({
					id: 1,
					method: 'forwardCDPCommand',
					params: { method: 'Runtime.evaluate', params: {}, id: targetIdForTab(10) },
				}),
			});
			await tick();
			ws.onmessage?.({
				data: JSON.stringify({
					id: 2,
					method: 'forwardCDPCommand',
					params: { method: 'Runtime.evaluate', params: {}, id: targetIdForTab(20) },
				}),
			});
			await tick();
			chrome.debugger.sendCommand.mockClear();

			// Send root-level Target.setAutoAttach (no id param)
			const autoAttachParams = { autoAttach: true, waitForDebuggerOnStart: false, flatten: true };
			ws.onmessage?.({
				data: JSON.stringify({
					id: 3,
					method: 'forwardCDPCommand',
					params: { method: 'Target.setAutoAttach', params: autoAttachParams },
				}),
			});
			await tick();

			// Should be sent to both attached tabs
			const setAutoAttachCalls = chrome.debugger.sendCommand.mock.calls.filter(
				(c: unknown[]) => c[1] === 'Target.setAutoAttach',
			);
			expect(setAutoAttachCalls).toHaveLength(2);
			expect(setAutoAttachCalls[0][0]).toEqual({ tabId: 10 });
			expect(setAutoAttachCalls[1][0]).toEqual({ tabId: 20 });
		});

		it('should reapply cached autoAttach when lazily attaching a new tab', async () => {
			// Register one tab and send root-level setAutoAttach
			chrome.debugger.getTargets.mockResolvedValueOnce([mockTarget(10)]);
			await relay.registerSelectedTabs([10]);

			ws.onmessage?.({
				data: JSON.stringify({
					id: 1,
					method: 'forwardCDPCommand',
					params: { method: 'Runtime.evaluate', params: {} },
				}),
			});
			await tick();

			const autoAttachParams = { autoAttach: true, waitForDebuggerOnStart: false, flatten: true };
			ws.onmessage?.({
				data: JSON.stringify({
					id: 2,
					method: 'forwardCDPCommand',
					params: { method: 'Target.setAutoAttach', params: autoAttachParams },
				}),
			});
			await tick();

			// Now add a second tab and trigger lazy attach
			chrome.debugger.getTargets.mockResolvedValueOnce([mockTarget(20)]);
			await relay.addTab(20, 'New Tab', 'https://new.com');
			chrome.debugger.sendCommand.mockClear();

			ws.onmessage?.({
				data: JSON.stringify({
					id: 3,
					method: 'forwardCDPCommand',
					params: { method: 'DOM.getDocument', params: {}, id: targetIdForTab(20) },
				}),
			});
			await tick();

			// After attach, setAutoAttach should be reapplied to the new tab
			const setAutoAttachCalls = chrome.debugger.sendCommand.mock.calls.filter(
				(c: unknown[]) => c[1] === 'Target.setAutoAttach',
			);
			expect(setAutoAttachCalls).toHaveLength(1);
			expect(setAutoAttachCalls[0][0]).toEqual({ tabId: 20 });
			expect(setAutoAttachCalls[0][2]).toEqual(autoAttachParams);
		});
	});

	describe('Runtime.enable workaround', () => {
		it('should wait for executionContextCreated before resolving Runtime.enable', async () => {
			await registerAndAttach(42);

			// Send Runtime.enable — this registers a one-shot onEvent listener and
			// waits for executionContextCreated (with auxData.isDefault === true) before resolving.
			ws.onmessage?.({
				data: JSON.stringify({
					id: 1,
					method: 'forwardCDPCommand',
					params: { method: 'Runtime.enable', params: {} },
				}),
			});

			// Response should not be sent yet — waiting for the context event.
			await tick();

			expect(ws.sent.some((_, i) => (parseSent(ws, i) as { id: number }).id === 1)).toBe(false);

			// Fire the executionContextCreated event via the one-shot listener.
			// It is the last listener registered (after the constructor's permanent listener).
			const allListeners = chrome.debugger.onEvent.addListener.mock.calls;
			const oneShotListener = allListeners[allListeners.length - 1]?.[0] as
				| ((...args: unknown[]) => void)
				| undefined;
			oneShotListener?.({ tabId: 42 }, 'Runtime.executionContextCreated', {
				context: { auxData: { isDefault: true } },
			});

			await tick();

			const methods = chrome.debugger.sendCommand.mock.calls.map((c: unknown[]) => c[1]);
			// Runtime.disable must NOT be called — we use event-based waiting now
			expect(methods).not.toContain('Runtime.disable');
			expect(methods).toContain('Runtime.enable');
			// Response was sent after context confirmed
			expect(ws.sent.some((_, i) => (parseSent(ws, i) as { id: number }).id === 1)).toBe(true);
		});

		it('should resolve Runtime.enable after timeout if executionContextCreated never fires', async () => {
			await registerAndAttach(42);

			// Install fake timers before sending the message so the 3 000 ms
			// timeout inside contextReady is created under fake time control.
			vi.useFakeTimers();
			try {
				ws.onmessage?.({
					data: JSON.stringify({
						id: 2,
						method: 'forwardCDPCommand',
						params: { method: 'Runtime.enable', params: {} },
					}),
				});
				// Drain microtasks (sendCommand resolves immediately), then advance
				// past the 3 000 ms fallback timeout.
				await Promise.resolve();
				await vi.advanceTimersByTimeAsync(3_100);
			} finally {
				vi.useRealTimers();
			}

			const methods = chrome.debugger.sendCommand.mock.calls.map((c: unknown[]) => c[1]);
			expect(methods).not.toContain('Runtime.disable');
			expect(methods).toContain('Runtime.enable');
		});
	});

	describe('typed close reasons', () => {
		it('should close with extension_disconnected when last tab is removed', async () => {
			chrome.debugger.getTargets.mockResolvedValueOnce([mockTarget(42)]);
			await relay.addTab(42, 'Test', 'https://test.com');

			relay.removeTab(42);
			expect(ws.closeReason).toBe('extension_disconnected');
		});

		it('should close with debugger_detached when last tab debugger detaches', async () => {
			chrome.debugger.getTargets.mockResolvedValueOnce([mockTarget(42)]);
			await relay.addTab(42, 'Test', 'https://test.com');

			fireDebuggerDetach({ tabId: 42 }, 'target_closed');
			expect(ws.closeReason).toBe('debugger_detached');
		});

		it('should close with extension_disconnected when last tab is closed via closeTab', async () => {
			chrome.debugger.getTargets.mockResolvedValueOnce([mockTarget(42)]);
			await relay.addTab(42, 'Test', 'https://test.com');
			relay.setSettings({ allowTabCreation: true, allowTabClosing: true });
			ws.sent.length = 0;

			ws.onmessage?.({
				data: JSON.stringify({
					id: 1,
					method: 'closeTab',
					params: { id: targetIdForTab(42) },
				}),
			});
			await tick();

			expect(ws.closeReason).toBe('extension_disconnected');
		});
	});
});
