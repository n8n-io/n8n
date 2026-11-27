import { ModuleRegistry, type Logger } from '@n8n/backend-common';
import { mockInstance } from '@n8n/backend-test-utils';
import { DbConnection, type AuthenticatedRequest, type User } from '@n8n/db';
import { Container } from '@n8n/di';
import type { NextFunction, Response } from 'express';
import { createServer, type Server } from 'node:http';
import { connect, type AddressInfo, type Socket } from 'node:net';
import { mock } from 'vitest-mock-extended';

import type { AuthService } from '@/auth/auth.service';
import { ChatServer } from '@/chat/chat-server';
import type { ChatService } from '@/chat/chat-service';
import { BrowserUseServer } from '@/modules/instance-ai/browser/browser-use-server';
import type { InstanceAiBrowserSessionService } from '@/modules/instance-ai/browser/instance-ai-browser-session.service';
import { Push } from '@/push';
import type { PushConfig } from '@/push/push.config';
import { WebSocketPush } from '@/push/websocket.push';
import { Server as MainServer } from '@/server';

vi.unmock('@/push');

const SWITCHING_PROTOCOLS = 'HTTP/1.1 101 Switching Protocols';
const REPLY_TIMEOUT_MS = 2_000;
const OPEN_GRACE_MS = 100;
const HANDSHAKE_HEADERS = [
	'Host: localhost',
	'Upgrade: websocket',
	'Connection: Upgrade',
	'Sec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==',
	'Sec-WebSocket-Version: 13',
].join('\r\n');

const CLAIMED_PATHS = [
	'/rest/push?pushRef=abc',
	'/chat?sessionId=s&executionId=1',
	'/browser-use/extension/s1',
	'/browser-use/cdp/s1',
	'/browser-use/extension/s1/',
	'http://localhost/rest/push?pushRef=abc',
	'http://localhost/chat?sessionId=s&executionId=1',
	'http://localhost/browser-use/extension/s1',
	'/rest/push?pushRef=abc#a',
	'/chat#x',
];

const UPGRADED: UpgradeOutcome = {
	status: SWITCHING_PROTOCOLS,
	afterHeaders: '',
	closedByServer: false,
};
const REJECTED: UpgradeOutcome = {
	status: 'HTTP/1.1 404 Not Found',
	afterHeaders: '',
	closedByServer: true,
};

const UNCLAIMED_PATHS = [
	'/healthz',
	'/',
	'/rest/pushx',
	'/rest\\push',
	'/chat-hub/x',
	'/chat/abc',
	'/chatfoo',
	'/browser-use/x',
	'/browser-use/extension',
	'/browser-use/extension/a/b',
	'/browser-use/x/../extension/abc',
	'/browser-use/x/%2e%2e/extension/abc',
	'/browser-use/extension/abc/.',
	'/BROWSER-USE/extension/s1',
	'/browser-use\\extension\\abc',
	'/browser-use/extension/a\\b#',
	'/browser-use/extension/a\\b?x#',
	'http://[/x',
	'http://localhost/healthz',
];

interface UpgradeOutcome {
	status: string;
	/** Bytes after the response headers, such as a WebSocket close frame. */
	afterHeaders: string;
	closedByServer: boolean;
}

function signedInAuthService(): AuthService {
	const authService = mock<AuthService>();
	authService.createAuthMiddleware.mockReturnValue(
		async (req: AuthenticatedRequest, _res: Response, next: NextFunction) => {
			req.user = mock<User>({ id: 'user-id' });
			next();
		},
	);
	return authService;
}

/** The main server with real push, chat and browser-use handlers, and their services mocked. */
function createMainServer(): Server {
	mockInstance(WebSocketPush);
	mockInstance(DbConnection);
	mockInstance(ModuleRegistry).isActive.mockReturnValue(true);
	const logger = mock<Logger>();
	logger.scoped.mockReturnValue(logger);
	const push = new Push(
		mock<PushConfig>({ backend: 'websocket' }),
		mock(),
		logger,
		signedInAuthService(),
		mock(),
	);
	Container.set(Push, push);
	Container.set(ChatServer, new ChatServer(mock<ChatService>()));
	Container.set(BrowserUseServer, new BrowserUseServer(mock<InstanceAiBrowserSessionService>()));
	const mainServer = new MainServer(mock(), mock(), mock(), mock());
	const server = createServer(mainServer.app);
	Object.assign(mainServer, { server });
	push.setupPushHandler('rest', mainServer.app);
	mainServer['setupPushServer']();
	return server;
}

describe('WebSocket upgrade routing', () => {
	let server: Server;
	let port: number;
	const serverSockets = new Set<Socket>();
	const clients: Socket[] = [];

	/** Settles when the server closes the socket, a grace period after a `101`, or on the timeout. */
	async function sendUpgrade(path: string): Promise<UpgradeOutcome> {
		const client = connect(port, '127.0.0.1');
		clients.push(client);
		let reply = '';
		return await new Promise<UpgradeOutcome>((resolve) => {
			const settle = (closedByServer: boolean): void => {
				clearTimeout(timeout);
				const headersEnd = reply.indexOf('\r\n\r\n');
				resolve({
					status: reply.split('\r\n')[0],
					afterHeaders: headersEnd === -1 ? '' : reply.slice(headersEnd + 4),
					closedByServer,
				});
			};
			let timeout = setTimeout(() => settle(false), REPLY_TIMEOUT_MS);
			client.on('data', (chunk: Buffer) => {
				reply += chunk.toString('latin1');
				if (reply.startsWith(`${SWITCHING_PROTOCOLS}\r\n`)) {
					clearTimeout(timeout);
					timeout = setTimeout(() => settle(false), OPEN_GRACE_MS);
				}
			});
			client.on('close', () => settle(true));
			client.on('error', () => {});
			client.write(`GET ${path} HTTP/1.1\r\n${HANDSHAKE_HEADERS}\r\n\r\n`);
		});
	}

	beforeAll(async () => {
		server = createMainServer();
		server.on('connection', (socket) => {
			serverSockets.add(socket);
			socket.on('close', () => serverSockets.delete(socket));
		});
		await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
		port = (server.address() as AddressInfo).port;
	});

	afterEach(() => {
		for (const client of clients.splice(0)) client.destroy();
	});

	afterAll(async () => {
		for (const socket of serverSockets) socket.destroy();
		await new Promise<void>((resolve) => server.close(() => resolve()));
	});

	it.each(CLAIMED_PATHS)('upgrades claimed path %s and keeps the WebSocket open', async (path) => {
		expect(await sendUpgrade(path)).toEqual(UPGRADED);
	});

	it.each(UNCLAIMED_PATHS)(
		'rejects unclaimed upgrade path %s with 404 and closes the socket',
		async (path) => {
			expect(await sendUpgrade(path)).toEqual(REJECTED);
		},
	);
});
