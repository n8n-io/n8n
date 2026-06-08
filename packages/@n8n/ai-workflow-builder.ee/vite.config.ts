import { mergeConfig } from 'vite';
import { defaultExclude } from 'vitest/config';
import { baseConfig } from './vitest.config.base.js';

// Default (unit) config. Integration tests hit real external services and are
// run via `test:integration` (vitest.config.integration.ts), so exclude them here.
export default mergeConfig(baseConfig, {
	test: {
		exclude: [...defaultExclude, '**/*.integration.test.ts'],
	},
});
