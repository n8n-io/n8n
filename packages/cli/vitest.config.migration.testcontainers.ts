import { mergeConfig } from 'vite';

import { baseConfig } from './vitest.config.base';

// On Postgres, each test file gets its own database, so the files run in parallel.
// SQLite files share one database file, so they run one at a time.
const isPostgres = process.env.DB_TYPE === 'postgresdb';

const migrationTcConfig = mergeConfig(baseConfig, {
	test: {
		include: ['test/migration/**/*.test.ts'],
		testTimeout: 30_000,
		hookTimeout: 30_000,
		fileParallelism: isPostgres,
		setupFiles: isPostgres ? ['./test/setup-migration-database.ts'] : [],
	},
});

export default {
	...migrationTcConfig,
	test: {
		...migrationTcConfig.test,
		globalSetup: ['./test/setup-testcontainers.ts'],
	},
};
