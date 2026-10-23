import { Logger } from '@n8n/backend-common';
import { mockInstance } from '@n8n/backend-test-utils';
import { GlobalConfig } from '@n8n/config';
import { DbConnection } from '@n8n/db';
import { Container } from '@n8n/di';
import type express from 'express';
import type * as http from 'node:http';
import { mock } from 'vitest-mock-extended';

import { ChatServer } from '@/chat/chat-server';
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

	it('should mount diagnostics only during E2E tests', async () => {
		const webhookServer = new WebhookServer();

		await webhookServer.configure();
		expect(mockApp.use).not.toHaveBeenCalled();

		e2eFlags.inE2ETests = true;
		await webhookServer.configure();
		expect(mockApp.use).toHaveBeenCalledWith('/rest/e2e', diagnosticsRouter);
	});
});
