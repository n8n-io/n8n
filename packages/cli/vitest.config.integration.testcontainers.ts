import { mergeConfig } from 'vite';
import { baseConfig } from './vitest.config.base';

const integrationTcConfig = mergeConfig(baseConfig, {
	test: {
		include: ['test/integration/**/*.test.ts', 'src/**/*.integration.test.ts'],
		testTimeout: 30_000,
		// Same as the SQLite integration config: module loading in `beforeAll` can
		// run past Vitest's 10s hook default on a busy runner and skip the whole file.
		hookTimeout: 30_000,
	},
});

export default {
	...integrationTcConfig,
	test: {
		...integrationTcConfig.test,
		globalSetup: ['./test/setup-testcontainers.ts'],
	},
};
