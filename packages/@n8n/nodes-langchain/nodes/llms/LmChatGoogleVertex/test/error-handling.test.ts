import { extractGoogleErrorMessage, makeErrorFromStatus } from '../error-handling';

describe('makeErrorFromStatus', () => {
	it('should map 403 to an unauthorized error', () => {
		expect(makeErrorFromStatus(403)).toEqual({
			message: 'Unauthorized for this project',
			description:
				'Check your Google Cloud project ID, that your credential has access to that project and that billing is enabled',
		});
	});

	it('should map 404 with the model name', () => {
		expect(makeErrorFromStatus(404, { modelName: 'gemini-3.1-flash-lite' })).toEqual({
			message: "No model found called 'gemini-3.1-flash-lite'",
		});
	});

	it('should return undefined for unmapped statuses', () => {
		expect(makeErrorFromStatus(400)).toBeUndefined();
		expect(makeErrorFromStatus(500)).toBeUndefined();
	});
});

describe('extractGoogleErrorMessage', () => {
	it('should read the message from response data', () => {
		const error = {
			message: 'Google request failed with status code 400',
			response: {
				status: 400,
				data: { error: { code: 400, message: 'Function call is missing a thought_signature' } },
			},
		};
		expect(extractGoogleErrorMessage(error)).toBe('Function call is missing a thought_signature');
	});

	it('should read the message from array-wrapped response data', () => {
		const error = {
			response: {
				status: 400,
				data: [{ error: { message: 'properties: should be non-empty for OBJECT type' } }],
			},
		};
		expect(extractGoogleErrorMessage(error)).toBe(
			'properties: should be non-empty for OBJECT type',
		);
	});

	it('should parse the body embedded in the error message', () => {
		const error = {
			message:
				'Google request failed with status code 400: {"error":{"message":"Function call is missing a thought_signature","status":"INVALID_ARGUMENT"}}',
		};
		expect(extractGoogleErrorMessage(error)).toBe('Function call is missing a thought_signature');
	});

	it('should fall back to the raw embedded body when it is not JSON', () => {
		const error = {
			message: 'Google request failed with status code 400: something went wrong',
		};
		expect(extractGoogleErrorMessage(error)).toBe('something went wrong');
	});

	it('should return undefined when no detail is available', () => {
		expect(extractGoogleErrorMessage({ message: 'Bad request' })).toBeUndefined();
		expect(extractGoogleErrorMessage({})).toBeUndefined();
	});
});
