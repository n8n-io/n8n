import {
	httpStatusFromError,
	isAxiosError,
	isConnectionRefusedError,
	isDnsFailure,
	isHttpRequestError,
	isTransportFailure,
	markHttpRequestError,
} from '../client-request-error';

const withCode = (code: string, message = 'socket failure') =>
	Object.assign(new Error(message), { code });

describe('isTransportFailure', () => {
	it.each([
		'ECONNABORTED',
		'ECONNREFUSED',
		'ECONNRESET',
		'EHOSTUNREACH',
		'ENETDOWN',
		'ENETUNREACH',
		'EPIPE',
		'ETIMEDOUT',
		'UND_ERR_BODY_TIMEOUT',
		'UND_ERR_CONNECT_TIMEOUT',
		'UND_ERR_HEADERS_TIMEOUT',
		'UND_ERR_SOCKET',
	])('is true for %s', (code) => {
		expect(isTransportFailure(withCode(code))).toBe(true);
	});

	it("is true for undici's bare mid-stream termination, which carries no code", () => {
		expect(isTransportFailure(new TypeError('terminated'))).toBe(true);
	});

	it('reads the code off the cause chain, not just the top-level error', () => {
		const wrapped = new Error('AI_APICallError', {
			cause: new TypeError('fetch failed', {
				cause: withCode('UND_ERR_SOCKET', 'other side closed'),
			}),
		});
		expect(isTransportFailure(wrapped)).toBe(true);
	});

	it('is false for DNS failures, which isDnsFailure owns', () => {
		expect(isTransportFailure(withCode('ENOTFOUND'))).toBe(false);
		expect(isTransportFailure(withCode('EAI_AGAIN'))).toBe(false);
	});

	it('is false for unrelated errors and non-errors', () => {
		expect(isTransportFailure(new Error('terminated'))).toBe(false);
		expect(isTransportFailure(new TypeError('kaboom'))).toBe(false);
		expect(isTransportFailure(withCode('EACCES'))).toBe(false);
		expect(isTransportFailure(undefined)).toBe(false);
		expect(isTransportFailure('ECONNRESET')).toBe(false);
	});

	it('terminates on a cyclic cause chain', () => {
		const first: Error & { cause?: unknown } = new Error('first');
		const second: Error & { cause?: unknown } = new Error('second');
		first.cause = second;
		second.cause = first;
		expect(isTransportFailure(first)).toBe(false);

		const selfReferential: Error & { cause?: unknown } = new Error('loop');
		selfReferential.cause = selfReferential;
		expect(isTransportFailure(selfReferential)).toBe(false);
	});
});

describe('isDnsFailure', () => {
	it.each(['ENOTFOUND', 'EAI_AGAIN'])('is true for %s', (code) => {
		expect(isDnsFailure(withCode(code))).toBe(true);
	});

	it('reads the code off the cause chain', () => {
		expect(isDnsFailure(new TypeError('fetch failed', { cause: withCode('ENOTFOUND') }))).toBe(
			true,
		);
	});

	it('is false for socket-level failures, which isTransportFailure owns', () => {
		expect(isDnsFailure(withCode('ECONNRESET'))).toBe(false);
		expect(isDnsFailure(new TypeError('terminated'))).toBe(false);
	});
});

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

describe('isAxiosError', () => {
	it('is true for an error carrying the axios brand', () => {
		expect(isAxiosError(Object.assign(new Error('boom'), { isAxiosError: true }))).toBe(true);
	});

	it('is false for non-axios errors and non-error values', () => {
		expect(isAxiosError(new Error('boom'))).toBe(false);
		expect(isAxiosError(Object.assign(new Error('boom'), { isAxiosError: false }))).toBe(false);
		expect(isAxiosError({ isAxiosError: true })).toBe(true);
		expect(isAxiosError(null)).toBe(false);
		expect(isAxiosError('isAxiosError')).toBe(false);
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
