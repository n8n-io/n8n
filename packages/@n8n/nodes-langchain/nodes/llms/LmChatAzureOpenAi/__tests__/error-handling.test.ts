import { UserError } from 'n8n-workflow';

import { makeAzureFoundryFailedAttemptHandler } from '../error-handling';

describe('makeAzureFoundryFailedAttemptHandler', () => {
	it('should name the deployment and Chat Completions when the toggle is off', () => {
		const handler = makeAzureFoundryFailedAttemptHandler('gpt-4o', false);

		expect(() => handler({ status: 404 })).toThrow(UserError);
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
			expect((error as UserError).cause).toBe(original);
		}
	});

	// Azure reports the mismatch this way when the route exists but will not serve the deployment.
	it('should explain a 400 that names the model as unsupported', () => {
		const handler = makeAzureFoundryFailedAttemptHandler('gpt-4o', false);

		expect(() => handler({ status: 400, message: 'Model not supported' })).toThrow(
			'Azure did not accept the deployment "gpt-4o" on Chat Completions',
		);
	});

	// The two most common Azure 400s. Relabelling either as an API-mode problem would send the
	// builder after the wrong thing entirely.
	it.each([
		[
			'an unsupported parameter value',
			"Unsupported value: 'temperature' does not support 0.5 with this model. Only the default (1) value is supported.",
		],
		[
			'an unsupported parameter name',
			"Unsupported parameter: 'max_tokens' is not supported with this model. Use 'max_completion_tokens' instead.",
		],
	])('should leave %s alone, even though it mentions the model', (_, message) => {
		const handler = makeAzureFoundryFailedAttemptHandler('gpt-4o', false);

		expect(() => handler({ status: 400, message })).not.toThrow();
	});

	// Both halves apply here: the classifier says unsupported_parameter and the narrow pattern
	// also matches. The parameter reading has to win, or the builder is sent to the wrong setting.
	it('should treat a parameter error as such even when it also names the model', () => {
		const handler = makeAzureFoundryFailedAttemptHandler('gpt-4o', false);
		const message =
			"Unsupported parameter: 'max_tokens'. The model is not supported with that parameter.";

		expect(() => handler({ status: 400, message })).not.toThrow();
	});

	// Some clients put the status on a response object rather than the error.
	it('should read a status nested under response', () => {
		const handler = makeAzureFoundryFailedAttemptHandler('gpt-4o', false);

		expect(() => handler({ response: { status: 404 } })).toThrow('gpt-4o');
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
