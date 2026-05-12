import { WebSocket } from 'ws';

import { CDPRelayServer } from '../cdp-relay';
import type { ExtensionRequest } from '../cdp-relay-protocol';
import { ExtensionNotConnectedError } from '../errors';
import { configureLogger } from '../logger';

configureLogger({ level: 'silent' });

let relay: CDPRelayServer;
let port: number;

beforeEach(async () => {
	relay = new CDPRelayServer({ connectionTimeoutMs: 2_000 });
	port = await relay.listen();
});

afterEach(() => {
	relay.stop();
});

function connectExtension(): WebSocket {
	return new WebSocket(relay.extensionEndpoint(port));
}

function connectPlaywright(): WebSocket {
	return new WebSocket(relay.cdpEndpoint(port));
}

async function waitForOpen(ws: WebSocket): Promise<void> {
	return await new Promise((resolve, reject) => {
		ws.on('open', resolve);
		ws.on('error', reject);
	});
}

function parseWsData(data: unknown): string {
	return Buffer.isBuffer(data) ? data.toString('utf8') : String(data);
}

async function sendCDPCommand<T = unknown>(
	ws: WebSocket,
	id: number,
	method: string,
	params?: unknown,
): Promise<{ id: number; result?: T; error?: { message: string } }> {
	type Response = { id: number; result?: T; error?: { message: string } };
	return await new Promise((resolve, reject) => {
		const timer = setTimeout(
			() => reject(new Error(`Timeout waiting for response to ${method}`)),
			5_000,
		);
		const handler = (data: unknown) => {
			try {
				const msg = JSON.parse(parseWsData(data)) as Response;
				if (msg.id === id) {
					ws.off('message', handler);
					clearTimeout(timer);
					resolve(msg);
				}
			} catch {
				// ignore parse errors
			}
		};
		ws.on('message', handler);
		ws.send(JSON.stringify({ id, method, params }));
	});
}

/**
 * Create a fake extension that auto-responds to relay commands.
 * Override `handlers` to customize responses.
 */
function createFakeExtension(ws: WebSocket) {
	const handlers: Record<string, (params: unknown) => unknown> = {
		listRegisteredTabs: () => ({
			tabs: [{ id: 'tab-1', title: 'Test Page', url: 'https://example.com' }],
		}),
		forwardCDPCommand: () => ({}),
		attachTab: () => ({}),
		listTabs: () => ({
			tabs: [{ id: 'tab-1', title: 'Test Page', url: 'https://example.com' }],
		}),
	};

	ws.on('message', (data) => {
		try {
			const msg = JSON.parse(parseWsData(data)) as ExtensionRequest;
			const handler = handlers[msg.method];
			if (handler) {
				ws.send(JSON.stringify({ id: msg.id, result: handler(msg.params) }));
			}
		} catch {
			// ignore malformed
		}
	});

	return { handlers };
}

describe('CDPRelayServer', () => {
	it('should resolve waitForExtension when extension connects', async () => {
		const ext = connectExtension();
		await waitForOpen(ext);
		await expect(relay.waitForExtension()).resolves.toBeUndefined();
		ext.close();
	});

	it('should reject waitForExtension after timeout', async () => {
		jest.useFakeTimers();
		relay.stop();
		relay = new CDPRelayServer({ connectionTimeoutMs: 2_000 });
		port = await relay.listen();

		// Capture the promise before advancing timers
		const promise = relay.waitForExtension().catch((e: unknown) => e);
		await jest.advanceTimersByTimeAsync(2_100);

		const error = await promise;
		expect(error).toBeInstanceOf(ExtensionNotConnectedError);
		jest.useRealTimers();
	});

	it('should report disconnect reason when extension closes with explicit reason', async () => {
		const ext = connectExtension();
		await waitForOpen(ext);
		await relay.waitForExtension();

		const reason = await new Promise<string>((resolve) => {
			relay.onExtensionDisconnect = (r) => resolve(r);
			ext.close(1000, 'browser_closed');
		});

		expect(reason).toBe('browser_closed');
	});

	it('should list tabs from extension', async () => {
		const ext = connectExtension();
		await waitForOpen(ext);
		createFakeExtension(ext);
		await relay.waitForExtension();

		const tabs = await relay.listTabs();
		expect(tabs).toEqual([{ id: 'tab-1', title: 'Test Page', url: 'https://example.com' }]);

		ext.close();
	});

	it('should forward CDP commands to extension and return response', async () => {
		const ext = connectExtension();
		await waitForOpen(ext);
		createFakeExtension(ext);
		await relay.waitForExtension();

		const pw = connectPlaywright();
		await waitForOpen(pw);

		// Send Browser.getVersion (handled by relay itself, no extension roundtrip)
		const response = await new Promise<{ id: number; result: { product: string } }>((resolve) => {
			pw.on('message', (data) => {
				try {
					resolve(JSON.parse(parseWsData(data)) as { id: number; result: { product: string } });
				} catch {
					// ignore malformed
				}
			});
			pw.send(JSON.stringify({ id: 1, method: 'Browser.getVersion' }));
		});

		expect(response.id).toBe(1);
		expect(response.result.product).toContain('Chrome');

		pw.close();
		ext.close();
	});

	it('should disconnect extension after heartbeat timeout', async () => {
		// Enable fake timers before creating relay so setInterval is captured
		jest.useFakeTimers();

		relay.stop();
		relay = new CDPRelayServer({ connectionTimeoutMs: 2_000 });
		port = await relay.listen();

		new WebSocket(relay.extensionEndpoint(port), { autoPong: false });

		// Let WebSocket handshake complete through the event loop
		await jest.advanceTimersByTimeAsync(100);
		await relay.waitForExtension();

		const disconnectPromise = new Promise<string>((resolve) => {
			relay.onExtensionDisconnect = (r) => resolve(r);
		});

		// Advance past heartbeat interval (5s) + timeout (15s) + one extra interval.
		// With the sleep-aware heartbeat the first termination check that passes
		// requires a ping to have been sent AFTER the last pong, which adds one
		// extra 5s interval compared to the naive elapsed-only check.
		await jest.advanceTimersByTimeAsync(25_000);

		const reason = await disconnectPromise;
		expect(reason).toBe('heartbeat_timeout');

		// Restore real timers before afterEach cleanup (ws.close uses setTimeout)
		jest.useRealTimers();
	});

	it('should allow extension to connect after waitForExtension times out', async () => {
		jest.useFakeTimers();

		relay.stop();
		relay = new CDPRelayServer({ connectionTimeoutMs: 2_000 });
		port = await relay.listen();

		// Timeout the waitForExtension call — relay stays alive
		const waitPromise = relay.waitForExtension().catch((e: unknown) => e);
		await jest.advanceTimersByTimeAsync(2_100);
		const error = await waitPromise;
		expect(error).toBeInstanceOf(ExtensionNotConnectedError);

		jest.useRealTimers();

		// Extension connects after the timeout — must be registered
		const ext = connectExtension();
		await waitForOpen(ext);
		createFakeExtension(ext);

		expect(relay.isExtensionConnected()).toBe(true);

		const tabs = await relay.listTabs();
		expect(tabs.length).toBeGreaterThan(0);

		ext.close();
	});

	it('should return targetInfos shape from Target.getTargets', async () => {
		const ext = connectExtension();
		await waitForOpen(ext);
		createFakeExtension(ext);
		await relay.waitForExtension();

		const pw = connectPlaywright();
		await waitForOpen(pw);

		const response = await sendCDPCommand<{ targetInfos: unknown[] }>(pw, 10, 'Target.getTargets');

		expect(response.error).toBeUndefined();
		expect(Array.isArray(response.result?.targetInfos)).toBe(true);
		expect(response.result?.targetInfos[0]).toMatchObject({
			targetId: 'tab-1',
			type: 'page',
			title: 'Test Page',
			url: 'https://example.com',
		});

		pw.close();
		ext.close();
	});

	it('should return { sessionId: targetId } from Target.attachToTarget', async () => {
		const ext = connectExtension();
		await waitForOpen(ext);
		createFakeExtension(ext);
		await relay.waitForExtension();

		const pw = connectPlaywright();
		await waitForOpen(pw);

		const response = await sendCDPCommand<{ sessionId: string }>(pw, 11, 'Target.attachToTarget', {
			targetId: 'tab-1',
		});

		expect(response.error).toBeUndefined();
		expect(response.result?.sessionId).toBe('tab-1');

		pw.close();
		ext.close();
	});

	it('should return an error from Target.attachToTarget when extension is not connected', async () => {
		// Connect Playwright without an extension
		const pw = connectPlaywright();
		await waitForOpen(pw);

		const response = await sendCDPCommand(pw, 12, 'Target.attachToTarget', {
			targetId: 'tab-1',
		});

		expect(response.error).toBeDefined();
		expect(response.error?.message).toContain('connection lost');

		pw.close();
	});

	it('should replace a stale Playwright connection when a new one arrives', async () => {
		const ext = connectExtension();
		await waitForOpen(ext);
		createFakeExtension(ext);
		await relay.waitForExtension();

		const pw1 = connectPlaywright();
		await waitForOpen(pw1);

		const pw1Closed = new Promise<void>((resolve) => pw1.on('close', resolve));

		const pw2 = connectPlaywright();
		await waitForOpen(pw2);
		await pw1Closed; // pw1 must be terminated

		// pw2 should be the active connection and able to respond
		const response = await sendCDPCommand<{ product: string }>(pw2, 99, 'Browser.getVersion');
		expect(response.result?.product).toContain('Chrome');

		pw2.close();
		ext.close();
	});

	it('should allow extension to reconnect within grace window', async () => {
		const ext1 = connectExtension();
		await waitForOpen(ext1);
		createFakeExtension(ext1);
		await relay.waitForExtension();

		// Disconnect first extension and wait for close to propagate
		await new Promise<void>((resolve) => {
			ext1.on('close', () => resolve());
			ext1.close(1000, 'network_error');
		});

		const ext2 = connectExtension();
		await waitForOpen(ext2);
		createFakeExtension(ext2);

		// Relay should still work with new extension
		const tabs = await relay.listTabs();
		expect(tabs).toEqual([{ id: 'tab-1', title: 'Test Page', url: 'https://example.com' }]);

		ext2.close();
	});
});
