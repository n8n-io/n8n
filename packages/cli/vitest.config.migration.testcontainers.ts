import { mergeConfig } from 'vite';

import { baseConfig } from './vitest.config.base';

/**
 * Migration tests against a postgres container started via testcontainers,
 * mirroring `jest.config.migration.testcontainers.js`. Runs sequentially in a
 * single process; the testcontainers global setup replaces the nock global
 * setup (matching the old jest config).
 */
const migrationTcConfig = mergeConfig(baseConfig, {
	test: {
		include: ['test/migration/**/*.test.ts'],
		testTimeout: 30_000,
		hookTimeout: 30_000,
		fileParallelism: false,
		poolOptions: {
			forks: { singleFork: true },
		},
	},
});

export default {
	...migrationTcConfig,
	test: {
		...migrationTcConfig.test,
		globalSetup: ['./test/setup-testcontainers.ts'],
	},
};
