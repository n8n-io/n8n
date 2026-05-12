import { mergeConfig } from 'vite';

import { baseConfig } from './vitest.config.base';

/**
 * Performance benchmarks. Excluded from the normal unit/integration runs because
 * they seed large corpora and take minutes. Run explicitly:
 *   pnpm test:performance
 */
export default mergeConfig(baseConfig, {
	test: {
		include: ['test/performance/**/*.perf.ts'],
		testTimeout: 1_800_000,
		hookTimeout: 1_800_000,
		// Benchmarks measure wall-clock latency; parallel files would contend.
		fileParallelism: false,
	},
});
