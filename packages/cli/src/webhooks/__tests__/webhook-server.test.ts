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
vi.mock('express', async () => ({ __esModule: true, default: () => mockApp }));

describe('WebhookServer', () => {
	it('should mount the chat WebSocket server', () => {
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
		const chatServer = mockInstance(ChatServer);

		const webhookServer = new WebhookServer();
		const httpServer = mock<http.Server>();
		Object.assign(webhookServer, { server: httpServer });

		webhookServer['setupPushServer']();

		expect(chatServer.setup).toHaveBeenCalledWith(httpServer, mockApp);
	});
});
