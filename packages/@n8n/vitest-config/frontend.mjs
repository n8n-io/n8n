import { defineConfig as defineVitestConfig } from 'vitest/config';

/**
 * Define a Vitest configuration
 * @param {import('vitest/node').InlineConfig} options - The options to pass to the Vitest configuration
 * @returns {import('vite').UserConfig}
 */
export const createVitestConfig = (options = {}) => {
	return defineVitestConfig({
		test: {
			silent: true,
			globals: true,
			environment: 'jsdom',
			setupFiles: ['./src/__tests__/setup.ts'],
			...(process.env.COVERAGE_ENABLED === 'true'
				? {
						coverage: {
							enabled: true,
							provider: 'v8',
							reporter: process.env.CI === 'true' ? 'cobertura' : 'text-summary',
							all: true,
						},
					}
				: {}),
			css: {
				modules: {
					classNameStrategy: 'non-scoped',
				},
			},
			...options,
		},
	});
};

export const vitestConfig = createVitestConfig();
