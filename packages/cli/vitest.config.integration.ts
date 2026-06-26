import { mergeConfig } from 'vite';

import { baseConfig } from './vitest.config.base';

/**
 * Integration test suite, mirroring the former `jest.config.integration.js`:
 * the integration/migration directories plus `*.integration.test.ts` in `src`.
 */
export default mergeConfig(baseConfig, {
	test: {
		include: ['test/integration/**/*.test.ts', 'src/**/*.integration.test.ts'],
		testTimeout: 10_000,
	},
});
