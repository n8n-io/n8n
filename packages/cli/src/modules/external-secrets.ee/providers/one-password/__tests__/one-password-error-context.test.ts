import {
	getOnePasswordErrorCode,
	getOnePasswordHttpStatus,
	onePasswordErrorContext,
} from '../one-password-error-context';

describe('getOnePasswordHttpStatus', () => {
	it('extracts statusCode from HTTP request errors', () => {
		const error = Object.assign(new Error('Request failed'), {
			response: { status: 403 },
		});

		expect(getOnePasswordHttpStatus(error)).toBe(403);
	});

	it('returns undefined for non-error values', () => {
		expect(getOnePasswordHttpStatus('not an error')).toBeUndefined();
	});
});

describe('getOnePasswordErrorCode', () => {
	it('returns ECONNREFUSED for transport errors', () => {
		const error = Object.assign(new Error('Connection refused'), {
			code: 'ECONNREFUSED',
		});

		expect(getOnePasswordErrorCode(error)).toBe('ECONNREFUSED');
	});

	it('returns HTTP status when available', () => {
		const error = Object.assign(new Error('Unauthorized'), {
			response: { status: 401 },
		});

		expect(getOnePasswordErrorCode(error)).toBe(401);
	});

	it('falls back to Error.name for generic errors', () => {
		expect(getOnePasswordErrorCode(new Error('Something went wrong'))).toBe('Error');
	});

	it('returns undefined for non-error values', () => {
		expect(getOnePasswordErrorCode(null)).toBeUndefined();
	});
});

describe('onePasswordErrorContext', () => {
	it('extracts statusCode and errorCode from HTTP request errors', () => {
		const error = Object.assign(new Error('Request failed'), {
			response: { status: 403 },
		});

		expect(onePasswordErrorContext(error)).toEqual({
			statusCode: 403,
			errorCode: 403,
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
