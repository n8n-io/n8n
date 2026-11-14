import { APICallError } from 'ai';

import { isEncryptedReasoningRejected } from '../encrypted-reasoning';

const apiError = (code: string, message = 'Bad request') =>
	new APICallError({
		message,
		url: 'https://api.openai.com/v1/responses',
		requestBodyValues: {},
		statusCode: 400,
		data: { error: { type: 'invalid_request_error', code } },
	});

describe('isEncryptedReasoningRejected', () => {
	it('matches the OpenAI error code, also when wrapped', () => {
		expect(isEncryptedReasoningRejected(apiError('invalid_encrypted_content'))).toBe(true);
		expect(
			isEncryptedReasoningRejected(
				new Error('Model call failed', { cause: apiError('invalid_encrypted_content') }),
			),
		).toBe(true);
		// A Responses stream reports a failure as an event with the code on it.
		expect(
			isEncryptedReasoningRejected({ type: 'error', error: { code: 'invalid_encrypted_content' } }),
		).toBe(true);
	});

	it('ignores other errors, whatever their message', () => {
		expect(isEncryptedReasoningRejected(apiError('invalid_image'))).toBe(false);
		expect(
			isEncryptedReasoningRejected(
				apiError('server_error', 'The encrypted content could not be verified.'),
			),
		).toBe(false);
		expect(isEncryptedReasoningRejected(new Error('invalid_encrypted_content'))).toBe(false);
	});
});
