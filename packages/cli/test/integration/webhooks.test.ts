import { GlobalConfig } from '@n8n/config';
import { Container } from '@n8n/di';
import { mock } from 'jest-mock-extended';
import { agent as testAgent } from 'supertest';
import type SuperAgentTest from 'supertest/lib/agent';

import { ExternalHooks } from '@/external-hooks';
import { LiveWebhooks } from '@/webhooks/live-webhooks';
import { TestWebhooks } from '@/webhooks/test-webhooks';
import { WaitingForms } from '@/webhooks/waiting-forms';
import { WaitingWebhooks } from '@/webhooks/waiting-webhooks';
import { WebhookServer } from '@/webhooks/webhook-server';
import type { IWebhookResponseCallbackData } from '@/webhooks/webhook.types';
import { mockInstance } from '@test/mocking';

let agent: SuperAgentTest;

describe('WebhookServer', () => {
	mockInstance(ExternalHooks);

	describe('CORS', () => {
		const corsOrigin = 'https://example.com';
		const liveWebhooks = mockInstance(LiveWebhooks);
		const testWebhooks = mockInstance(TestWebhooks);
		mockInstance(WaitingWebhooks);
		mockInstance(WaitingForms);

		beforeAll(async () => {
			const server = new WebhookServer();
			// @ts-expect-error: testWebhooksEnabled is private
			server.testWebhooksEnabled = true;
			await server.start();
			agent = testAgent(server.app);
		});

		const tests = [
			['webhook', liveWebhooks],
			['webhookTest', testWebhooks],
			// TODO: enable webhookWaiting & waitingForms after CORS support is added
			// ['webhookWaiting', waitingWebhooks],
			// ['formWaiting', waitingForms],
		] as const;

		for (const [key, manager] of tests) {
			describe(`for ${key}`, () => {
				it('should handle preflight requests', async () => {
					const pathPrefix = Container.get(GlobalConfig).endpoints[key];
					manager.getWebhookMethods.mockResolvedValueOnce(['GET']);

					const response = await agent
						.options(`/${pathPrefix}/abcd`)
						.set('origin', corsOrigin)
						.set('access-control-request-method', 'GET');
					expect(response.statusCode).toEqual(204);
					expect(response.body).toEqual({});
					expect(response.headers['access-control-allow-origin']).toEqual(corsOrigin);
					expect(response.headers['access-control-allow-methods']).toEqual('OPTIONS, GET');
				});

				it('should handle regular requests', async () => {
					const pathPrefix = Container.get(GlobalConfig).endpoints[key];
					manager.getWebhookMethods.mockResolvedValueOnce(['GET']);
					manager.executeWebhook.mockResolvedValueOnce(
						mockResponse({ test: true }, { key: 'value ' }),
					);

					const response = await agent
						.get(`/${pathPrefix}/abcd`)
						.set('origin', corsOrigin)
						.set('access-control-request-method', 'GET');
					expect(response.statusCode).toEqual(200);
					expect(response.body).toEqual({ test: true });
					expect(response.headers['access-control-allow-origin']).toEqual(corsOrigin);
					expect(response.headers.key).toEqual('value');
				});
			});
		}

		const mockResponse = (data = {}, headers = {}, status = 200) => {
			const response = mock<IWebhookResponseCallbackData>();
			response.responseCode = status;
			response.data = data;
			response.headers = headers;
			return response;
		};
	});
});
