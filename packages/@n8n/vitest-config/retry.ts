import type { InlineConfig } from 'vitest/node';

/** Retries each failed test `VITEST_RETRY` times. CI sets it in the merge queue only. */
export const retryConfig = (env: NodeJS.ProcessEnv = process.env): InlineConfig => {
	const count = Number(env.VITEST_RETRY);
	return Number.isInteger(count) && count > 0 ? { retry: count } : {};
};
