import {
	httpStatusFromError,
	isConnectionRefusedError,
	isHttpRequestError,
	markHttpRequestError,
} from '../client-request-error';

describe('isHttpRequestError', () => {
	const transportError = (props: Record<string, unknown>) =>
		markHttpRequestError(Object.assign(new Error('request failed'), props));

	it('is true for errors tagged by the request client', () => {
		expect(isHttpRequestError(transportError({ response: { status: 400, data: {} } }))).toBe(true);
		expect(isHttpRequestError(transportError({ code: 'ECONNREFUSED' }))).toBe(true);
	});

	it('is false for untagged errors (incl. raw transport errors) and non-errors', () => {
		expect(isHttpRequestError(new Error('boom'))).toBe(false);
		// An axios-shaped error that did NOT come through the client is not tagged.
		expect(isHttpRequestError(Object.assign(new Error('x'), { isAxiosError: true }))).toBe(false);
		expect(isHttpRequestError({})).toBe(false);
		expect(isHttpRequestError(undefined)).toBe(false);
		expect(isHttpRequestError('nope')).toBe(false);
	});

	it('narrows to the response body so callers can read it', () => {
		const error: unknown = transportError({
			response: { status: 409, data: { message: 'taken' } },
		});

		expect(isHttpRequestError(error)).toBe(true);
		if (isHttpRequestError(error)) {
			const data = error.response?.data as { message?: string } | undefined;
			expect(data?.message).toBe('taken');
		}
	});
});

describe('markHttpRequestError', () => {
	it('returns the same error instance and is recognized by the guard', () => {
		const error = new Error('boom');
		expect(markHttpRequestError(error)).toBe(error);
		expect(isHttpRequestError(error)).toBe(true);
	});

	it('adds a non-enumerable marker that does not leak into logs/serialization', () => {
		const error = markHttpRequestError(Object.assign(new Error('boom'), { code: 'X' }));
		const marker = Symbol.for('n8n.backend-network.http-request-error');

		expect(Object.keys(error)).toEqual(['code']);
		expect(Object.getOwnPropertyDescriptor(error, marker)?.enumerable).toBe(false);
	});

	it('uses a global-registry symbol shared across module instances', () => {
		// A separately-resolved symbol with the same key must read the marker —
		// this is what makes the guard survive src/dist module duplication.
		const error = markHttpRequestError(new Error('boom'));
		const sharedSymbol = Symbol.for('n8n.backend-network.http-request-error');

		expect((error as unknown as Record<symbol, unknown>)[sharedSymbol]).toBe(true);
	});

	it('is a no-op for non-objects', () => {
		expect(markHttpRequestError('nope')).toBe('nope');
		expect(markHttpRequestError(undefined)).toBeUndefined();
	});
});

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
