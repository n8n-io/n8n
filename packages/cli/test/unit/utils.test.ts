import { webhookNotFoundErrorMessage } from '../../src/utils';

describe('utils test webhookNotFoundErrorMessage ', () => {
	it('should return a message with path and method', () => {
		const message = webhookNotFoundErrorMessage('webhook12345', 'GET');

		expect(message).toEqual(`The requested webhook "GET webhook12345" is not registered.`);
	});
	it('should return a message with path', () => {
		const message = webhookNotFoundErrorMessage('webhook12345');

		expect(message).toEqual(`The requested webhook "webhook12345" is not registered.`);
	});
	it('should return a message with path and method with tip', () => {
		const message = webhookNotFoundErrorMessage('webhook12345', 'POST');

		expect(message).toEqual(
			`The requested webhook "POST webhook12345" is not registered. Did you mean to make a GET request?`,
		);
	});
});
