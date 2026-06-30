import { coverageConfigDefaults, defineConfig } from 'vitest/config';
import type { InlineConfig } from 'vitest/node';

import { coverageExcludes } from './coverage-excludes.js';

/**
 * Per-suite fork-pool cap, applied only in CI.
 *
 * CI runs many package test suites concurrently under turbo. Without a cap, each
 * suite's fork pool is sized to the full core count, so a small runner ends up
 * massively oversubscribed (e.g. ~10 suites × 4 forks on a 4-vCPU box): CPU is
 * pegged for the whole run and timing-sensitive tests flake into timeouts.
 *
 * Capping each suite to half the available cores keeps the product with turbo's
 * `--concurrency` near the core count, and adapts to the runner size instead of
 * a hardcoded value. Off outside CI, so a single-package `pnpm test` keeps full
 * parallelism and behaviour is unchanged.
 */
export const forkPoolOptions = (): InlineConfig => {
	if (process.env.CI !== 'true') return {};
	// Vitest accepts a percentage for `maxWorkers` (half of availableParallelism).
	return { pool: 'forks', maxWorkers: '50%' };
};

/**
 * Shared test options without the outer defineConfig wrapper.
 * Use this when you need to spread the config into workspace projects.
 */
export const createBaseInlineConfig = (options: InlineConfig = {}): InlineConfig => ({
	silent: true,
	globals: true,
	environment: 'node',
	...forkPoolOptions(),
	reporters: process.env.CI === 'true' ? ['default', 'junit'] : ['default'],
	outputFile: { junit: './junit.xml' },
	...(process.env.COVERAGE_ENABLED === 'true'
		? {
				coverage: {
					enabled: true,
					provider: 'v8',
					reporter: process.env.CI === 'true' ? 'lcov' : 'text-summary',
					include: ['src/**/*.ts'],
					exclude: [...coverageConfigDefaults.exclude, ...coverageExcludes],
				},
			}
		: {}),
	...options,
});

export const createVitestConfig = (options: InlineConfig = {}) =>
	defineConfig({ test: createBaseInlineConfig(options) });

export const vitestConfig = createVitestConfig();
