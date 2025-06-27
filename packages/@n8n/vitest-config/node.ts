import { defineConfig } from 'vitest/config';
import type { InlineConfig } from 'vitest/node';

export const createVitestConfig = (options: InlineConfig = {}) => {
	const vitestConfig = defineConfig({
		test: {
			silent: true,
			globals: true,
			environment: 'node',
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
			...options,
		},
	});

	return vitestConfig;
};

export const vitestConfig = createVitestConfig();
