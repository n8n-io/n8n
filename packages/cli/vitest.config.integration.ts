import { mergeConfig } from 'vite';

import { baseConfig } from './vitest.config.base';

export default mergeConfig(baseConfig, {
	test: {
		include: ['test/integration/**/*.test.ts', 'src/**/*.integration.test.ts'],
		testTimeout: 10_000,
	},
});
