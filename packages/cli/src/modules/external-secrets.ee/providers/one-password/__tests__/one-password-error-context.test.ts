import { onePasswordErrorContext } from '../one-password-error-context';

describe('onePasswordErrorContext', () => {
	it('extracts statusCode from HTTP request errors without duplicating it in errorCode', () => {
		const error = Object.assign(new Error('Request failed'), {
			response: { status: 403 },
		});

		expect(onePasswordErrorContext(error)).toEqual({
			statusCode: 403,
		});
	});

	it('extracts errorCode from transport errors', () => {
		const error = Object.assign(new Error('Connection refused'), {
			code: 'ECONNREFUSED',
		});

		expect(onePasswordErrorContext(error)).toEqual({
			errorCode: 'ECONNREFUSED',
		});
	});

	it('extracts SDK error code when present alongside HTTP status', () => {
		const error = Object.assign(new Error('Forbidden'), {
			response: { status: 403 },
			code: 'FORBIDDEN',
		});

		expect(onePasswordErrorContext(error)).toEqual({
			statusCode: 403,
			errorCode: 'FORBIDDEN',
		});
	});

	it('falls back to Error.name for generic errors', () => {
		expect(onePasswordErrorContext(new Error('Something went wrong'))).toEqual({
			errorCode: 'Error',
		});
	});

	it('returns empty context for non-error values', () => {
		expect(onePasswordErrorContext('not an error')).toEqual({});
		expect(onePasswordErrorContext(null)).toEqual({});
	});
});
