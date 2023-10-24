import type { SuperAgentTest } from 'supertest';
import { agent as testAgent } from 'supertest';
import { mock } from 'jest-mock-extended';

import config from '@/config';
import { AbstractServer } from '@/AbstractServer';
import { ActiveWorkflowRunner } from '@/ActiveWorkflowRunner';
import { ExternalHooks } from '@/ExternalHooks';
import { InternalHooks } from '@/InternalHooks';
import { TestWebhooks } from '@/TestWebhooks';
import { WaitingWebhooks } from '@/WaitingWebhooks';
import type { IResponseCallbackData } from '@/Interfaces';

import { mockInstance } from '../shared/mocking';

let agent: SuperAgentTest;

describe('WebhookServer', () => {
	mockInstance(ExternalHooks);
	mockInstance(InternalHooks);

	describe('CORS', () => {
		const corsOrigin = 'https://example.com';
		const activeWorkflowRunner = mockInstance(ActiveWorkflowRunner);
		const testWebhooks = mockInstance(TestWebhooks);
		mockInstance(WaitingWebhooks);

		beforeAll(async () => {
			const server = new (class extends AbstractServer {
				testWebhooksEnabled = true;
			})();
			await server.start();
			agent = testAgent(server.app);
		});

		const tests = [
			['webhook', activeWorkflowRunner],
			['webhookTest', testWebhooks],
			// TODO: enable webhookWaiting after CORS support is added
			// ['webhookWaiting', waitingWebhooks],
		] as const;

		for (const [key, manager] of tests) {
			describe(`for ${key}`, () => {
				it('should handle preflight requests', async () => {
					const pathPrefix = config.getEnv(`endpoints.${key}`);
					manager.getWebhookMethods.mockReturnValueOnce(['GET']);

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
					const pathPrefix = config.getEnv(`endpoints.${key}`);
					manager.getWebhookMethods.mockReturnValueOnce(['GET']);
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
			const response = mock<IResponseCallbackData>();
			response.responseCode = status;
			response.data = data;
			response.headers = headers;
			return response;
		};
	});
});
