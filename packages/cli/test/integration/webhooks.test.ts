import { mockInstance } from '@n8n/backend-test-utils';
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

let agent: SuperAgentTest;

describe('WebhookServer', () => {
	const liveWebhooks = mockInstance(LiveWebhooks);
	const testWebhooks = mockInstance(TestWebhooks);
	const waitingWebhooks = mockInstance(WaitingWebhooks);
	mockInstance(WaitingForms);
	mockInstance(ExternalHooks);
	const globalConfig = Container.get(GlobalConfig);

	const mockResponse = (data = {}, headers = {}, status = 200) => {
		const response = mock<IWebhookResponseCallbackData>();
		response.responseCode = status;
		response.data = data;
		response.headers = headers;
		return response;
	};

	beforeAll(async () => {
		const server = new WebhookServer();
		// @ts-expect-error: testWebhooksEnabled is private
		server.testWebhooksEnabled = true;
		await server.start();
		agent = testAgent(server.app);
	});

	describe('CORS', () => {
		const corsOrigin = 'https://example.com';
		const tests = [
			['webhook', liveWebhooks],
			['webhookTest', testWebhooks],
			['webhookWaiting', waitingWebhooks],
			['formWaiting', Container.get(WaitingForms)],
		] as const;

		for (const [key, manager] of tests) {
			describe(`for ${key}`, () => {
				const pathPrefix = globalConfig.endpoints[key];

				it('should handle preflight requests', async () => {
					if (manager.getWebhookMethods) {
						manager.getWebhookMethods.mockResolvedValueOnce(['GET']);
					}
					if (manager.findAccessControlOptions) {
						manager.findAccessControlOptions.mockResolvedValueOnce({
							allowedOrigins: '*',
						});
					}

					const response = await agent
						.options(`/${pathPrefix}/abcd`)
						.set('origin', corsOrigin)
						.set('access-control-request-method', 'GET');
					expect(response.statusCode).toEqual(204);
					expect(response.body).toEqual({});
					expect(response.headers['access-control-allow-origin']).toEqual(corsOrigin);
					if (manager.getWebhookMethods) {
						expect(response.headers['access-control-allow-methods']).toEqual('OPTIONS, GET');
					}
				});

				it('should handle regular requests', async () => {
					if (manager.getWebhookMethods) {
						manager.getWebhookMethods.mockResolvedValueOnce(['GET']);
					}
					if (manager.findAccessControlOptions) {
						manager.findAccessControlOptions.mockResolvedValueOnce({
							allowedOrigins: '*',
						});
					}
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

				it('should handle preflight requests with null origin', async () => {
					if (manager.getWebhookMethods) {
						manager.getWebhookMethods.mockResolvedValueOnce(['POST']);
					}
					if (manager.findAccessControlOptions) {
						manager.findAccessControlOptions.mockResolvedValueOnce({
							allowedOrigins: '*',
						});
					}

					const response = await agent
						.options(`/${pathPrefix}/abcd`)
						.set('origin', 'null')
						.set('access-control-request-method', 'POST');
					expect(response.statusCode).toEqual(204);
					expect(response.body).toEqual({});
					expect(response.headers['access-control-allow-origin']).toEqual('*');
				});

				it('should handle preflight requests without origin header', async () => {
					if (manager.getWebhookMethods) {
						manager.getWebhookMethods.mockResolvedValueOnce(['POST']);
					}
					if (manager.findAccessControlOptions) {
						manager.findAccessControlOptions.mockResolvedValueOnce({
							allowedOrigins: '*',
						});
					}

					const response = await agent
						.options(`/${pathPrefix}/abcd`)
						.set('access-control-request-method', 'POST');
					expect(response.statusCode).toEqual(204);
					expect(response.body).toEqual({});
					expect(response.headers['access-control-allow-origin']).toEqual('*');
				});
			});
		}
	});

	describe('CORS Preflight Regression Tests for Waiting Webhooks', () => {
		const pathPrefix = globalConfig.endpoints.webhookWaiting;

		describe('Original bug reproduction: null origin + JSON POST', () => {
			beforeEach(() => {
				// Mock the new resolveMethods interface (IWebhookMethodResolver)
				if ('resolveMethods' in waitingWebhooks) {
					(waitingWebhooks as any).resolveMethods = jest.fn().mockResolvedValue(['POST']);
				}
				// Fallback to legacy getWebhookMethods for backward compatibility
				if (waitingWebhooks.getWebhookMethods) {
					waitingWebhooks.getWebhookMethods.mockResolvedValue(['POST']);
				}
				waitingWebhooks.findAccessControlOptions.mockResolvedValue({
					allowedOrigins: '*',
				});
			});

			it('should handle OPTIONS preflight before execution starts (execution not found)', async () => {
				// Simulate preflight request before execution exists
				if ('resolveMethods' in waitingWebhooks) {
					(waitingWebhooks as any).resolveMethods = jest.fn().mockResolvedValue([]);
				}
				if (waitingWebhooks.getWebhookMethods) {
					waitingWebhooks.getWebhookMethods.mockResolvedValue([]);
				}

				const response = await agent
					.options(`/${pathPrefix}/nonexistent-exec-id`)
					.set('origin', 'null')
					.set('access-control-request-method', 'POST')
					.set('access-control-request-headers', 'Content-Type');

				// Preflight should succeed even if execution doesn't exist
				expect(response.statusCode).toEqual(204);
				expect(response.headers['access-control-allow-origin']).toEqual('*');
				expect(response.headers['access-control-max-age']).toEqual('300');
			});

			it('should handle OPTIONS preflight while execution is waiting', async () => {
				if ('resolveMethods' in waitingWebhooks) {
					(waitingWebhooks as any).resolveMethods = jest.fn().mockResolvedValue(['POST']);
				}
				if (waitingWebhooks.getWebhookMethods) {
					waitingWebhooks.getWebhookMethods.mockResolvedValue(['POST']);
				}
				waitingWebhooks.executeWebhook.mockResolvedValueOnce({
					noWebhookResponse: false,
					responseCode: 200,
					data: { message: 'resumed' },
				});

				const response = await agent
					.options(`/${pathPrefix}/waiting-exec-id`)
					.set('origin', 'null')
					.set('access-control-request-method', 'POST')
					.set('access-control-request-headers', 'Content-Type');

				expect(response.statusCode).toEqual(204);
				expect(response.headers['access-control-allow-origin']).toEqual('*');
				expect(response.headers['access-control-allow-methods']).toEqual('OPTIONS, POST');
				expect(response.headers['access-control-allow-headers']).toEqual('Content-Type');
				expect(response.headers['access-control-max-age']).toEqual('300');
			});

			it('should handle OPTIONS preflight after execution finishes gracefully', async () => {
				// Execution finished - resolveMethods returns empty array
				if ('resolveMethods' in waitingWebhooks) {
					(waitingWebhooks as any).resolveMethods = jest.fn().mockResolvedValue([]);
				}
				if (waitingWebhooks.getWebhookMethods) {
					waitingWebhooks.getWebhookMethods.mockResolvedValue([]);
				}

				const response = await agent
					.options(`/${pathPrefix}/finished-exec-id`)
					.set('origin', 'null')
					.set('access-control-request-method', 'POST')
					.set('access-control-request-headers', 'Content-Type');

				// Preflight should still succeed (empty methods is valid)
				expect(response.statusCode).toEqual(204);
				expect(response.headers['access-control-allow-origin']).toEqual('*');
				expect(response.headers['access-control-max-age']).toEqual('300');
			});

			it('should reproduce original browser failure scenario: null origin + JSON POST', async () => {
				// This test reproduces the exact scenario from the GitHub issue:
				// - Browser from file:// URL (origin: null)
				// - POST request with Content-Type: application/json
				// - Browser sends OPTIONS preflight first
				//
				// Before the fix: OPTIONS request would fail with "No 'Access-Control-Allow-Origin' header"
				// After the fix: OPTIONS request succeeds with proper CORS headers, allowing POST to proceed

				if ('resolveMethods' in waitingWebhooks) {
					(waitingWebhooks as any).resolveMethods = jest.fn().mockResolvedValue(['POST']);
				}
				if (waitingWebhooks.getWebhookMethods) {
					waitingWebhooks.getWebhookMethods.mockResolvedValue(['POST']);
				}
				waitingWebhooks.executeWebhook.mockResolvedValueOnce({
					noWebhookResponse: false,
					responseCode: 200,
					data: { received: true },
				});

				// Step 1: Browser sends OPTIONS preflight
				const preflightResponse = await agent
					.options(`/${pathPrefix}/exec-123`)
					.set('origin', 'null')
					.set('access-control-request-method', 'POST')
					.set('access-control-request-headers', 'Content-Type');

				// Preflight MUST succeed with proper CORS headers
				expect(preflightResponse.statusCode).toEqual(204);
				expect(preflightResponse.headers['access-control-allow-origin']).toEqual('*');
				expect(preflightResponse.headers['access-control-allow-methods']).toEqual('OPTIONS, POST');
				expect(preflightResponse.headers['access-control-allow-headers']).toEqual('Content-Type');

				// Step 2: Browser sends actual POST request (simulated)
				const postResponse = await agent
					.post(`/${pathPrefix}/exec-123`)
					.set('origin', 'null')
					.set('Content-Type', 'application/json')
					.send({ message: 'hello' });

				// POST should succeed after successful preflight
				expect(postResponse.statusCode).toEqual(200);
				expect(postResponse.headers['access-control-allow-origin']).toEqual('*');
			});
		});
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
