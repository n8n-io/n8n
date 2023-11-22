import { type Response } from 'express';
import { mock } from 'jest-mock-extended';
import type { IHttpRequestMethods } from 'n8n-workflow';
import type { IWebhookManager, WebhookCORSRequest, WebhookRequest } from '@/Interfaces';
import { webhookRequestHandler } from '@/WebhookHelpers';

describe('WebhookHelpers', () => {
	describe('webhookRequestHandler', () => {
		const webhookManager = mock<Required<IWebhookManager>>();
		const handler = webhookRequestHandler(webhookManager);

		beforeEach(() => {
			jest.resetAllMocks();
		});

		it('should throw for unsupported methods', async () => {
			const req = mock<WebhookRequest | WebhookCORSRequest>({
				method: 'CONNECT' as IHttpRequestMethods,
			});
			const res = mock<Response>();
			res.status.mockReturnValue(res);

			await handler(req, res);

			expect(res.status).toHaveBeenCalledWith(500);
			expect(res.json).toHaveBeenCalledWith({
				code: 0,
				message: 'The method CONNECT is not supported.',
			});
		});

		describe('preflight requests', () => {
			it('should handle missing header for requested method', async () => {
				const req = mock<WebhookRequest | WebhookCORSRequest>({
					method: 'OPTIONS',
					headers: {
						origin: 'https://example.com',
						'access-control-request-method': undefined,
					},
					params: { path: 'test' },
				});
				const res = mock<Response>();
				res.status.mockReturnValue(res);

				webhookManager.getWebhookMethods.mockResolvedValue(['GET', 'PATCH']);

				await handler(req, res);

				expect(res.status).toHaveBeenCalledWith(204);
				expect(res.header).toHaveBeenCalledWith(
					'Access-Control-Allow-Methods',
					'OPTIONS, GET, PATCH',
				);
			});

			it('should handle default origin and max-age', async () => {
				const req = mock<WebhookRequest | WebhookCORSRequest>({
					method: 'OPTIONS',
					headers: {
						origin: 'https://example.com',
						'access-control-request-method': 'GET',
					},
					params: { path: 'test' },
				});
				const res = mock<Response>();
				res.status.mockReturnValue(res);

				webhookManager.getWebhookMethods.mockResolvedValue(['GET', 'PATCH']);

				await handler(req, res);

				expect(res.status).toHaveBeenCalledWith(204);
				expect(res.header).toHaveBeenCalledWith(
					'Access-Control-Allow-Methods',
					'OPTIONS, GET, PATCH',
				);
				expect(res.header).toHaveBeenCalledWith(
					'Access-Control-Allow-Origin',
					'https://example.com',
				);
				expect(res.header).toHaveBeenCalledWith('Access-Control-Max-Age', '300');
			});

			it('should handle wildcard origin', async () => {
				const randomOrigin = (Math.random() * 10e6).toString(16);
				const req = mock<WebhookRequest | WebhookCORSRequest>({
					method: 'OPTIONS',
					headers: {
						origin: randomOrigin,
						'access-control-request-method': 'GET',
					},
					params: { path: 'test' },
				});
				const res = mock<Response>();
				res.status.mockReturnValue(res);

				webhookManager.getWebhookMethods.mockResolvedValue(['GET', 'PATCH']);
				webhookManager.findAccessControlOptions.mockResolvedValue({
					allowedOrigins: '*',
				});

				await handler(req, res);

				expect(res.status).toHaveBeenCalledWith(204);
				expect(res.header).toHaveBeenCalledWith(
					'Access-Control-Allow-Methods',
					'OPTIONS, GET, PATCH',
				);
				expect(res.header).toHaveBeenCalledWith('Access-Control-Allow-Origin', randomOrigin);
			});

			it('should handle custom origin', async () => {
				const req = mock<WebhookRequest | WebhookCORSRequest>({
					method: 'OPTIONS',
					headers: {
						origin: 'https://example.com',
						'access-control-request-method': 'GET',
					},
					params: { path: 'test' },
				});
				const res = mock<Response>();
				res.status.mockReturnValue(res);

				webhookManager.getWebhookMethods.mockResolvedValue(['GET', 'PATCH']);
				webhookManager.findAccessControlOptions.mockResolvedValue({
					allowedOrigins: 'https://test.com',
				});

				await handler(req, res);

				expect(res.status).toHaveBeenCalledWith(204);
				expect(res.header).toHaveBeenCalledWith(
					'Access-Control-Allow-Methods',
					'OPTIONS, GET, PATCH',
				);
				expect(res.header).toHaveBeenCalledWith('Access-Control-Allow-Origin', 'https://test.com');
			});
		});
	});
});
