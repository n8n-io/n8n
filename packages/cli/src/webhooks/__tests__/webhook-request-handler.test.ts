import { Logger } from '@n8n/backend-common';
import { mockInstance } from '@n8n/backend-test-utils';
import { type Response } from 'express';
import {
	isFormHtmlSandboxingDisabled,
	isWebhookHtmlSandboxingDisabled,
	getHtmlSandboxCSP,
} from 'n8n-core';
import { OperationalError, randomString } from 'n8n-workflow';
import type { IHttpRequestMethods } from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

import { ResponseError } from '@n8n/errors';
import { createWebhookHandlerFor } from '@/webhooks/webhook-request-handler';
import type {
	IWebhookManager,
	IWebhookResponseCallbackData,
	WebhookOptionsRequest,
	WebhookRequest,
} from '@/webhooks/webhook.types';

vi.mock('n8n-core', async () => ({
	...(await vi.importActual<typeof import('n8n-core')>('n8n-core')),
	isWebhookHtmlSandboxingDisabled: vi.fn().mockReturnValue(false),
	isFormHtmlSandboxingDisabled: vi.fn().mockReturnValue(false),
	getHtmlSandboxCSP: vi.fn().mockReturnValue('sandbox allow-downloads allow-forms allow-modals'),
}));

describe('WebhookRequestHandler', () => {
	const logger = mockInstance(Logger);
	const webhookManager = mock<Required<IWebhookManager>>();
	const handler = createWebhookHandlerFor(webhookManager) as (
		req: WebhookRequest | WebhookOptionsRequest,
		res: Response,
	) => Promise<void>;

	beforeEach(() => {
		vi.resetAllMocks();
	});

	it('should throw for unsupported methods', async () => {
		const req = mock<WebhookRequest | WebhookOptionsRequest>({
			path: '/',
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
				path: '/',
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
				path: '/',
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
				path: '/',
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
				path: '/',
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
				path: '/',
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

			expect(webhookManager.executeWebhook).toHaveBeenCalledWith(req, res, undefined);
			expect(res.status).toHaveBeenCalledWith(200);
			expect(res.setHeaders).toHaveBeenCalledWith(new Map([['x-custom-header', 'test']]));
			expect(res.json).toHaveBeenCalledWith(executeWebhookResponse.data);
		});

		it('should not look up the webhook methods for a non-preflight request', async () => {
			const req = mock<WebhookRequest>({
				path: '/',
				method: 'GET',
				headers: { origin: 'https://example.com' },
				params: { path: 'test' },
			});
			const res = mock<Response>();
			res.status.mockReturnValue(res);
			webhookManager.executeWebhook.mockResolvedValueOnce({
				responseCode: 200,
				data: {},
				headers: {},
			});

			await handler(req, res);

			expect(webhookManager.getWebhookMethods).not.toHaveBeenCalled();
			expect(res.header).not.toHaveBeenCalledWith(
				'Access-Control-Allow-Methods',
				expect.anything(),
			);
			expect(res.status).toHaveBeenCalledWith(200);
		});

		it('should send an error response if webhook execution throws', async () => {
			class TestError extends ResponseError {}
			const req = mock<WebhookRequest>({
				path: '/',
				method: 'GET',
				params: { path: 'test' },
			});

			const res = mock<Response>();
			res.status.mockReturnValue(res);

			webhookManager.executeWebhook.mockRejectedValueOnce(
				new TestError('Test error', 500, 100, 'Test hint'),
			);

			await handler(req, res);

			expect(webhookManager.executeWebhook).toHaveBeenCalledWith(req, res, undefined);
			expect(res.status).toHaveBeenCalledWith(500);
			expect(res.json).toHaveBeenCalledWith({
				code: 100,
				message: 'Test error',
				hint: 'Test hint',
			});
		});

		it('should log the underlying error cause when execution fails', async () => {
			const req = mock<WebhookRequest>({
				path: '/webhook/abc',
				method: 'GET',
				params: { path: 'abc' },
			});

			const res = mock<Response>();
			res.status.mockReturnValue(res);

			const rootCause = new Error('SQLITE_BUSY: database is locked');
			const wrapper = new OperationalError('There was a problem executing the workflow', {
				cause: rootCause,
			});

			webhookManager.executeWebhook.mockRejectedValueOnce(wrapper);

			await handler(req, res);

			expect(logger.error).toHaveBeenCalledWith(
				'Error in handling webhook request GET /webhook/abc: There was a problem executing the workflow',
				expect.objectContaining({ error: wrapper }),
			);
		});

		it('should not throw when legacy response headers contain invalid names', async () => {
			const req = mock<WebhookRequest>({
				path: '/',
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
				path: '/',
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
					path: '/',
					method,
					params: { path: 'test' },
				});

				const res = mock<Response>();

				const executeWebhookResponse: IWebhookResponseCallbackData = {
					responseCode: 200,
				};
				webhookManager.executeWebhook.mockResolvedValueOnce(executeWebhookResponse);

				await handler(req, res);

				expect(webhookManager.executeWebhook).toHaveBeenCalledWith(req, res, undefined);
				expect(res.status).toHaveBeenCalledWith(200);
				expect(res.json).toHaveBeenCalledWith(executeWebhookResponse.data);
			},
		);
	});

	describe('CSP sandbox header', () => {
		it('should set CSP sandbox header on all webhook responses', async () => {
			const req = mock<WebhookRequest>({
				path: '/',
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
			vi.mocked(isWebhookHtmlSandboxingDisabled).mockReturnValue(true);

			const req = mock<WebhookRequest>({
				path: '/',
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

			const cspSetBefore = (res: ReturnType<typeof mock<Response>>, writer: 'json' | 'send') => {
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
				vi.mocked(getHtmlSandboxCSP).mockReturnValue(sandboxCSP);
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
			const formHandlers = [
				['a form route', createWebhookHandlerFor(webhookManager, 'form')],
				[
					'a route that selects the form setting',
					createWebhookHandlerFor(webhookManager, undefined, 'form'),
				],
			] as const;

			test.each(formHandlers)('should follow the form setting on %s', async (_, formHandler) => {
				vi.mocked(isFormHtmlSandboxingDisabled).mockReturnValue(true);
				vi.mocked(isWebhookHtmlSandboxingDisabled).mockReturnValue(false);
				vi.mocked(getHtmlSandboxCSP).mockReturnValue('sandbox allow-scripts');

				const req = mock<WebhookRequest>({ path: '/', method: 'GET', params: { path: 'test' } });
				const res = mock<Response>();
				webhookManager.executeWebhook.mockResolvedValueOnce({ noWebhookResponse: true });

				await (formHandler as typeof handler)(req, res);

				expect(res.setHeader).not.toHaveBeenCalledWith(
					'Content-Security-Policy',
					'sandbox allow-scripts',
				);
			});

			it('should not sandbox a form response when only form sandboxing is disabled', async () => {
				vi.mocked(isFormHtmlSandboxingDisabled).mockReturnValue(true);
				vi.mocked(isWebhookHtmlSandboxingDisabled).mockReturnValue(false);
				vi.mocked(getHtmlSandboxCSP).mockReturnValue('sandbox allow-scripts');
				const formHandler = createWebhookHandlerFor(webhookManager, 'form') as typeof handler;

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
				vi.mocked(isFormHtmlSandboxingDisabled).mockReturnValue(false);
				vi.mocked(isWebhookHtmlSandboxingDisabled).mockReturnValue(true);
				vi.mocked(getHtmlSandboxCSP).mockReturnValue('sandbox allow-scripts');
				const formHandler = createWebhookHandlerFor(webhookManager, 'form') as typeof handler;

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
				vi.mocked(isFormHtmlSandboxingDisabled).mockReturnValue(true);
				vi.mocked(isWebhookHtmlSandboxingDisabled).mockReturnValue(false);
				vi.mocked(getHtmlSandboxCSP).mockReturnValue('sandbox allow-scripts');

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
