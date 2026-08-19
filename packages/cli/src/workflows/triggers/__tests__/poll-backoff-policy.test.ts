import { markNonRetryable } from '@n8n/backend-network';
import { backoff } from '@n8n/scheduler';
import type { INode } from 'n8n-workflow';
import { NodeApiError, NodeOperationError } from 'n8n-workflow';

import {
	computeBackoffUntil,
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
		expect(pollFailureFromError(thrown, now).failureClass).toBe(expected);
	});

	test.each([401, 403])(
		'classifies a %s carrying a parseable Retry-After as transient rate limiting',
		(httpCode) => {
			const error = { httpCode, response: { headers: { 'retry-after': '120' } } };

			expect(pollFailureFromError(error, now)).toEqual({
				failureClass: 'transient',
				retryAfterMs: 120_000,
			});
		},
	);

	test('classifies a 403 carrying an unparseable Retry-After as permanent', () => {
		const error = { httpCode: 403, response: { headers: { 'retry-after': 'soon' } } };

		expect(pollFailureFromError(error, now)).toEqual({
			failureClass: 'permanent',
			retryAfterMs: null,
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
		expect(pollFailureFromError(error, now).failureClass).toBe('permanent');
	});

	test.each<[string, unknown, number | null]>([
		['a delay-seconds value', '120', 120_000],
		['a value with surrounding whitespace', '  120  ', 120_000],
		['an array-valued header, reading its first entry', ['120', '60'], 120_000],
		[
			'a very large value, uncapped here; capping is left to computeBackoffUntil',
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
