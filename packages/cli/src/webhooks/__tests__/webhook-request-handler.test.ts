import { type Response } from 'express';
import { type MockProxy, mock } from 'jest-mock-extended';
import {
	isFormHtmlSandboxingDisabled,
	isWebhookHtmlSandboxingDisabled,
	getHtmlSandboxCSP,
} from 'n8n-core';
import { OperationalError, randomString } from 'n8n-workflow';
import type { IHttpRequestMethods } from 'n8n-workflow';

import { ResponseError } from '@/errors/response-errors/abstract/response.error';
import { createWebhookHandlerFor } from '@/webhooks/webhook-request-handler';
import type {
	IWebhookManager,
	IWebhookResponseCallbackData,
	WebhookOptionsRequest,
	WebhookRequest,
} from '@/webhooks/webhook.types';

jest.mock('n8n-core', () => ({
	...jest.requireActual('n8n-core'),
	isWebhookHtmlSandboxingDisabled: jest.fn().mockReturnValue(false),
	isFormHtmlSandboxingDisabled: jest.fn().mockReturnValue(false),
	getHtmlSandboxCSP: jest.fn().mockReturnValue('sandbox allow-downloads allow-forms allow-modals'),
}));

describe('WebhookRequestHandler', () => {
	const webhookManager = mock<Required<IWebhookManager>>();
	const handler = createWebhookHandlerFor(webhookManager);

	beforeEach(() => {
		jest.resetAllMocks();
	});

	it('should throw for unsupported methods', async () => {
		const req = mock<WebhookRequest | WebhookOptionsRequest>({
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
			const req = mock<WebhookRequest | WebhookOptionsRequest>({
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
			const req = mock<WebhookRequest | WebhookOptionsRequest>({
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
			expect(res.header).toHaveBeenCalledWith('Access-Control-Allow-Origin', 'https://example.com');
			expect(res.header).toHaveBeenCalledWith('Access-Control-Max-Age', '300');
		});

		it('should handle wildcard origin', async () => {
			const randomOrigin = randomString(10);
			const req = mock<WebhookRequest | WebhookOptionsRequest>({
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
			const req = mock<WebhookRequest | WebhookOptionsRequest>({
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

	describe('webhook requests', () => {
		it('should delegate the request to the webhook manager and send the response', async () => {
			const req = mock<WebhookRequest>({
				method: 'GET',
				params: { path: 'test' },
			});

			const res = mock<Response>();

			const executeWebhookResponse: IWebhookResponseCallbackData = {
				responseCode: 200,
				data: {},
				headers: {
					'x-custom-header': 'test',
				},
			};
			webhookManager.executeWebhook.mockResolvedValueOnce(executeWebhookResponse);

			await handler(req, res);

			expect(webhookManager.executeWebhook).toHaveBeenCalledWith(req, res);
			expect(res.status).toHaveBeenCalledWith(200);
			expect(res.setHeaders).toHaveBeenCalledWith(new Map([['x-custom-header', 'test']]));
			expect(res.json).toHaveBeenCalledWith(executeWebhookResponse.data);
		});

		it('should send an error response if webhook execution throws', async () => {
			class TestError extends ResponseError {}
			const req = mock<WebhookRequest>({
				method: 'GET',
				params: { path: 'test' },
			});

			const res = mock<Response>();
			res.status.mockReturnValue(res);

			webhookManager.executeWebhook.mockRejectedValueOnce(
				new TestError('Test error', 500, 100, 'Test hint'),
			);

			await handler(req, res);

			expect(webhookManager.executeWebhook).toHaveBeenCalledWith(req, res);
			expect(res.status).toHaveBeenCalledWith(500);
			expect(res.json).toHaveBeenCalledWith({
				code: 100,
				message: 'Test error',
				hint: 'Test hint',
			});
		});

		it('should not throw when legacy response headers contain invalid names', async () => {
			const req = mock<WebhookRequest>({
				method: 'GET',
				params: { path: 'test' },
			});

			const res = mock<Response>();

			const executeWebhookResponse: IWebhookResponseCallbackData = {
				responseCode: 200,
				data: { ok: true },
				headers: {
					'<img src=x onerror=alert(1)>': 'xss',
					'x-valid': 'value',
				},
			};
			webhookManager.executeWebhook.mockResolvedValueOnce(executeWebhookResponse);

			await handler(req, res);

			expect(res.setHeaders).toHaveBeenCalledTimes(1);
			expect(res.setHeaders).toHaveBeenCalledWith(new Map([['x-valid', 'value']]));
			expect(res.json).toHaveBeenCalledWith(executeWebhookResponse.data);
		});

		it('should not allow user to override CSP via response headers', async () => {
			const req = mock<WebhookRequest>({
				method: 'GET',
				params: { path: 'test' },
			});

			const res = mock<Response>();

			const executeWebhookResponse: IWebhookResponseCallbackData = {
				responseCode: 200,
				data: { ok: true },
				headers: {
					'Content-Security-Policy': "default-src 'unsafe-inline'",
				},
			};
			webhookManager.executeWebhook.mockResolvedValueOnce(executeWebhookResponse);

			await handler(req, res);

			expect(res.setHeaders).not.toHaveBeenCalled();
			expect(res.setHeader).toHaveBeenCalledWith('Content-Security-Policy', getHtmlSandboxCSP());
		});

		test.each<IHttpRequestMethods>(['DELETE', 'GET', 'HEAD', 'PATCH', 'POST', 'PUT'])(
			"should handle '%s' method",
			async (method) => {
				const req = mock<WebhookRequest>({
					method,
					params: { path: 'test' },
				});

				const res = mock<Response>();

				const executeWebhookResponse: IWebhookResponseCallbackData = {
					responseCode: 200,
				};
				webhookManager.executeWebhook.mockResolvedValueOnce(executeWebhookResponse);

				await handler(req, res);

				expect(webhookManager.executeWebhook).toHaveBeenCalledWith(req, res);
				expect(res.status).toHaveBeenCalledWith(200);
				expect(res.json).toHaveBeenCalledWith(executeWebhookResponse.data);
			},
		);
	});

	describe('CSP sandbox header', () => {
		it('should set CSP sandbox header on all webhook responses', async () => {
			const req = mock<WebhookRequest>({
				method: 'GET',
				params: { path: 'test' },
			});

			const res = mock<Response>();

			const executeWebhookResponse: IWebhookResponseCallbackData = {
				responseCode: 200,
				data: {},
				headers: { 'content-type': 'image/svg+xml' },
			};
			webhookManager.executeWebhook.mockResolvedValueOnce(executeWebhookResponse);

			await handler(req, res);

			expect(res.setHeader).toHaveBeenCalledWith('Content-Security-Policy', getHtmlSandboxCSP());
		});

		it('should not set CSP sandbox header when sandboxing is disabled', async () => {
			jest.mocked(isWebhookHtmlSandboxingDisabled).mockReturnValue(true);

			const req = mock<WebhookRequest>({
				method: 'GET',
				params: { path: 'test' },
			});

			const res = mock<Response>();

			const executeWebhookResponse: IWebhookResponseCallbackData = {
				responseCode: 200,
				data: {},
				headers: { 'content-type': 'text/html' },
			};
			webhookManager.executeWebhook.mockResolvedValueOnce(executeWebhookResponse);

			await handler(req, res);

			expect(res.setHeader).not.toHaveBeenCalledWith(
				'Content-Security-Policy',
				getHtmlSandboxCSP(),
			);
		});

		describe('on every exit path', () => {
			const sandboxCSP = 'sandbox allow-scripts';

			const cspSetBefore = (res: MockProxy<Response>, writer: 'json' | 'send') => {
				const cspCall = res.setHeader.mock.calls.findIndex(
					([name]) => name === 'Content-Security-Policy',
				);
				expect(cspCall).not.toBe(-1);
				expect(res.setHeader.mock.calls[cspCall][1]).toBe(sandboxCSP);
				expect(res.setHeader.mock.invocationCallOrder[cspCall]).toBeLessThan(
					res[writer].mock.invocationCallOrder[0],
				);
			};

			beforeEach(() => {
				jest.mocked(getHtmlSandboxCSP).mockReturnValue(sandboxCSP);
			});

			it('should set the sandbox header before an error response is sent', async () => {
				const req = mock<WebhookRequest>({ path: '/', method: 'GET', params: { path: 'test' } });
				const res = mock<Response>();
				res.status.mockReturnValue(res);
				webhookManager.executeWebhook.mockRejectedValueOnce(new OperationalError('Test error'));

				await handler(req, res);

				expect(res.status).toHaveBeenCalledWith(500);
				cspSetBefore(res, 'json');
			});

			it('should set the sandbox header on a legacy response without headers', async () => {
				const req = mock<WebhookRequest>({ path: '/', method: 'GET', params: { path: 'test' } });
				const res = mock<Response>();
				// A node can pass a plain string body to `sendResponse()`, without a headers object.
				webhookManager.executeWebhook.mockResolvedValueOnce({
					responseCode: 200,
					data: '<p>text</p>',
				} as unknown as IWebhookResponseCallbackData);

				await handler(req, res);

				expect(res.send).toHaveBeenCalledWith('<p>text</p>');
				cspSetBefore(res, 'send');
			});

			it('should set the sandbox header for an unsupported method', async () => {
				const req = mock<WebhookRequest>({
					path: '/',
					method: 'CONNECT' as IHttpRequestMethods,
				});
				const res = mock<Response>();
				res.status.mockReturnValue(res);

				await handler(req, res);

				cspSetBefore(res, 'json');
			});

			it('should set the sandbox header when the node writes the response', async () => {
				const req = mock<WebhookRequest>({ path: '/', method: 'GET', params: { path: 'test' } });
				const res = mock<Response>();
				webhookManager.executeWebhook.mockImplementationOnce(async (_req, response) => {
					response.send('<p>text</p>');
					return { noWebhookResponse: true };
				});

				await handler(req, res);

				cspSetBefore(res, 'send');
			});
		});

		describe('sandbox setting of the route', () => {
			it('should follow the form setting on a form route', async () => {
				jest.mocked(isFormHtmlSandboxingDisabled).mockReturnValue(true);
				jest.mocked(isWebhookHtmlSandboxingDisabled).mockReturnValue(false);
				jest.mocked(getHtmlSandboxCSP).mockReturnValue('sandbox allow-scripts');
				const formHandler = createWebhookHandlerFor(webhookManager, 'form');

				const req = mock<WebhookRequest>({ path: '/', method: 'GET', params: { path: 'test' } });
				const res = mock<Response>();
				webhookManager.executeWebhook.mockResolvedValueOnce({ noWebhookResponse: true });

				await formHandler(req, res);

				expect(res.setHeader).not.toHaveBeenCalledWith(
					'Content-Security-Policy',
					'sandbox allow-scripts',
				);
			});

			it('should not sandbox a form response when only form sandboxing is disabled', async () => {
				jest.mocked(isFormHtmlSandboxingDisabled).mockReturnValue(true);
				jest.mocked(isWebhookHtmlSandboxingDisabled).mockReturnValue(false);
				jest.mocked(getHtmlSandboxCSP).mockReturnValue('sandbox allow-scripts');
				const formHandler = createWebhookHandlerFor(webhookManager, 'form');

				const req = mock<WebhookRequest>({ path: '/', method: 'GET', params: { path: 'test' } });
				const res = mock<Response>();
				webhookManager.executeWebhook.mockResolvedValueOnce({
					responseCode: 200,
					data: '<p>text</p>',
					headers: { 'content-type': 'text/html' },
				} as unknown as IWebhookResponseCallbackData);

				await formHandler(req, res);

				expect(res.setHeaders).toHaveBeenCalled();
				expect(res.setHeader).not.toHaveBeenCalledWith(
					'Content-Security-Policy',
					'sandbox allow-scripts',
				);
				expect(res.send).toHaveBeenCalledWith('<p>text</p>');
			});

			it('should keep the form sandbox on a form response when webhook sandboxing is disabled', async () => {
				jest.mocked(isFormHtmlSandboxingDisabled).mockReturnValue(false);
				jest.mocked(isWebhookHtmlSandboxingDisabled).mockReturnValue(true);
				jest.mocked(getHtmlSandboxCSP).mockReturnValue('sandbox allow-scripts');
				const formHandler = createWebhookHandlerFor(webhookManager, 'form');

				const req = mock<WebhookRequest>({ path: '/', method: 'GET', params: { path: 'test' } });
				const res = mock<Response>();
				webhookManager.executeWebhook.mockResolvedValueOnce({
					responseCode: 200,
					data: { ok: true },
					headers: { 'content-type': 'text/html' },
				});

				await formHandler(req, res);

				expect(res.setHeader).toHaveBeenCalledWith(
					'Content-Security-Policy',
					'sandbox allow-scripts',
				);
				expect(res.removeHeader).not.toHaveBeenCalled();
				expect(res.json).toHaveBeenCalledWith({ ok: true });
			});

			it('should follow the webhook setting on other routes', async () => {
				jest.mocked(isFormHtmlSandboxingDisabled).mockReturnValue(true);
				jest.mocked(isWebhookHtmlSandboxingDisabled).mockReturnValue(false);
				jest.mocked(getHtmlSandboxCSP).mockReturnValue('sandbox allow-scripts');

				const req = mock<WebhookRequest>({ path: '/', method: 'GET', params: { path: 'test' } });
				const res = mock<Response>();
				webhookManager.executeWebhook.mockResolvedValueOnce({ noWebhookResponse: true });

				await handler(req, res);

				expect(res.setHeader).toHaveBeenCalledWith(
					'Content-Security-Policy',
					'sandbox allow-scripts',
				);
			});
		});
	});
});
