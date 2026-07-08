import { getUserFacingErrorMessage } from '../instance-ai.service';

describe('getUserFacingErrorMessage', () => {
	it('maps a sandbox "Endpoint not allowed" failure to a clear, retryable message', () => {
		const message = getUserFacingErrorMessage(new Error('Endpoint not allowed'));
		expect(message).toContain("couldn't finish preparing the workspace sandbox");
		expect(message).toContain('try again');
	});

	it('falls back to a generic retryable message for unknown errors', () => {
		expect(getUserFacingErrorMessage(new Error('kaboom'))).toBe(
			'Something went wrong before I could finish that response. Please try again.',
		);
	});

	it('maps a quota-exhausted error to a clear out-of-credits message', () => {
		const message = getUserFacingErrorMessage(new Error('Have reached end of quota'));
		expect(message.toLowerCase()).toContain('credits');
		expect(message).not.toContain('Something went wrong');
	});
});
