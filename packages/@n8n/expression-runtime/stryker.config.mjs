import defaultConfig from '../../../scripts/mutation-health/stryker.default.mjs';

/** @type {import('@stryker-mutator/api/core').PartialStrykerOptions} */
export default {
	...defaultConfig,
	// See vitest.stryker.config.ts: the isolates need the `forks` pool.
	vitest: { configFile: 'vitest.stryker.config.ts' },
};
