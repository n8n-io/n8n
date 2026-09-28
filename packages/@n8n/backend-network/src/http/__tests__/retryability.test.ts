import nock from 'nock';

import { SsrfBlockedHostnameError, SsrfBlockedIpError } from '../../ssrf';
import { httpRequest } from '../axios/request';
import { markNonRetryable, retryabilityFromError } from '../retryability';

const withStatus = (status: number, headers?: Record<string, string | string[]>) =>
	Object.assign(new Error('request failed'), { response: { status, headers } });

const withCode = (code: string) => Object.assign(new Error('socket failure'), { code });

const NOW = new Date('2026-08-18T12:00:00.000Z');

describe('retryabilityFromError', () => {
	describe('from a response status', () => {
		it.each([408, 429, 500, 502, 503, 504, 599])('is retryable for %s', (status) => {
			expect(retryabilityFromError(withStatus(status))).toEqual({ retryable: 'yes', status });
		});

		it.each([400, 401, 402, 403, 404, 410, 422])(
			'is unknown, never no, for the ambiguous %s',
			(status) => {
				expect(retryabilityFromError(withStatus(status))).toEqual({
					retryable: 'unknown',
					status,
				});
			},
		);

		it('reads SDK conventions that carry the status outside `response`', () => {
			expect(retryabilityFromError(Object.assign(new Error('boom'), { statusCode: 503 }))).toEqual({
				retryable: 'yes',
				status: 503,
			});
			expect(retryabilityFromError(Object.assign(new Error('boom'), { status: 429 }))).toEqual({
				retryable: 'yes',
				status: 429,
			});
			expect(
				retryabilityFromError(Object.assign(new Error('boom'), { response: { statusCode: 500 } })),
			).toEqual({ retryable: 'yes', status: 500 });
		});

		it('reads httpCode, as node errors carry it: a numeric string', () => {
			expect(retryabilityFromError(Object.assign(new Error('boom'), { httpCode: '429' }))).toEqual({
				retryable: 'yes',
				status: 429,
			});
			expect(retryabilityFromError(Object.assign(new Error('boom'), { httpCode: '403' }))).toEqual({
				retryable: 'unknown',
				status: 403,
			});
		});

		it('prefers httpCode over the other status fields, anywhere in the chain', () => {
			const wrapped = Object.assign(new Error('outer'), {
				response: { status: 500 },
				cause: Object.assign(new Error('api'), { httpCode: '429' }),
			});
			expect(retryabilityFromError(wrapped)).toEqual({ retryable: 'yes', status: 429 });
		});

		it('reads the status off the cause chain', () => {
			const wrapped = new Error('outer', { cause: withStatus(503) });
			expect(retryabilityFromError(wrapped)).toEqual({ retryable: 'yes', status: 503 });
		});

		it.each(['errorResponse', 'reason'])(
			'follows the %s key node errors wrap with',
			(wrappingKey) => {
				const error = Object.assign(new Error('outer'), {
					[wrappingKey]: { response: { status: 502 } },
				});
				expect(retryabilityFromError(error)).toEqual({ retryable: 'yes', status: 502 });
			},
		);

		it('ignores fields that cannot be an HTTP status', () => {
			expect(retryabilityFromError(Object.assign(new Error('boom'), { status: 0 }))).toEqual({
				retryable: 'unknown',
			});
			expect(
				retryabilityFromError(Object.assign(new Error('boom'), { statusCode: 1503.5 })),
			).toEqual({ retryable: 'unknown' });
			expect(
				retryabilityFromError(Object.assign(new Error('boom'), { httpCode: 'ENOTFOUND' })),
			).toEqual({ retryable: 'unknown' });
			expect(
				retryabilityFromError(Object.assign(new Error('boom'), { response: { status: '9000' } })),
			).toEqual({ retryable: 'unknown' });
		});
	});

	describe('from connection errors', () => {
		it.each(['ECONNRESET', 'ETIMEDOUT', 'UND_ERR_CONNECT_TIMEOUT'])(
			'is retryable for a network error (%s)',
			(code) => {
				expect(retryabilityFromError(withCode(code))).toEqual({ retryable: 'yes' });
			},
		);

		it.each(['ENOTFOUND', 'EAI_AGAIN'])('is retryable for a DNS error (%s)', (code) => {
			expect(retryabilityFromError(withCode(code))).toEqual({ retryable: 'yes' });
		});

		it('is retryable for an undici terminated error hidden inside a wrapper', () => {
			const terminated = new TypeError('terminated');
			expect(retryabilityFromError(new Error('node failed', { cause: terminated }))).toEqual({
				retryable: 'yes',
			});
		});

		it('is retryable for a network error wrapped under errorResponse', () => {
			expect(
				retryabilityFromError(
					Object.assign(new Error('node failed'), { errorResponse: withCode('ECONNRESET') }),
				),
			).toEqual({ retryable: 'yes' });
		});

		it('is unknown for an error that never went through an HTTP client', () => {
			expect(retryabilityFromError(new Error('some logic bug'))).toEqual({
				retryable: 'unknown',
			});
			expect(retryabilityFromError(withCode('EACCES'))).toEqual({ retryable: 'unknown' });
		});
	});

	describe('Retry-After', () => {
		it('parses the delay-seconds form', () => {
			expect(retryabilityFromError(withStatus(429, { 'Retry-After': '30' }), NOW)).toEqual({
				retryable: 'yes',
				status: 429,
				retryAfterMs: 30_000,
			});
		});

		it('parses the HTTP-date form against the supplied now', () => {
			const inTwoMinutes = new Date(NOW.getTime() + 120_000).toUTCString();
			expect(retryabilityFromError(withStatus(503, { 'retry-after': inTwoMinutes }), NOW)).toEqual({
				retryable: 'yes',
				status: 503,
				retryAfterMs: 120_000,
			});
		});

		it('clamps a past HTTP-date to zero instead of going negative', () => {
			const twoMinutesAgo = new Date(NOW.getTime() - 120_000).toUTCString();
			expect(
				retryabilityFromError(withStatus(503, { 'retry-after': twoMinutesAgo }), NOW),
			).toMatchObject({ retryAfterMs: 0 });
		});

		it('is set even when the status itself is not retryable, as some APIs throttle with 403', () => {
			expect(retryabilityFromError(withStatus(403, { 'retry-after': '60' }), NOW)).toEqual({
				retryable: 'unknown',
				status: 403,
				retryAfterMs: 60_000,
			});
		});

		it('is found on the wrapped response when the node error carries only the status', () => {
			const nodeError = Object.assign(new Error('api failed'), {
				httpCode: '403',
				errorResponse: { response: { status: 403, headers: { 'retry-after': '60' } } },
			});
			expect(retryabilityFromError(nodeError, NOW)).toEqual({
				retryable: 'unknown',
				status: 403,
				retryAfterMs: 60_000,
			});
		});

		it('omits retryAfterMs when the header is absent or invalid', () => {
			expect(retryabilityFromError(withStatus(429), NOW).retryAfterMs).toBeUndefined();
			expect(
				retryabilityFromError(withStatus(429, { 'retry-after': 'soon' }), NOW).retryAfterMs,
			).toBeUndefined();
			expect(
				retryabilityFromError(withStatus(429, { 'retry-after': '-5' }), NOW).retryAfterMs,
			).toBeUndefined();
			expect(
				retryabilityFromError(withStatus(429, { 'retry-after': '5.5' }), NOW).retryAfterMs,
			).toBeUndefined();
		});

		it('reads a headers object with a get() method (fetch Headers)', () => {
			const error = Object.assign(new Error('boom'), {
				status: 429,
				headers: new Headers({ 'Retry-After': '7' }),
			});
			expect(retryabilityFromError(error, NOW)).toEqual({
				retryable: 'yes',
				status: 429,
				retryAfterMs: 7000,
			});
		});

		it('takes the first value of a multi-valued header', () => {
			expect(
				retryabilityFromError(withStatus(429, { 'retry-after': ['12', '99'] }), NOW),
			).toMatchObject({ retryAfterMs: 12_000 });
		});
	});

	describe('marked non-retryable', () => {
		it('is no for an error marked with markNonRetryable', () => {
			expect(retryabilityFromError(markNonRetryable(new Error('give up')))).toEqual({
				retryable: 'no',
			});
		});

		it('is no for SSRF blocked errors', () => {
			expect(retryabilityFromError(new SsrfBlockedIpError('127.0.0.1'))).toEqual({
				retryable: 'no',
			});
			expect(retryabilityFromError(new SsrfBlockedHostnameError('internal.test'))).toEqual({
				retryable: 'no',
			});
		});

		it('is no for a wrapped SSRF error, as undici and nodes re-wrap them', () => {
			const wrapped = new TypeError('fetch failed', {
				cause: new SsrfBlockedIpError('127.0.0.1'),
			});
			expect(retryabilityFromError(wrapped)).toEqual({ retryable: 'no' });
		});

		it('wins over a retryable status found on the same chain', () => {
			const marked = markNonRetryable(Object.assign(new Error('boom'), { statusCode: 503 }));
			expect(retryabilityFromError(marked)).toEqual({ retryable: 'no', status: 503 });
		});

		it('does not leak the mark into logs or serialization', () => {
			const error = markNonRetryable(Object.assign(new Error('boom'), { code: 'X' }));
			expect(Object.keys(error)).toEqual(['code']);
			expect(JSON.stringify(error)).not.toContain('non-retryable');
		});
	});

	describe('never throws', () => {
		it.each([undefined, null, 'ECONNRESET', 42, Symbol('x'), () => {}])(
			'handles non-error value %p',
			(value) => {
				expect(retryabilityFromError(value)).toEqual({ retryable: 'unknown' });
			},
		);

		it('terminates on a self-referential cause chain', () => {
			const selfReferential: Error & { cause?: unknown } = new Error('loop');
			selfReferential.cause = selfReferential;
			expect(retryabilityFromError(selfReferential)).toEqual({ retryable: 'unknown' });
		});

		it('keeps the status when the headers get() throws', () => {
			const error = Object.assign(new Error('boom'), {
				status: 503,
				headers: {
					get() {
						throw new Error('broken');
					},
				},
			});
			expect(retryabilityFromError(error)).toEqual({ retryable: 'yes', status: 503 });
		});
	});

	describe('node HTTP path (httpRequest)', () => {
		beforeEach(() => {
			nock.cleanAll();
		});

		it('handles a non-2xx rejection from the unmarked httpRequest export', async () => {
			nock('https://api.test').get('/data').reply(503, 'unavailable', { 'Retry-After': '2' });

			const error: unknown = await httpRequest({ url: 'https://api.test/data', method: 'GET' })
				.then(() => undefined)
				.catch((thrown: unknown) => thrown);

			expect(retryabilityFromError(error, NOW)).toEqual({
				retryable: 'yes',
				status: 503,
				retryAfterMs: 2000,
			});
		});

		it('handles a connection error from the unmarked httpRequest export', async () => {
			nock('https://api.test')
				.get('/data')
				.replyWithError(Object.assign(new Error('reset'), { code: 'ECONNRESET' }));

			const error: unknown = await httpRequest({ url: 'https://api.test/data', method: 'GET' })
				.then(() => undefined)
				.catch((thrown: unknown) => thrown);

			expect(retryabilityFromError(error)).toEqual({ retryable: 'yes' });
		});
	});
});
