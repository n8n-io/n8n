import { mergeConfig } from 'vite';

import { baseConfig } from './vitest.config.base';

/**
 * Unit test suite (default `vitest run`). Everything under `src` except the
 * integration tests, mirroring the former `jest.config.unit.js`.
 */
export default mergeConfig(baseConfig, {
	test: {
		include: ['src/**/*.{test,spec}.ts'],
		exclude: ['**/*.integration.test.ts'],
	},
});
