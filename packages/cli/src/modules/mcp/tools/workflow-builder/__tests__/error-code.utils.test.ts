import { NotFoundError } from '@/errors/response-errors/not-found.error';

import { getErrorCode } from '../error-code.utils';

describe('getErrorCode utility', () => {
	test('returns HTTP_404 for NotFoundError', () => {
		const error = new NotFoundError('Resource not found');
		expect(getErrorCode(error)).toBe('HTTP_404');
	});

	test('returns HTTP_<statusCode> for objects with httpStatusCode', () => {
		expect(getErrorCode({ httpStatusCode: 403, message: 'Forbidden' })).toBe('HTTP_403');
		expect(getErrorCode({ httpStatusCode: 400, message: 'Bad request' })).toBe('HTTP_400');
		expect(getErrorCode({ httpStatusCode: 500, message: 'Internal error' })).toBe('HTTP_500');
	});

	test('returns string errorCode if present and httpStatusCode is absent', () => {
		const error = { errorCode: 'MISSING_PROJECT_ID' };
		expect(getErrorCode(error)).toBe('MISSING_PROJECT_ID');
	});

	test('returns numeric errorCode converted to string if httpStatusCode is absent', () => {
		const error = { errorCode: 1001 };
		expect(getErrorCode(error)).toBe('1001');
	});

	test('returns UNKNOWN_ERROR for standard Error without errorCode or httpStatusCode', () => {
		const error = new Error('Generic error');
		expect(getErrorCode(error)).toBe('UNKNOWN_ERROR');
	});

	test('returns UNKNOWN_ERROR for primitives and null/undefined', () => {
		expect(getErrorCode(null)).toBe('UNKNOWN_ERROR');
		expect(getErrorCode(undefined)).toBe('UNKNOWN_ERROR');
		expect(getErrorCode('string error')).toBe('UNKNOWN_ERROR');
		expect(getErrorCode(123)).toBe('UNKNOWN_ERROR');
	});
});
