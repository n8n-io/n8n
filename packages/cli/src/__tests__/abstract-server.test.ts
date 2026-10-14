import { Logger } from '@n8n/backend-common';
import { mockInstance } from '@n8n/backend-test-utils';
import { GlobalConfig } from '@n8n/config';
import { DbConnection } from '@n8n/db';
import { Container } from '@n8n/di';
import type express from 'express';
import { mock } from 'jest-mock-extended';

import { AbstractServer } from '@/abstract-server';
import { LiveWebhooks } from '@/webhooks/live-webhooks';
import { TestWebhooks } from '@/webhooks/test-webhooks';
import { WaitingForms } from '@/webhooks/waiting-forms';
import { WaitingWebhooks } from '@/webhooks/waiting-webhooks';

jest.mock('@/webhooks/webhook-request-handler', () => ({
	createWebhookHandlerFor: jest.fn((manager: unknown, sandboxSetting = 'webhook') => ({
		manager,
		sandboxSetting,
	})),
}));

const mockApp = mock<express.Application>();

jest.mock('express', () => ({ __esModule: true, default: () => mockApp }));

class TestServer extends AbstractServer {
	protected testWebhooksEnabled = true;
}

describe('AbstractServer webhook route registration', () => {
	const liveWebhooks = mock<LiveWebhooks>();
	const testWebhooks = mock<TestWebhooks>();
	const waitingForms = mock<WaitingForms>();
	const waitingWebhooks = mock<WaitingWebhooks>();

	beforeEach(() => {
		jest.clearAllMocks();
		mockInstance(Logger);
		Container.set(DbConnection, mock<DbConnection>());
		Container.set(
			GlobalConfig,
			mock<GlobalConfig>({
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
				},
			}),
		);
		Container.set(LiveWebhooks, liveWebhooks);
		Container.set(TestWebhooks, testWebhooks);
		Container.set(WaitingForms, waitingForms);
		Container.set(WaitingWebhooks, waitingWebhooks);
	});

	const handlerFor = (path: string) =>
		(mockApp.all.mock.calls as unknown as Array<[string, unknown]>).find(([p]) => p === path)?.[1];

	it('should give form routes the form sandbox setting', async () => {
		await new TestServer().start();

		expect(handlerFor('/form/*path')).toEqual({ manager: liveWebhooks, sandboxSetting: 'form' });
		expect(handlerFor('/form-test/*path')).toEqual({
			manager: testWebhooks,
			sandboxSetting: 'form',
		});
		expect(handlerFor('/form-waiting/:path{/:suffix}')).toEqual({
			manager: waitingForms,
			sandboxSetting: 'form',
		});
	});

	it('should give every other webhook route the webhook sandbox setting', async () => {
		await new TestServer().start();

		expect(handlerFor('/webhook/*path')).toEqual({
			manager: liveWebhooks,
			sandboxSetting: 'webhook',
		});
		expect(handlerFor('/webhook-test/*path')).toEqual({
			manager: testWebhooks,
			sandboxSetting: 'webhook',
		});
		expect(handlerFor('/webhook-waiting/:path{/:suffix}')).toEqual({
			manager: waitingWebhooks,
			sandboxSetting: 'webhook',
		});
		expect(handlerFor('/mcp/*path')).toEqual({ manager: liveWebhooks, sandboxSetting: 'webhook' });
		expect(handlerFor('/mcp-test/*path')).toEqual({
			manager: testWebhooks,
			sandboxSetting: 'webhook',
		});
	});
});
