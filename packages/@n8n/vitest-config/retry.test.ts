import { describe, expect, it } from 'vitest';

import { retryConfig } from './retry.js';

describe('retryConfig', () => {
	it('sets the retry count from a positive integer', () => {
		expect(retryConfig({ VITEST_RETRY: '2' })).toEqual({ retry: 2 });
	});

	it('does not retry when VITEST_RETRY is not set', () => {
		expect(retryConfig({})).toEqual({});
	});

	it.each(['', '0', '-1', '1.5', 'abc'])('does not retry for %j', (value) => {
		expect(retryConfig({ VITEST_RETRY: value })).toEqual({});
	});
});
