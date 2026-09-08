import { mergeConfig } from 'vite';

import { baseConfig } from './vitest.config.base';

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
