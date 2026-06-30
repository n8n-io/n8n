import { mergeConfig } from 'vite';

import { baseConfig } from './vitest.config.base';

/**
 * Migration test suite, mirroring the former `jest.config.migration.js`.
 * Migration tests share a database and perform rollbacks, so they must run
 * sequentially in a single process (the equivalent of Jest's `maxWorkers: 1`).
 */
export default mergeConfig(baseConfig, {
	test: {
		include: ['test/migration/**/*.test.ts'],
		// Migration suites do heavy DB work; some files previously set a 20s timeout
		// via `jest.setTimeout`. Apply it suite-wide for both tests and hooks.
		testTimeout: 20_000,
		hookTimeout: 20_000,
		fileParallelism: false,
		poolOptions: {
			forks: { singleFork: true },
		},
	},
});
