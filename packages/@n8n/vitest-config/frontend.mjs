import { defineConfig as defineVitestConfig } from 'vitest/config';

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
			environment: 'jsdom',
			setupFiles: ['./src/__tests__/setup.ts'],
			coverage: {
				enabled: false,
				all: false,
				provider: 'v8',
				reporter: ['text-summary', 'lcov', 'html-spa'],
			},
			css: {
				modules: {
					classNameStrategy: 'non-scoped',
				},
			},
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
