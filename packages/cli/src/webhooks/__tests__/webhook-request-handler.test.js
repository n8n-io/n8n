'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
const jest_mock_extended_1 = require('jest-mock-extended');
const n8n_workflow_1 = require('n8n-workflow');
const response_error_1 = require('@/errors/response-errors/abstract/response.error');
const webhook_request_handler_1 = require('@/webhooks/webhook-request-handler');
describe('WebhookRequestHandler', () => {
	const webhookManager = (0, jest_mock_extended_1.mock)();
	const handler = (0, webhook_request_handler_1.createWebhookHandlerFor)(webhookManager);
	beforeEach(() => {
		jest.resetAllMocks();
	});
	it('should throw for unsupported methods', async () => {
		const req = (0, jest_mock_extended_1.mock)({
			method: 'CONNECT',
		});
		const res = (0, jest_mock_extended_1.mock)();
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
			const req = (0, jest_mock_extended_1.mock)({
				method: 'OPTIONS',
				headers: {
					origin: 'https://example.com',
					'access-control-request-method': undefined,
				},
				params: { path: 'test' },
			});
			const res = (0, jest_mock_extended_1.mock)();
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
			const req = (0, jest_mock_extended_1.mock)({
				method: 'OPTIONS',
				headers: {
					origin: 'https://example.com',
					'access-control-request-method': 'GET',
				},
				params: { path: 'test' },
			});
			const res = (0, jest_mock_extended_1.mock)();
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
			const randomOrigin = (0, n8n_workflow_1.randomString)(10);
			const req = (0, jest_mock_extended_1.mock)({
				method: 'OPTIONS',
				headers: {
					origin: randomOrigin,
					'access-control-request-method': 'GET',
				},
				params: { path: 'test' },
			});
			const res = (0, jest_mock_extended_1.mock)();
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
			const req = (0, jest_mock_extended_1.mock)({
				method: 'OPTIONS',
				headers: {
					origin: 'https://example.com',
					'access-control-request-method': 'GET',
				},
				params: { path: 'test' },
			});
			const res = (0, jest_mock_extended_1.mock)();
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
			const req = (0, jest_mock_extended_1.mock)({
				method: 'GET',
				params: { path: 'test' },
			});
			const res = (0, jest_mock_extended_1.mock)();
			const executeWebhookResponse = {
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
			expect(res.header).toHaveBeenCalledWith({
				'x-custom-header': 'test',
			});
			expect(res.json).toHaveBeenCalledWith(executeWebhookResponse.data);
		});
		it('should send an error response if webhook execution throws', async () => {
			class TestError extends response_error_1.ResponseError {}
			const req = (0, jest_mock_extended_1.mock)({
				method: 'GET',
				params: { path: 'test' },
			});
			const res = (0, jest_mock_extended_1.mock)();
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
		test.each(['DELETE', 'GET', 'HEAD', 'PATCH', 'POST', 'PUT'])(
			"should handle '%s' method",
			async (method) => {
				const req = (0, jest_mock_extended_1.mock)({
					method,
					params: { path: 'test' },
				});
				const res = (0, jest_mock_extended_1.mock)();
				const executeWebhookResponse = {
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
});
//# sourceMappingURL=webhook-request-handler.test.js.map
