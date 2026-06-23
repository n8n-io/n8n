import { coverageConfigDefaults, defineConfig } from 'vitest/config';
import type { InlineConfig } from 'vitest/node';

import { coverageExcludes } from './coverage-excludes.js';

export const createVitestConfig = (options: InlineConfig = {}) => {
	const vitestConfig = defineConfig({
		test: {
			silent: true,
			globals: true,
			environment: 'jsdom',
			setupFiles: ['./src/__tests__/setup.ts'],
			reporters: process.env.CI === 'true' ? ['default', 'junit'] : ['default'],
			outputFile: { junit: './junit.xml' },
			coverage: {
				enabled: false,
				include: ['src/**/*.{ts,vue}'],
				exclude: [...coverageConfigDefaults.exclude, ...coverageExcludes],
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
			coverage.include = ['src/**/*.{ts,vue}'];
			coverage.reporter = ['lcov'];
		}
	}

	return vitestConfig;
};

export const vitestConfig = createVitestConfig();
