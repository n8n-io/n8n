import { mergeConfig } from 'vite';
import { baseConfig } from './vitest.config.base';

const integrationTcConfig = mergeConfig(baseConfig, {
	test: {
		include: ['test/integration/**/*.test.ts', 'src/**/*.integration.test.ts'],
		testTimeout: 30_000,
	},
});

export default {
	...integrationTcConfig,
	test: {
		...integrationTcConfig.test,
		globalSetup: ['./test/setup-testcontainers.ts'],
	},
};
