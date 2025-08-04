'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
const webhook_not_found_error_1 = require('@/errors/response-errors/webhook-not-found.error');
describe('utils test webhookNotFoundErrorMessage ', () => {
	it('should return a message with path and method', () => {
		const message = (0, webhook_not_found_error_1.webhookNotFoundErrorMessage)({
			path: 'webhook12345',
			httpMethod: 'GET',
		});
		expect(message).toEqual('The requested webhook "GET webhook12345" is not registered.');
	});
	it('should return a message with path', () => {
		const message = (0, webhook_not_found_error_1.webhookNotFoundErrorMessage)({
			path: 'webhook12345',
		});
		expect(message).toEqual('The requested webhook "webhook12345" is not registered.');
	});
	it('should return a message with method with tip', () => {
		const message = (0, webhook_not_found_error_1.webhookNotFoundErrorMessage)({
			path: 'webhook12345',
			httpMethod: 'POST',
			webhookMethods: ['GET', 'PUT'],
		});
		expect(message).toEqual(
			'This webhook is not registered for POST requests. Did you mean to make a GET or PUT request?',
		);
	});
	it('should return a message with method with tip', () => {
		const message = (0, webhook_not_found_error_1.webhookNotFoundErrorMessage)({
			path: 'webhook12345',
			httpMethod: 'POST',
			webhookMethods: ['PUT'],
		});
		expect(message).toEqual(
			'This webhook is not registered for POST requests. Did you mean to make a PUT request?',
		);
	});
	it('should return a message with method with tip', () => {
		const message = (0, webhook_not_found_error_1.webhookNotFoundErrorMessage)({
			path: 'webhook12345',
			httpMethod: 'POST',
			webhookMethods: ['GET', 'PUT', 'DELETE'],
		});
		expect(message).toEqual(
			'This webhook is not registered for POST requests. Did you mean to make a GET, PUT or DELETE request?',
		);
	});
});
//# sourceMappingURL=webhook-not-found.error.test.js.map
