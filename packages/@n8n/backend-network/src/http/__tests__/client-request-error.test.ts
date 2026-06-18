import { httpStatusFromError, isConnectionRefusedError } from '../client-request-error';

describe('isConnectionRefusedError', () => {
	it('is true for an error carrying ECONNREFUSED', () => {
		expect(
			isConnectionRefusedError(Object.assign(new Error('boom'), { code: 'ECONNREFUSED' })),
		).toBe(true);
	});

	it('is false for other codes and non-error values', () => {
		expect(isConnectionRefusedError(Object.assign(new Error('boom'), { code: 'ETIMEDOUT' }))).toBe(
			false,
		);
		expect(isConnectionRefusedError(new Error('boom'))).toBe(false);
		expect(isConnectionRefusedError('ECONNREFUSED')).toBe(false);
		expect(isConnectionRefusedError(null)).toBe(false);
	});
});

describe('httpStatusFromError', () => {
	it('returns the status when the error carries a response', () => {
		expect(
			httpStatusFromError(Object.assign(new Error('boom'), { response: { status: 401 } })),
		).toBe(401);
	});

	it('returns undefined when there is no numeric response status', () => {
		expect(httpStatusFromError(Object.assign(new Error('boom'), { code: 'ECONNREFUSED' }))).toBe(
			undefined,
		);
		expect(
			httpStatusFromError(Object.assign(new Error('boom'), { response: { status: 'nope' } })),
		).toBe(undefined);
		expect(httpStatusFromError(new Error('boom'))).toBe(undefined);
		expect(httpStatusFromError(undefined)).toBe(undefined);
	});
});
