import { defineConfig as defineVitestConfig } from 'vitest/config';
import { coverage } from './common.mjs';

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

	if (process.env.COVERAGE_ENABLED === 'true') {
		const { coverage } = vitestConfig.test;
		coverage.enabled = true;
		if (process.env.CI === 'true') {
			coverage.all = true;
			coverage.reporter = ['cobertura'];
		}
	}

	return vitestConfig;
};

export const vitestConfig = createVitestConfig();
