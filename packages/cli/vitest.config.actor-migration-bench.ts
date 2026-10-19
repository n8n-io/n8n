import { mergeConfig } from 'vite';

import { baseConfig } from './vitest.config.base';

/**
 * Timing harness for the `user` to `actor` migration paths. It is not part of
 * any test suite: run it on demand with `pnpm bench:actor-migration:sqlite` or
 * `pnpm bench:actor-migration:postgres`. One file, one process, long timeouts.
 */
const isPostgres = process.env.DB_TYPE === 'postgresdb';

const benchConfig = mergeConfig(baseConfig, {
	test: {
		include: ['test/benchmarks/actor-migration/**/*.bench.test.ts'],
		testTimeout: 3_600_000,
		hookTimeout: 3_600_000,
		fileParallelism: false,
		setupFiles: isPostgres ? ['./test/setup-migration-database.ts'] : [],
	},
});

export default {
	...benchConfig,
	test: {
		...benchConfig.test,
		globalSetup: isPostgres ? ['./test/setup-testcontainers.ts'] : ['./test/global-setup.ts'],
	},
};
