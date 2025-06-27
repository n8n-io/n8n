import { defineConfig as defineVitestConfig } from 'vitest/config';
import { coverage, enableCoverage } from './common.mjs';

/**
 * Define a Vitest configuration
 * @param {import('vitest/node').InlineConfig} options - The options to pass to the Vitest configuration
 * @returns {import('vite').UserConfig}
 */
export const createVitestConfig = (options = {}) => {
	const vitestConfig = defineVitestConfig({
		test: {
			silent: true,
			globals: true,
			coverage,
			...options,
		},
	});

	enableCoverage(vitestConfig);

	return vitestConfig;
};

export const vitestConfig = createVitestConfig();
