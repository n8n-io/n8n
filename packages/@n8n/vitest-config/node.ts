import { defineConfig } from 'vitest/config';
import type { InlineConfig } from 'vitest/node';

/**
 * Shared test options without the outer defineConfig wrapper.
 * Use this when you need to spread the config into workspace projects.
 */
export const createBaseInlineConfig = (options: InlineConfig = {}): InlineConfig => ({
	silent: true,
	globals: true,
	environment: 'node',
	reporters: process.env.CI === 'true' ? ['default', 'junit'] : ['default'],
	outputFile: { junit: './junit.xml' },
	...(process.env.COVERAGE_ENABLED === 'true'
		? {
				coverage: {
					enabled: true,
					provider: 'v8',
					reporter: process.env.CI === 'true' ? 'cobertura' : 'text-summary',
					include: ['src/**/*'],
				},
			}
		: {}),
	...options,
});

export const createVitestConfig = (options: InlineConfig = {}) =>
	defineConfig({ test: createBaseInlineConfig(options) });

export const vitestConfig = createVitestConfig();
