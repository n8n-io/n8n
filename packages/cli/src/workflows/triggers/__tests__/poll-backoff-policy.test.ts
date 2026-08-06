import { backoff } from '@n8n/scheduler';
import type { INode, JsonObject } from 'n8n-workflow';
import { NodeApiError, NodeOperationError } from 'n8n-workflow';

import {
	classifyPollFailure,
	computeBackoffUntil,
	MAX_BACKOFF_MS,
	retryAfterMs,
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

describe('classifyPollFailure', () => {
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
			'a NodeApiError with httpCode 500',
			new NodeApiError(node, {}, { httpCode: '500' }),
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
		['a non-integer response.status', { response: { status: 401.5 } }, 'transient'],
		['a negative response.status', { response: { status: -401 } }, 'transient'],
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
		[
			'httpCode over a conflicting response.status',
			{ httpCode: '401', response: { status: 500 } },
			'permanent',
		],
		['httpCode as a number rather than a string', { httpCode: 401 }, 'permanent'],
		[
			'the direct response over a conflicting error.cause.response',
			{ response: { status: 500 }, cause: { response: { status: 401 } } },
			'transient',
		],
		[
			'httpCode off error.errorResponse rather than error.cause',
			{ errorResponse: { httpCode: '403' } },
			'permanent',
		],
		[
			'an httpCode on a later candidate over a conflicting response.status on an earlier one',
			{ response: { status: 500 }, cause: { httpCode: '401' } },
			'permanent',
		],
		[
			'an httpCode on an earlier candidate over a conflicting response.status on a later one',
			{ httpCode: '401', cause: { response: { status: 500 } } },
			'permanent',
		],
	])('classifies %s as %s', (_name, thrown, expected) => {
		expect(classifyPollFailure(thrown, null)).toBe(expected);
	});

	test.each([401, 403])(
		'classifies a %s carrying a parseable Retry-After as transient',
		(httpCode) => {
			const error = { httpCode, response: { headers: { 'retry-after': '120' } } };

			expect(classifyPollFailure(error, retryAfterMs(error, now))).toBe('transient');
		},
	);

	test.each([401, 403])('classifies a %s with no Retry-After as permanent', (httpCode) => {
		const error = { httpCode };

		expect(classifyPollFailure(error, retryAfterMs(error, now))).toBe('permanent');
	});

	test('classifies a 403 carrying an unparseable Retry-After as permanent', () => {
		const error = { httpCode: 403, response: { headers: { 'retry-after': 'soon' } } };

		expect(classifyPollFailure(error, retryAfterMs(error, now))).toBe('permanent');
	});
});

describe('retryAfterMs', () => {
	const now = new Date('2026-08-05T12:00:00.000Z');

	test('returns null when there is no Retry-After header anywhere', () => {
		const error = new NodeApiError(node, {});

		expect(retryAfterMs(error, now)).toBeNull();
	});

	// Each covers a different hop of the candidate walk: direct response, a
	// wrapped Error's response, and the two NodeApiError errorResponse shapes.
	test.each<[string, unknown]>([
		[
			'a raw axios-shaped error.response.headers',
			{ response: { headers: { 'retry-after': '120' } } },
		],
		[
			'error.cause.response.headers on a NodeApiError wrapping an Error',
			new NodeApiError(
				node,
				Object.assign(new Error('rate limited'), {
					response: { headers: { 'retry-after': '120' } },
				}) as unknown as JsonObject,
			),
		],
		[
			'error.errorResponse.response.headers on a NodeApiError wrapping a plain response',
			new NodeApiError(node, { response: { headers: { 'retry-after': '120' } } }),
		],
		[
			'error.errorResponse.reason.response.headers for the nested-axios shape',
			new NodeApiError(node, {
				reason: { isAxiosError: true, response: { headers: { 'retry-after': '120' } } },
			}),
		],
	])('reads %s', (_name, error) => {
		expect(retryAfterMs(error, now)).toBe(120_000);
	});

	test.each<[string, number | null]>([
		['Wed, 05 Aug 2026 12:02:00 GMT', 120_000],
		['Wed, 05 Aug 2026 11:58:00 GMT', null],
	])('resolves the HTTP-date form %s against the injected now', (httpDate, expected) => {
		const error = { response: { headers: { 'retry-after': httpDate } } };

		expect(retryAfterMs(error, now)).toBe(expected);
	});

	test.each(['Retry-After', 'retry-after', 'RETRY-AFTER', 'Retry-AFTER'])(
		'is case-insensitive on the header name %s',
		(headerName) => {
			const error = { response: { headers: { [headerName]: '30' } } };

			expect(retryAfterMs(error, now)).toBe(30_000);
		},
	);

	test.each<[string, unknown, number | null]>([
		['a non-numeric value', 'soon', null],
		['a negative value', '-5', null],
		['a zero value', '0', null],
		['an array-valued header, reading its first entry', ['120', '60'], 120_000],
		['a value with surrounding whitespace', '  120  ', 120_000],
		[
			'a very large value, uncapped here; capping is left to computeBackoffUntil',
			'999999999',
			999_999_999 * 1000,
		],
	])('resolves %s to %s', (_name, value, expected) => {
		const error = { response: { headers: { 'retry-after': value } } };

		expect(retryAfterMs(error, now)).toBe(expected);
	});

	test.each<[string, unknown, number]>([
		[
			'the direct response header over a conflicting error.cause.response one',
			{
				response: { headers: { 'retry-after': '60' } },
				cause: { response: { headers: { 'retry-after': '999' } } },
			},
			60_000,
		],
		[
			'a Retry-After nested two levels deep, at error.cause.cause.response.headers',
			{ cause: { cause: { response: { headers: { 'retry-after': '120' } } } } },
			120_000,
		],
		[
			'past an unparseable header on a shallower candidate to a parseable one deeper',
			{
				response: { headers: { 'retry-after': 'soon' } },
				cause: { response: { headers: { 'retry-after': '60' } } },
			},
			60_000,
		],
	])('prefers %s', (_name, error, expected) => {
		expect(retryAfterMs(error, now)).toBe(expected);
	});

	test('terminates instead of hanging on a cyclic error.cause', () => {
		const error: Record<string, unknown> = { response: { headers: { 'retry-after': '60' } } };
		error.cause = error;

		expect(retryAfterMs(error, now)).toBe(60_000);
	});
});

describe('computeBackoffUntil', () => {
	const now = new Date('2026-08-05T12:00:00.000Z');

	describe('transient', () => {
		test.each([
			[1, backoff(1, { maxMs: MAX_BACKOFF_MS })],
			[2, backoff(2, { maxMs: MAX_BACKOFF_MS })],
			[3, backoff(3, { maxMs: MAX_BACKOFF_MS })],
		])(
			'grows exponentially with the failure count (attempt %d)',
			(consecutiveErrors, expectedMs) => {
				const until = computeBackoffUntil({
					failureClass: 'transient',
					consecutiveErrors,
					retryAfterMs: null,
					now,
				});

				expect(until.getTime()).toBe(now.getTime() + expectedMs);
			},
		);

		test('caps the curve at MAX_BACKOFF_MS under a long failure streak', () => {
			const until = computeBackoffUntil({
				failureClass: 'transient',
				consecutiveErrors: 50,
				retryAfterMs: null,
				now,
			});

			expect(until.getTime()).toBe(now.getTime() + MAX_BACKOFF_MS);
		});

		test('keeps the curve when Retry-After asks for less than it', () => {
			const curveMs = backoff(1, { maxMs: MAX_BACKOFF_MS });

			const until = computeBackoffUntil({
				failureClass: 'transient',
				consecutiveErrors: 1,
				retryAfterMs: curveMs - 1_000,
				now,
			});

			expect(until.getTime()).toBe(now.getTime() + curveMs);
		});

		test('raises the delay to Retry-After when it asks for more than the curve', () => {
			const until = computeBackoffUntil({
				failureClass: 'transient',
				consecutiveErrors: 1,
				retryAfterMs: 120_000,
				now,
			});

			expect(until.getTime()).toBe(now.getTime() + 120_000);
		});

		test('caps a Retry-After ask at RETRY_AFTER_MAX_MS, which may exceed MAX_BACKOFF_MS', () => {
			const until = computeBackoffUntil({
				failureClass: 'transient',
				consecutiveErrors: 1,
				retryAfterMs: RETRY_AFTER_MAX_MS * 2,
				now,
			});

			expect(until.getTime()).toBe(now.getTime() + RETRY_AFTER_MAX_MS);
			expect(RETRY_AFTER_MAX_MS).toBeGreaterThan(MAX_BACKOFF_MS);
		});

		test.each([0, -1])(
			'resolves to now itself when consecutiveErrors is %d and there is no Retry-After',
			(consecutiveErrors) => {
				const until = computeBackoffUntil({
					failureClass: 'transient',
					consecutiveErrors,
					retryAfterMs: null,
					now,
				});

				expect(until.getTime()).toBe(now.getTime());
			},
		);
	});

	describe('permanent', () => {
		test.each([1, 100])(
			'sits at MAX_BACKOFF_MS from the first failure regardless of the count (attempt %d)',
			(consecutiveErrors) => {
				const until = computeBackoffUntil({
					failureClass: 'permanent',
					consecutiveErrors,
					retryAfterMs: null,
					now,
				});

				expect(until.getTime()).toBe(now.getTime() + MAX_BACKOFF_MS);
			},
		);

		test('ignores a Retry-After value even when it asks for more than MAX_BACKOFF_MS', () => {
			const until = computeBackoffUntil({
				failureClass: 'permanent',
				consecutiveErrors: 1,
				retryAfterMs: RETRY_AFTER_MAX_MS,
				now,
			});

			expect(until.getTime()).toBe(now.getTime() + MAX_BACKOFF_MS);
		});
	});
});
