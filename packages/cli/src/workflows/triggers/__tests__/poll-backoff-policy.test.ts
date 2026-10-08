import { markNonRetryable } from '@n8n/backend-network';
import { backoff } from '@n8n/scheduler';
import type { INode } from 'n8n-workflow';
import { ACTIONABLE_CAUSES, NodeApiError, NodeOperationError, TIMED_CAUSES } from 'n8n-workflow';

import {
	computeBackoffDelayMs,
	MAX_BACKOFF_MS,
	pollFailureFromError,
	RETRY_AFTER_MAX_MS,
} from '../poll-backoff-policy';

const node: INode = {
	id: 'node-1',
	name: 'Poll Trigger',
	type: 'poll',
	typeVersion: 1,
	position: [0, 0],
	parameters: {},
};

describe('pollFailureFromError', () => {
	const now = new Date('2026-08-05T12:00:00.000Z');

	test.each<[string, unknown, string]>([
		[
			'a NodeApiError with httpCode 401',
			new NodeApiError(node, {}, { httpCode: '401' }),
			'permanent',
		],
		[
			'a NodeApiError with httpCode 403',
			new NodeApiError(node, {}, { httpCode: '403' }),
			'permanent',
		],
		[
			'a NodeApiError with httpCode 429',
			new NodeApiError(node, {}, { httpCode: '429' }),
			'transient',
		],
		[
			'a NodeOperationError wrapping a causal NodeApiError with httpCode 401',
			new NodeOperationError(node, new NodeApiError(node, {}, { httpCode: '401' }) as Error),
			'permanent',
		],
		[
			'a NodeOperationError wrapping a causal NodeApiError with httpCode 429',
			new NodeOperationError(node, new NodeApiError(node, {}, { httpCode: '429' }) as Error),
			'transient',
		],
		['a plain string', 'boom', 'transient'],
		['undefined', undefined, 'transient'],
		['a bare object', {}, 'transient'],
		[
			'a network error with no status',
			Object.assign(new Error('ECONNREFUSED'), { code: 'ECONNREFUSED' }),
			'transient',
		],
		[
			'an axios-shaped response.status of 401 with no NodeApiError',
			{ response: { status: 401 } },
			'permanent',
		],
		[
			'an axios-shaped response.status of 500 with no NodeApiError',
			{ response: { status: 500 } },
			'transient',
		],
	])('classifies %s as %s', (_name, thrown, expected) => {
		expect(pollFailureFromError(thrown, now).type).toBe(expected);
	});

	test.each([401, 403])(
		'classifies a %s carrying a parseable Retry-After as transient rate limiting',
		(httpCode) => {
			const error = { httpCode, response: { headers: { 'retry-after': '120' } } };

			expect(pollFailureFromError(error, now)).toEqual({
				type: 'transient',
				retryAfterMs: 120_000,
				cause: 'rate-limited',
			});
		},
	);

	test.each<[string, unknown, string | undefined]>([
		['a 429 as rate-limited', { httpCode: 429 }, 'rate-limited'],
		['a 401 as credential-invalid', { httpCode: 401 }, 'credential-invalid'],
		[
			'a transport failure as temporarily-unavailable',
			Object.assign(new Error('ECONNREFUSED'), { code: 'ECONNREFUSED' }),
			'temporarily-unavailable',
		],
		['a 500 as temporarily-unavailable', { response: { status: 500 } }, 'temporarily-unavailable'],
		['a 403 as causeless, since it hides too many things', { httpCode: 403 }, undefined],
		['an unknown error as causeless', new Error('boom'), undefined],
	])('infers the cause of %s', (_name, error, expectedCause) => {
		expect(pollFailureFromError(error, now).cause).toBe(expectedCause);
	});

	test('classifies a 403 carrying an unparseable Retry-After as permanent', () => {
		const error = { httpCode: 403, response: { headers: { 'retry-after': 'soon' } } };

		expect(pollFailureFromError(error, now)).toEqual({
			type: 'permanent',
			retryAfterMs: null,
		});
	});

	// The header's presence is what separates a throttled credential from a dead one,
	// so a value resolving to zero must still read as rate limiting.
	test.each<[string, string]>([
		['a zero delay', '0'],
		['an elapsed HTTP-date', 'Wed, 05 Aug 2026 11:58:00 GMT'],
	])('classifies a 403 carrying %s as rate-limited', (_name, value) => {
		const error = { httpCode: 403, response: { headers: { 'retry-after': value } } };

		expect(pollFailureFromError(error, now)).toEqual({
			type: 'transient',
			retryAfterMs: null,
			cause: 'rate-limited',
		});
	});

	test('classifies a 401 carrying a zero Retry-After as rate-limited, not as a dead credential', () => {
		const error = { httpCode: 401, response: { headers: { 'retry-after': '0' } } };

		expect(pollFailureFromError(error, now)).toEqual({
			type: 'transient',
			retryAfterMs: null,
			cause: 'rate-limited',
		});
	});

	test.each<[string, unknown]>([
		['with no status', markNonRetryable(new Error('destination not allowed'))],
		[
			'carrying a retryable status and a Retry-After',
			markNonRetryable(
				Object.assign(new Error('destination not allowed'), {
					httpCode: '429',
					response: { headers: { 'retry-after': '120' } },
				}),
			),
		],
	])('classifies a failure proven not worth retrying %s as permanent', (_name, error) => {
		expect(pollFailureFromError(error, now).type).toBe('permanent');
	});

	test.each<[string, unknown, number | null]>([
		['a delay-seconds value', '120', 120_000],
		['a value with surrounding whitespace', '  120  ', 120_000],
		['an array-valued header, reading its first entry', ['120', '60'], 120_000],
		[
			'a very large value, uncapped here; capping is left to computeBackoffDelayMs',
			'999999999',
			999_999_999_000,
		],
		['a zero value, which asks for no wait at all', '0', null],
		['a negative value', '-5', null],
		['a non-numeric value', 'soon', null],
		[
			'a future HTTP-date, resolved against the injected now',
			'Wed, 05 Aug 2026 12:02:00 GMT',
			120_000,
		],
		['an elapsed HTTP-date', 'Wed, 05 Aug 2026 11:58:00 GMT', null],
	])('resolves a Retry-After of %s to %s', (_name, value, expected) => {
		const error = { response: { headers: { 'retry-after': value } } };

		expect(pollFailureFromError(error, now).retryAfterMs).toBe(expected);
	});

	test('reads a Retry-After off a nested cause', () => {
		const error = { cause: { cause: { response: { headers: { 'retry-after': '120' } } } } };

		expect(pollFailureFromError(error, now).retryAfterMs).toBe(120_000);
	});

	describe('a declared failure', () => {
		test.each(TIMED_CAUSES)('classifies a declared %s as transient', (cause) => {
			const error = new NodeApiError(node, {}, { failure: { cause } });

			expect(pollFailureFromError(error, now)).toEqual({
				type: 'transient',
				retryAfterMs: null,
				cause,
			});
		});

		test.each(ACTIONABLE_CAUSES)('classifies a declared %s as permanent', (cause) => {
			const error = new NodeApiError(node, {}, { failure: { cause } });

			expect(pollFailureFromError(error, now)).toEqual({
				type: 'permanent',
				retryAfterMs: null,
				cause,
			});
		});

		test('beats the permanent-status heuristic: a 403 declared rate-limited is transient', () => {
			const error = new NodeApiError(
				node,
				{},
				{ httpCode: '403', failure: { cause: 'rate-limited' } },
			);

			expect(pollFailureFromError(error, now).type).toBe('transient');
		});

		test('beats the Retry-After heuristic: a throttling-shaped 401 declared credential-invalid is permanent', () => {
			const error = {
				httpCode: 401,
				response: { headers: { 'retry-after': '120' } },
				failure: { cause: 'credential-invalid' },
			};

			expect(pollFailureFromError(error, now)).toEqual({
				type: 'permanent',
				retryAfterMs: null,
				cause: 'credential-invalid',
			});
		});

		test('wins over an error marked non-retryable, since the node knows its API best', () => {
			const error = markNonRetryable(new Error('destination not allowed'));
			Object.assign(error, { failure: { cause: 'rate-limited' } });

			expect(pollFailureFromError(error, now).type).toBe('transient');
		});

		test('takes the wait from a declared retryAfterMs hint over a Retry-After header', () => {
			const error = {
				response: { headers: { 'retry-after': '120' } },
				failure: { cause: 'rate-limited', retryAfterMs: 30_000 },
			};

			expect(pollFailureFromError(error, now).retryAfterMs).toBe(30_000);
		});

		test('resolves a declared resetsAtEpochMs against the injected now', () => {
			const error = {
				failure: {
					cause: 'quota-exhausted',
					resetsAtEpochMs: now.getTime() + 5 * 60_000,
				},
			};

			expect(pollFailureFromError(error, now).retryAfterMs).toBe(5 * 60_000);
		});

		test('prefers retryAfterMs over resetsAtEpochMs when both hints are declared', () => {
			const error = {
				failure: {
					cause: 'quota-exhausted',
					retryAfterMs: 30_000,
					resetsAtEpochMs: now.getTime() + 5 * 60_000,
				},
			};

			expect(pollFailureFromError(error, now).retryAfterMs).toBe(30_000);
		});

		test.each<[string, unknown]>([
			['a zero retryAfterMs, which asks for no wait at all', { retryAfterMs: 0 }],
			['a negative retryAfterMs', { retryAfterMs: -5 }],
			['a non-numeric retryAfterMs', { retryAfterMs: 'soon' }],
			['an elapsed resetsAtEpochMs', { resetsAtEpochMs: now.getTime() - 1_000 }],
			['a non-finite resetsAtEpochMs', { resetsAtEpochMs: Number.NaN }],
		])('asks for no wait on %s, leaving the delay to the backoff curve', (_name, hints) => {
			const error = {
				response: { headers: { 'retry-after': '120' } },
				failure: { cause: 'rate-limited', ...(hints as object) },
			};

			expect(pollFailureFromError(error, now)).toEqual({
				type: 'transient',
				retryAfterMs: null,
				cause: 'rate-limited',
			});
		});

		test('reads a declaration off a nested cause', () => {
			const error = { cause: { cause: { failure: { cause: 'temporarily-unavailable' } } } };

			expect(pollFailureFromError(error, now)).toEqual({
				type: 'transient',
				retryAfterMs: null,
				cause: 'temporarily-unavailable',
			});
		});

		test.each<[string, unknown]>([
			['an unknown cause', { cause: 'gremlins' }],
			['a missing cause', { retryAfterMs: 30_000 }],
			['a non-object failure', 'rate-limited'],
		])(
			'ignores a malformed declaration with %s and falls back to the heuristics',
			(_name, failure) => {
				const error = { httpCode: 403, failure };

				expect(pollFailureFromError(error, now)).toEqual({
					type: 'permanent',
					retryAfterMs: null,
				});
			},
		);
	});
});

describe('computeBackoffDelayMs', () => {
	describe('transient', () => {
		test.each([
			[1, backoff(1, { maxMs: MAX_BACKOFF_MS })],
			[2, backoff(2, { maxMs: MAX_BACKOFF_MS })],
			[3, backoff(3, { maxMs: MAX_BACKOFF_MS })],
		])(
			'grows exponentially with the failure count (attempt %d)',
			(consecutiveErrors, expectedMs) => {
				const delayMs = computeBackoffDelayMs({
					type: 'transient',
					consecutiveErrors,
					retryAfterMs: null,
				});

				expect(delayMs).toBe(expectedMs);
			},
		);

		test('caps the curve at MAX_BACKOFF_MS under a long failure streak', () => {
			const delayMs = computeBackoffDelayMs({
				type: 'transient',
				consecutiveErrors: 50,
				retryAfterMs: null,
			});

			expect(delayMs).toBe(MAX_BACKOFF_MS);
		});

		test('keeps the curve when Retry-After asks for less than it', () => {
			const curveMs = backoff(1, { maxMs: MAX_BACKOFF_MS });

			const delayMs = computeBackoffDelayMs({
				type: 'transient',
				consecutiveErrors: 1,
				retryAfterMs: curveMs - 1_000,
			});

			expect(delayMs).toBe(curveMs);
		});

		test('raises the delay to Retry-After when it asks for more than the curve', () => {
			const delayMs = computeBackoffDelayMs({
				type: 'transient',
				consecutiveErrors: 1,
				retryAfterMs: 120_000,
			});

			expect(delayMs).toBe(120_000);
		});

		test('caps a Retry-After ask at RETRY_AFTER_MAX_MS, which may exceed MAX_BACKOFF_MS', () => {
			const delayMs = computeBackoffDelayMs({
				type: 'transient',
				consecutiveErrors: 1,
				retryAfterMs: RETRY_AFTER_MAX_MS * 2,
			});

			expect(delayMs).toBe(RETRY_AFTER_MAX_MS);
			expect(RETRY_AFTER_MAX_MS).toBeGreaterThan(MAX_BACKOFF_MS);
		});

		test.each([0, -1])(
			'resolves to now itself when consecutiveErrors is %d and there is no Retry-After',
			(consecutiveErrors) => {
				const delayMs = computeBackoffDelayMs({
					type: 'transient',
					consecutiveErrors,
					retryAfterMs: null,
				});

				expect(delayMs).toBe(0);
			},
		);
	});

	describe('permanent', () => {
		test.each([1, 100])(
			'sits at MAX_BACKOFF_MS from the first failure regardless of the count (attempt %d)',
			(consecutiveErrors) => {
				const delayMs = computeBackoffDelayMs({
					type: 'permanent',
					consecutiveErrors,
					retryAfterMs: null,
				});

				expect(delayMs).toBe(MAX_BACKOFF_MS);
			},
		);

		test('ignores a Retry-After value even when it asks for more than MAX_BACKOFF_MS', () => {
			const delayMs = computeBackoffDelayMs({
				type: 'permanent',
				consecutiveErrors: 1,
				retryAfterMs: RETRY_AFTER_MAX_MS,
			});

			expect(delayMs).toBe(MAX_BACKOFF_MS);
		});
	});
});
