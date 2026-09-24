import { OperationalError } from 'n8n-workflow';

import { makeAzureFoundryFailedAttemptHandler } from '../error-handling';

describe('makeAzureFoundryFailedAttemptHandler', () => {
	it('should name the deployment and Chat Completions when the toggle is off', () => {
		const handler = makeAzureFoundryFailedAttemptHandler('gpt-4o', false);

		expect(() => handler({ status: 404 })).toThrow(OperationalError);
		expect(() => handler({ status: 404 })).toThrow(
			'Azure did not accept the deployment "gpt-4o" on Chat Completions',
		);
		expect(() => handler({ status: 404 })).toThrow("Turn on 'Use Responses API'");
	});

	it('should name the deployment and the Responses API when the toggle is on', () => {
		const handler = makeAzureFoundryFailedAttemptHandler('gpt-5-pro', true);

		expect(() => handler({ status: 404 })).toThrow(
			'Azure did not accept the deployment "gpt-5-pro" on the Responses API',
		);
		expect(() => handler({ status: 404 })).toThrow("Turn off 'Use Responses API'");
	});

	it('should keep the original error as the cause', () => {
		const original = { status: 404, message: 'Resource not found' };
		const handler = makeAzureFoundryFailedAttemptHandler('gpt-4o', false);

		try {
			handler(original);
			throw new Error('expected the handler to throw');
		} catch (error) {
			expect((error as OperationalError).cause).toBe(original);
		}
	});

	// Azure reports the mismatch this way when the route exists but will not serve the deployment.
	it('should explain a 400 that names the model as unsupported', () => {
		const handler = makeAzureFoundryFailedAttemptHandler('gpt-4o', false);

		expect(() => handler({ status: 400, message: 'Model not supported' })).toThrow(
			'Azure did not accept the deployment "gpt-4o" on Chat Completions',
		);
	});

	// Anything else has to fall through so the shared handler can retry it.
	it.each([
		['a rate limit', { status: 429 }],
		['a server error', { status: 500 }],
		['no status', { message: 'socket hang up' }],
		['an unrelated 400', { status: 400, message: 'Invalid value for temperature' }],
		['a 400 about content', { status: 400, message: 'The response was filtered' }],
		['a string', 'boom'],
		['null', null],
	])('should ignore %s', (_, error) => {
		const handler = makeAzureFoundryFailedAttemptHandler('gpt-4o', false);

		expect(() => handler(error)).not.toThrow();
	});
});
