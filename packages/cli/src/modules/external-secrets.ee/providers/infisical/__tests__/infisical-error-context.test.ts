import { httpStatusFromError } from '@n8n/backend-network';

import { infisicalErrorContext } from '../../infisical';

describe('infisicalErrorContext', () => {
	it('extracts statusCode from HTTP request errors without duplicating it in errorCode', () => {
		const error = Object.assign(new Error('Request failed'), {
			response: { status: 403 },
		});

		expect(httpStatusFromError(error)).toBe(403);
		expect(infisicalErrorContext(error)).toEqual({
			statusCode: 403,
		});
	});

	it('extracts errorCode from transport errors', () => {
		const error = Object.assign(new Error('Connection refused'), {
			code: 'ECONNREFUSED',
		});

		expect(infisicalErrorContext(error)).toEqual({
			errorCode: 'ECONNREFUSED',
		});
	});

	it('falls back to Error.name for generic errors', () => {
		expect(infisicalErrorContext(new Error('Something went wrong'))).toEqual({
			errorCode: 'Error',
		});
	});

	it('returns empty context for non-error values', () => {
		expect(infisicalErrorContext('not an error')).toEqual({});
		expect(infisicalErrorContext(null)).toEqual({});
	});
});
