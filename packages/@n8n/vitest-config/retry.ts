import type { InlineConfig } from 'vitest/node';

/** Retries each failed test `VITEST_RETRY` times. CI sets it in the merge queue only. */
export const retryConfig = (value = process.env.VITEST_RETRY): InlineConfig => {
	const count = Number(value);
	return Number.isInteger(count) && count > 0 ? { retry: count } : {};
};
