import {
	flexRetryDelayMs,
	isFlexUnavailable,
	MAX_FLEX_UNAVAILABLE_RETRIES,
} from '../flex-unavailable';

describe('isFlexUnavailable', () => {
	it('detects the code on the error', () => {
		expect(isFlexUnavailable(Object.assign(new Error('x'), { code: 'flex_unavailable' }))).toBe(
			true,
		);
	});

	it('detects the code in the payload of a stream provider error', () => {
		const error = Object.assign(new Error('Flex processing is temporarily unavailable.'), {
			data: {
				type: 'error',
				error: { type: 'resource_unavailable', code: 'flex_unavailable', message: 'x' },
			},
		});
		expect(isFlexUnavailable(error)).toBe(true);
	});

	it('detects the code on a wrapped cause', () => {
		const cause = Object.assign(new Error('inner'), { code: 'flex_unavailable' });
		expect(isFlexUnavailable(new Error('outer', { cause }))).toBe(true);
	});

	it.each([
		undefined,
		null,
		'flex_unavailable',
		new Error('Flex processing is temporarily unavailable'),
		Object.assign(new Error('x'), { code: 'rate_limit_exceeded' }),
	])('ignores %p', (error) => {
		expect(isFlexUnavailable(error)).toBe(false);
	});
});

describe('flexRetryDelayMs', () => {
	it('doubles from one second and stops at thirty seconds', () => {
		expect([0, 1, 2, 3, 4, 5, 6].map(flexRetryDelayMs)).toEqual([
			1000, 2000, 4000, 8000, 16_000, 30_000, 30_000,
		]);
	});

	it('keeps the total wait within a few minutes', () => {
		const total = Array.from({ length: MAX_FLEX_UNAVAILABLE_RETRIES }, (_, i) =>
			flexRetryDelayMs(i),
		).reduce((sum, ms) => sum + ms, 0);
		expect(total).toBeLessThanOrEqual(5 * 60_000);
	});
});
