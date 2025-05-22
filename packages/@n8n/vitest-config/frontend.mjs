import { defineConfig as defineVitestConfig } from 'vitest/config';

/**
 * Define a Vitest configuration
 *
 * @returns {import('vitest/node').UserConfig}
 */
export const vitestConfig = defineVitestConfig({
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
