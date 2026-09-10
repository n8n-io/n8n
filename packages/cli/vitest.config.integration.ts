import { mergeConfig } from 'vite';

import { baseConfig } from './vitest.config.base';

export default mergeConfig(baseConfig, {
	test: {
		include: ['test/integration/**/*.test.ts', 'src/**/*.integration.test.ts'],
		testTimeout: 10_000,
		// Loading modules and building the entity schema in `beforeAll` routinely
		// runs past Vitest's 10s hook default, which reads as broken coverage
		// (whole suite skipped) rather than a slow setup.
		hookTimeout: 30_000,
	},
});
