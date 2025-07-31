import { defineConfig } from 'vitest/config';
import type { InlineConfig } from 'vitest/node';

export const createVitestConfig = (options: InlineConfig = {}) => {
	const isCoverageEnabled = process.env.COVERAGE_ENABLED === 'true';
	const isCI = process.env.CI === 'true';

	const vitestConfig = defineConfig({
		test: {
			silent: true,
			globals: true,
			environment: 'jsdom',
			setupFiles: ['./src/__tests__/setup.ts'],
			coverage: {
				enabled: isCoverageEnabled,
				all: isCoverageEnabled,
				provider: 'v8',
				reporter: isCI ? ['cobertura'] : ['text-summary', 'lcov', 'html-spa'],
				thresholds: isCoverageEnabled
					? {
							branches: 80,
							functions: 80,
							lines: 80,
							statements: 80,
						}
					: undefined,
				include: ['src/**/*.{js,ts,vue}'],
				exclude: [
					'src/__tests__/**',
					'src/**/__tests__/**',
					'src/**/*.test.{js,ts,vue}',
					'src/**/*.spec.{js,ts,vue}',
					'src/**/types.ts',
					'src/**/*.d.ts',
				],
			},
			css: {
				modules: {
					classNameStrategy: 'non-scoped',
				},
			},
			...options,
		},
	});

	return vitestConfig;
};

export const vitestConfig = createVitestConfig();
