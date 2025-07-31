import { defineConfig } from 'vitest/config';
import type { InlineConfig } from 'vitest/node';

export const createVitestConfig = (options: InlineConfig = {}) => {
	const isCoverageEnabled = process.env.COVERAGE_ENABLED === 'true';
	const isCI = process.env.CI === 'true';

	const vitestConfig = defineConfig({
		test: {
			silent: true,
			globals: true,
			environment: 'node',
			...(isCoverageEnabled
				? {
						coverage: {
							enabled: true,
							provider: 'v8',
							reporter: isCI ? ['cobertura'] : ['text-summary', 'lcov', 'html-spa'],
							all: true,
							thresholds: {
								branches: 80,
								functions: 80,
								lines: 80,
								statements: 80,
							},
							include: ['src/**/*.{js,ts}'],
							exclude: [
								'src/**/__tests__/**',
								'src/**/*.test.{js,ts}',
								'src/**/*.spec.{js,ts}',
								'src/**/types.ts',
								'src/**/*.d.ts',
							],
						},
					}
				: {}),
			...options,
		},
	});

	return vitestConfig;
};

export const vitestConfig = createVitestConfig();
