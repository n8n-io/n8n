import { defineConfig } from 'vitest/config';
import type { InlineConfig } from 'vitest/node';

export const createVitestConfig = (options: InlineConfig = {}) => {
	const vitestConfig = defineConfig({
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

	if (process.env.COVERAGE_ENABLED === 'true' && vitestConfig.test?.coverage) {
		const { coverage } = vitestConfig.test;
		coverage.enabled = true;
		if (process.env.CI === 'true' && coverage.provider === 'v8') {
			coverage.all = true;
			coverage.reporter = ['cobertura'];
		}
	}

	return vitestConfig;
};

export const vitestConfig = createVitestConfig();
