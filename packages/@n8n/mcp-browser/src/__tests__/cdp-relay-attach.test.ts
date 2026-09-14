import http from 'node:http';
import type { AddressInfo } from 'node:net';
import { WebSocket, WebSocketServer } from 'ws';

import { CDPRelayServer } from '../cdp-relay';
import { configureLogger } from '../logger';

configureLogger({ level: 'silent' });

let relay: CDPRelayServer;
let httpServer: http.Server;
let wss: WebSocketServer;
let port: number;

beforeEach(async () => {
	relay = new CDPRelayServer({ noServer: true, connectionTimeoutMs: 2_000 });
	httpServer = http.createServer();
	wss = new WebSocketServer({ server: httpServer });
	wss.on('connection', (ws, req) => {
		if ((req.url ?? '').includes('extension')) {
			relay.attachExtension(ws);
		} else {
			relay.attachController(ws);
		}
	});
	port = await new Promise((resolve) =>
		httpServer.listen(0, '127.0.0.1', () => resolve((httpServer.address() as AddressInfo).port)),
	);
});

afterEach(async () => {
	relay.stop();
	await new Promise<void>((resolve) => wss.close(() => resolve()));
	await new Promise<void>((resolve) => httpServer.close(() => resolve()));
});

async function waitForOpen(ws: WebSocket): Promise<void> {
	return await new Promise((resolve, reject) => {
		ws.on('open', resolve);
		ws.on('error', reject);
	});
}

function parseWsData(data: unknown): string {
	return Buffer.isBuffer(data) ? data.toString('utf8') : String(data);
}

describe('CDPRelayServer embedded attach', () => {
	it('attachExtension resolves waitForExtension and fires onExtensionConnect', async () => {
		const connected = new Promise<void>((resolve) => {
			relay.onExtensionConnect = () => resolve();
		});

		const ext = new WebSocket(`ws://127.0.0.1:${port}/extension/x`);
		await waitForOpen(ext);

		await expect(relay.waitForExtension()).resolves.toBeUndefined();
		await connected;
		expect(relay.isExtensionConnected()).toBe(true);

		ext.close();
	});

	it('attachController wires the CDP client so commands are processed', async () => {
		const pw = new WebSocket(`ws://127.0.0.1:${port}/cdp/x`);
		await waitForOpen(pw);

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
	});

	it('does not own an internal HTTP server in noServer mode', async () => {
		await expect(relay.listen()).rejects.toThrow(/noServer/);
	});
});
