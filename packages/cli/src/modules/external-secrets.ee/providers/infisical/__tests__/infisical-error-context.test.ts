import {
	getInfisicalErrorCode,
	getInfisicalHttpStatus,
	infisicalErrorContext,
} from '../infisical-error-context';

describe('getInfisicalHttpStatus', () => {
	it('extracts statusCode from HTTP request errors', () => {
		const error = Object.assign(new Error('Request failed'), {
			response: { status: 403 },
		});

		expect(getInfisicalHttpStatus(error)).toBe(403);
	});

	it('returns undefined for non-error values', () => {
		expect(getInfisicalHttpStatus('not an error')).toBeUndefined();
	});
});

describe('getInfisicalErrorCode', () => {
	it('returns ECONNREFUSED for transport errors', () => {
		const error = Object.assign(new Error('Connection refused'), {
			code: 'ECONNREFUSED',
		});

		expect(getInfisicalErrorCode(error)).toBe('ECONNREFUSED');
	});

	it('returns HTTP status when available', () => {
		const error = Object.assign(new Error('Unauthorized'), {
			response: { status: 401 },
		});

		expect(getInfisicalErrorCode(error)).toBe(401);
	});

	it('falls back to Error.name for generic errors', () => {
		expect(getInfisicalErrorCode(new Error('Something went wrong'))).toBe('Error');
	});

	it('returns undefined for non-error values', () => {
		expect(getInfisicalErrorCode(null)).toBeUndefined();
	});
});

describe('infisicalErrorContext', () => {
	it('extracts statusCode and errorCode from HTTP request errors', () => {
		const error = Object.assign(new Error('Request failed'), {
			response: { status: 403 },
		});

		expect(infisicalErrorContext(error)).toEqual({
			statusCode: 403,
			errorCode: 403,
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
