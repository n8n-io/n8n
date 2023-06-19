import { webhookNotFoundErrorMessage } from '../../src/utils';

describe('utils test webhookNotFoundErrorMessage ', () => {
	it('should return a message with path and method', () => {
		const message = webhookNotFoundErrorMessage('webhook12345', 'GET');

		expect(message).toEqual('The requested webhook "GET webhook12345" is not registered.');
	});
	it('should return a message with path', () => {
		const message = webhookNotFoundErrorMessage('webhook12345');

		expect(message).toEqual('The requested webhook "webhook12345" is not registered.');
	});
	it('should return a message with method with tip', () => {
		const message = webhookNotFoundErrorMessage('webhook12345', 'POST', ['GET', 'PUT']);

		expect(message).toEqual(
			'This webhook is not registered for POST requests. Did you mean to make a GET or PUT request?',
		);
	});
	it('should return a message with method with tip', () => {
		const message = webhookNotFoundErrorMessage('webhook12345', 'POST', ['PUT']);

		expect(message).toEqual(
			'This webhook is not registered for POST requests. Did you mean to make a PUT request?',
		);
	});
	it('should return a message with method with tip', () => {
		const message = webhookNotFoundErrorMessage('webhook12345', 'POST', ['GET', 'PUT', 'DELETE']);

		expect(message).toEqual(
			'This webhook is not registered for POST requests. Did you mean to make a GET, PUT or DELETE request?',
		);
	});
});
