import { mergeConfig } from 'vite';

import { baseConfig } from './vitest.config.base';

export default mergeConfig(baseConfig, {
	test: {
		include: ['src/**/*.{test,spec}.ts', 'test/unit/**/*.{test,spec}.ts'],
		exclude: ['**/*.integration.test.ts'],
	},
});
