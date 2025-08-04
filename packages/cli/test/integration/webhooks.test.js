'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
const backend_test_utils_1 = require('@n8n/backend-test-utils');
const config_1 = require('@n8n/config');
const di_1 = require('@n8n/di');
const jest_mock_extended_1 = require('jest-mock-extended');
const supertest_1 = require('supertest');
const external_hooks_1 = require('@/external-hooks');
const live_webhooks_1 = require('@/webhooks/live-webhooks');
const test_webhooks_1 = require('@/webhooks/test-webhooks');
const waiting_forms_1 = require('@/webhooks/waiting-forms');
const waiting_webhooks_1 = require('@/webhooks/waiting-webhooks');
const webhook_server_1 = require('@/webhooks/webhook-server');
let agent;
describe('WebhookServer', () => {
	const liveWebhooks = (0, backend_test_utils_1.mockInstance)(live_webhooks_1.LiveWebhooks);
	const testWebhooks = (0, backend_test_utils_1.mockInstance)(test_webhooks_1.TestWebhooks);
	const waitingWebhooks = (0, backend_test_utils_1.mockInstance)(
		waiting_webhooks_1.WaitingWebhooks,
	);
	(0, backend_test_utils_1.mockInstance)(waiting_forms_1.WaitingForms);
	(0, backend_test_utils_1.mockInstance)(external_hooks_1.ExternalHooks);
	const globalConfig = di_1.Container.get(config_1.GlobalConfig);
	const mockResponse = (data = {}, headers = {}, status = 200) => {
		const response = (0, jest_mock_extended_1.mock)();
		response.responseCode = status;
		response.data = data;
		response.headers = headers;
		return response;
	};
	beforeAll(async () => {
		const server = new webhook_server_1.WebhookServer();
		server.testWebhooksEnabled = true;
		await server.start();
		agent = (0, supertest_1.agent)(server.app);
	});
	describe('CORS', () => {
		const corsOrigin = 'https://example.com';
		const tests = [
			['webhook', liveWebhooks],
			['webhookTest', testWebhooks],
		];
		for (const [key, manager] of tests) {
			describe(`for ${key}`, () => {
				const pathPrefix = globalConfig.endpoints[key];
				it('should handle preflight requests', async () => {
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
	});
	describe('Routing for Waiting Webhooks', () => {
		const pathPrefix = globalConfig.endpoints.webhookWaiting;
		waitingWebhooks.executeWebhook.mockImplementation(async (req) => {
			return {
				noWebhookResponse: false,
				responseCode: 200,
				data: {
					params: req.params,
				},
			};
		});
		it('should handle URLs without suffix', async () => {
			const response = await agent.get(`/${pathPrefix}/12345`);
			expect(response.statusCode).toEqual(200);
			expect(response.body).toEqual({
				params: { path: '12345' },
			});
		});
		it('should handle URLs with suffix', async () => {
			const response = await agent.get(`/${pathPrefix}/12345/suffix`);
			expect(response.statusCode).toEqual(200);
			expect(response.body).toEqual({
				params: { path: '12345', suffix: 'suffix' },
			});
		});
	});
});
//# sourceMappingURL=webhooks.test.js.map
