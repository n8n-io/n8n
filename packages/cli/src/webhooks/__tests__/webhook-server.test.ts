import { Logger } from '@n8n/backend-common';
import { mockInstance } from '@n8n/backend-test-utils';
import { GlobalConfig } from '@n8n/config';
import { DbConnection } from '@n8n/db';
import { Container } from '@n8n/di';
import type express from 'express';
import type * as http from 'node:http';
import { createServer } from 'node:http';
import { connect, type AddressInfo } from 'node:net';
import { mock } from 'vitest-mock-extended';

import { ChatServer } from '@/chat/chat-server';
import type { ChatService } from '@/chat/chat-service';
import { WebhookServer } from '@/webhooks/webhook-server';

const mockApp = mock<express.Application>();
const e2eFlags = vi.hoisted(() => ({ inE2ETests: false }));
const diagnosticsRouter = vi.hoisted(() => vi.fn());
vi.mock('express', async () => ({ __esModule: true, default: () => mockApp }));
vi.mock('@/constants', async (importOriginal) => ({
	...(await importOriginal<typeof import('@/constants')>()),
	get inE2ETests() {
		return e2eFlags.inE2ETests;
	},
}));
vi.mock('@/services/e2e-diagnostics.router', () => ({
	createE2EDiagnosticsRouter: vi.fn(() => diagnosticsRouter),
}));

describe('WebhookServer', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		e2eFlags.inE2ETests = false;
		mockInstance(Logger);
		Container.set(DbConnection, mock<DbConnection>());
		Container.set(
			GlobalConfig,
			mock<GlobalConfig>({
				path: '/',
				protocol: 'http',
				port: 5678,
				listen_address: '0.0.0.0',
				proxy_hops: 0,
				ssl_key: '',
				ssl_cert: '',
				endpoints: {
					rest: 'rest',
					form: 'form',
					formTest: 'form-test',
					formWaiting: 'form-waiting',
					webhook: 'webhook',
					webhookTest: 'webhook-test',
					webhookWaiting: 'webhook-waiting',
					mcp: 'mcp',
					mcpTest: 'mcp-test',
					health: '/healthz',
				},
			}),
		);
	});

	it('should mount the chat WebSocket server', () => {
		const chatServer = mockInstance(ChatServer);

		const webhookServer = new WebhookServer();
		const httpServer = mock<http.Server>();
		Object.assign(webhookServer, { server: httpServer });

		webhookServer['setupPushServer']();

		expect(chatServer.setup).toHaveBeenCalledWith(httpServer, mockApp);
	});

	it('should reject an upgrade request on a path that chat does not serve', async () => {
		const chatServer = mockInstance(ChatServer);
		chatServer.isWebSocketPath.mockReturnValue(false);
		const webhookServer = new WebhookServer();
		const httpServer = createServer();
		Object.assign(webhookServer, { server: httpServer });
		webhookServer['setupPushServer']();
		await new Promise<void>((resolve) => httpServer.listen(0, '127.0.0.1', resolve));
		const { port } = httpServer.address() as AddressInfo;

		const reply = await new Promise<string>((resolve) => {
			const client = connect(port, '127.0.0.1');
			let received = '';
			client.on('data', (chunk: Buffer) => {
				received += chunk.toString('latin1');
			});
			client.on('close', () => resolve(received));
			client.write(
				'GET /healthz HTTP/1.1\r\nHost: localhost\r\nUpgrade: websocket\r\nConnection: Upgrade\r\n\r\n',
			);
		});
		httpServer.close();

		expect(reply).toBe('HTTP/1.1 404 Not Found\r\n\r\n');
	});

	it('should upgrade a chat request', async () => {
		Container.set(ChatServer, new ChatServer(mock<ChatService>()));
		const webhookServer = new WebhookServer();
		const httpServer = createServer();
		Object.assign(webhookServer, { server: httpServer });
		webhookServer['setupPushServer']();
		await new Promise<void>((resolve) => httpServer.listen(0, '127.0.0.1', resolve));
		const { port } = httpServer.address() as AddressInfo;

		const statusLine = await new Promise<string>((resolve) => {
			const client = connect(port, '127.0.0.1');
			client.on('data', (chunk: Buffer) => {
				resolve(chunk.toString('latin1').split('\r\n')[0]);
				client.destroy();
			});
			client.write(
				'GET /chat HTTP/1.1\r\nHost: localhost\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==\r\nSec-WebSocket-Version: 13\r\n\r\n',
			);
		});
		httpServer.close();

		expect(statusLine).toBe('HTTP/1.1 101 Switching Protocols');
	});

	it('should mount diagnostics only during E2E tests', async () => {
		const webhookServer = new WebhookServer();

		await webhookServer.configure();
		expect(mockApp.use).not.toHaveBeenCalled();

		e2eFlags.inE2ETests = true;
		await webhookServer.configure();
		expect(mockApp.use).toHaveBeenCalledWith('/rest/e2e', diagnosticsRouter);
	});
});
