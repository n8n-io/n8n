import { backoff } from '@n8n/scheduler';
import type { INode } from 'n8n-workflow';
import { NodeApiError } from 'n8n-workflow';

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
	test.each([
		['401', 'permanent'],
		['403', 'permanent'],
		['429', 'transient'],
		['408', 'transient'],
		['500', 'transient'],
		['503', 'transient'],
	])('classifies a NodeApiError with httpCode %s as %s', (httpCode, expected) => {
		const error = new NodeApiError(node, {}, { httpCode });

		expect(classifyPollFailure(error)).toBe(expected);
	});

	test('classifies a network error with no status as transient', () => {
		const error = Object.assign(new Error('connect ECONNREFUSED'), { code: 'ECONNREFUSED' });

		expect(classifyPollFailure(error)).toBe('transient');
	});

	test.each([
		['a plain string', 'boom'],
		['undefined', undefined],
		['a bare object', {}],
	])('classifies %s as transient', (_name, thrown) => {
		expect(classifyPollFailure(thrown)).toBe('transient');
	});

	test.each([
		[401, 'permanent'],
		[403, 'permanent'],
		[500, 'transient'],
	])(
		'falls back to an axios-shaped response.status of %s when there is no NodeApiError',
		(status, expected) => {
			const error = { response: { status } };

			expect(classifyPollFailure(error)).toBe(expected);
		},
	);
});

describe('retryAfterMs', () => {
	const now = new Date('2026-08-05T12:00:00.000Z');

	test('returns null when there is no Retry-After header anywhere', () => {
		const error = new NodeApiError(node, {});

		expect(retryAfterMs(error, now)).toBeNull();
	});

	describe('delay-seconds form, across the header walk', () => {
		test('reads a raw axios-shaped error.response.headers', () => {
			const error = { response: { headers: { 'retry-after': '120' } } };

			expect(retryAfterMs(error, now)).toBe(120_000);
		});

		test('reads error.cause.response.headers on a NodeApiError wrapping an Error', () => {
			const cause = Object.assign(new Error('rate limited'), {
				response: { headers: { 'retry-after': '120' } },
			});
			const error = new NodeApiError(node, cause);

			expect(retryAfterMs(error, now)).toBe(120_000);
		});

		test('reads error.errorResponse.response.headers on a NodeApiError wrapping a plain response', () => {
			const error = new NodeApiError(node, { response: { headers: { 'retry-after': '120' } } });

			expect(retryAfterMs(error, now)).toBe(120_000);
		});

		test('reads error.errorResponse.reason.response.headers for the nested-axios shape', () => {
			const error = new NodeApiError(node, {
				reason: { isAxiosError: true, response: { headers: { 'retry-after': '120' } } },
			});

			expect(retryAfterMs(error, now)).toBe(120_000);
		});
	});

	describe('HTTP-date form', () => {
		test('resolves an HTTP-date against the injected now', () => {
			const error = {
				response: { headers: { 'retry-after': 'Wed, 05 Aug 2026 12:02:00 GMT' } },
			};

			expect(retryAfterMs(error, now)).toBe(120_000);
		});

		test('returns null for an HTTP-date in the past', () => {
			const error = {
				response: { headers: { 'retry-after': 'Wed, 05 Aug 2026 11:58:00 GMT' } },
			};

			expect(retryAfterMs(error, now)).toBeNull();
		});
	});

	test.each(['Retry-After', 'retry-after', 'RETRY-AFTER', 'Retry-AFTER'])(
		'is case-insensitive on the header name %s',
		(headerName) => {
			const error = { response: { headers: { [headerName]: '30' } } };

			expect(retryAfterMs(error, now)).toBe(30_000);
		},
	);

	test.each([
		['a non-numeric value', 'soon'],
		['a negative value', '-5'],
		['a zero value', '0'],
	])('returns null for %s', (_name, value) => {
		const error = { response: { headers: { 'retry-after': value } } };

		expect(retryAfterMs(error, now)).toBeNull();
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
	});

	describe('permanent', () => {
		test.each([1, 2, 10, 100])(
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
	});
});
