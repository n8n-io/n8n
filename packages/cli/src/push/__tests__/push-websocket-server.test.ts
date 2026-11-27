import type { Logger } from '@n8n/backend-common';
import { mockInstance } from '@n8n/backend-test-utils';
import express from 'express';
import { createServer, type Server as HttpServer } from 'node:http';
import type { Socket } from 'node:net';
import { mock } from 'vitest-mock-extended';
import { WebSocket } from 'ws';

import { Push } from '@/push';
import type { PushConfig } from '@/push/push.config';
import { isWebSocketPushRequest } from '@/push/push-helpers';
import { WebSocketPush } from '@/push/websocket.push';

vi.unmock('@/push');

describe('Push WebSocket server', () => {
	const logger = mock<Logger>();
	let server: HttpServer;
	let port: number;
	let onServerConnection: ((ws: WebSocket) => void) | undefined;

	const clients: WebSocket[] = [];
	const serverSockets: WebSocket[] = [];
	const rawSockets = new Set<Socket>();

	mockInstance(WebSocketPush);

	function connect(pushRef: string): { client: WebSocket; serverWsPromise: Promise<WebSocket> } {
		const serverWsPromise = new Promise<WebSocket>((resolve) => {
			onServerConnection = (ws) => {
				ws.on('error', () => {});
				serverSockets.push(ws);
				resolve(ws);
			};
		});

		const client = new WebSocket(`ws://127.0.0.1:${port}/rest/push?pushRef=${pushRef}`);
		client.on('error', () => {});
		clients.push(client);

		return { client, serverWsPromise };
	}

	async function openConnection(
		pushRef: string,
	): Promise<{ client: WebSocket; serverWs: WebSocket }> {
		const { client, serverWsPromise } = connect(pushRef);
		const [serverWs] = await Promise.all([
			serverWsPromise,
			new Promise<void>((resolve, reject) => {
				client.once('open', () => resolve());
				client.once('error', reject);
			}),
		]);

		return { client, serverWs };
	}

	async function applyBackpressure(client: WebSocket, serverWs: WebSocket): Promise<void> {
		client.pause();
		const fillChunk = Buffer.alloc(256 * 1024);

		for (let i = 0; i < 200 && serverWs.bufferedAmount === 0; i++) {
			serverWs.send(fillChunk);
			await new Promise<void>((resolve) => setImmediate(resolve));
		}

		expect(serverWs.bufferedAmount).toBeGreaterThan(0);
	}

	beforeAll(async () => {
		logger.scoped.mockReturnValue(logger);

		const app = express();
		app.use('/rest/push', (req, _res) => {
			if (isWebSocketPushRequest(req)) {
				onServerConnection?.(req.ws);
			}
		});

		server = createServer(app);
		server.on('connection', (socket) => {
			socket.on('error', () => {});
			rawSockets.add(socket);
			socket.on('close', () => rawSockets.delete(socket));
		});

		const push = new Push(
			mock<PushConfig>({ backend: 'websocket' }),
			mock(),
			logger,
			mock(),
			mock(),
		);
		push.setupPushServer('rest', server, app);

		await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));

		const address = server.address();
		if (!address || typeof address === 'string') {
			throw new Error('Expected HTTP server to listen on a TCP port');
		}
		port = address.port;
	});

	afterEach(() => {
		onServerConnection = undefined;
		for (const ws of clients.splice(0)) ws.terminate();
		for (const ws of serverSockets.splice(0)) ws.terminate();
	});

	afterAll(async () => {
		for (const socket of rawSockets) socket.destroy();
		await new Promise<void>((resolve) => server.close(() => resolve()));
	});

	it('responds with pong frames for ping frames on a healthy connection', async () => {
		const { client, serverWs } = await openConnection('healthy-client');
		const payload = Buffer.from('health-check');

		const pongData = await new Promise<Buffer>((resolve, reject) => {
			const timer = setTimeout(() => reject(new Error('Timed out waiting for pong')), 1000);
			client.once('pong', (data) => {
				clearTimeout(timer);
				resolve(data);
			});
			client.ping(payload);
		});

		expect(pongData.equals(payload)).toBe(true);
		expect(serverWs.readyState).toBe(WebSocket.OPEN);
	});

	it('keeps the connection open when pending automatic pongs stay within the limit', async () => {
		const { client, serverWs } = await openConnection('within-limit');
		await applyBackpressure(client, serverWs);

		const pingCount = 10;
		const pingPayload = Buffer.alloc(125, 0x70);
		let pingsReceived = 0;

		const allPingsReceived = new Promise<void>((resolve, reject) => {
			const timer = setTimeout(() => reject(new Error('Timed out waiting for pings')), 2000);
			serverWs.on('ping', () => {
				pingsReceived++;
				if (pingsReceived >= pingCount) {
					clearTimeout(timer);
					resolve();
				}
			});
		});

		for (let i = 0; i < pingCount; i++) {
			client.ping(pingPayload);
		}

		await allPingsReceived;
		await new Promise<void>((resolve) => setTimeout(resolve, 50));

		expect(pingsReceived).toBe(pingCount);
		expect(serverWs.readyState).toBe(WebSocket.OPEN);
	});

	// Regression test for IAM-1910: enforce bounded pending automatic pong frames on backpressured sockets.
	it('terminates the connection when pending automatic pongs exceed the limit under backpressure', async () => {
		const { client, serverWs } = await openConnection('backpressured-client');
		await applyBackpressure(client, serverWs);

		const pingCount = 100;
		const pingPayload = Buffer.alloc(125, 0x70);
		let pingsReceived = 0;

		const closed = await new Promise<boolean>((resolve) => {
			let graceTimer: ReturnType<typeof setTimeout> | undefined;
			const finish = (didClose: boolean) => {
				clearTimeout(hardTimeout);
				if (graceTimer) clearTimeout(graceTimer);
				resolve(didClose);
			};

			const hardTimeout = setTimeout(() => finish(false), 2000);

			serverWs.once('close', () => finish(true));
			serverWs.on('ping', () => {
				pingsReceived++;
				if (pingsReceived >= pingCount && !graceTimer) {
					graceTimer = setTimeout(() => finish(false), 150);
				}
			});

			for (let i = 0; i < pingCount; i++) {
				client.ping(pingPayload);
			}
		});

		expect(closed).toBe(true);
		expect(serverWs.readyState).toBe(WebSocket.CLOSED);
	});
});
