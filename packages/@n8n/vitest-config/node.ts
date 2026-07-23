import { createRequire } from 'node:module';
import { join } from 'node:path';
import type { Alias } from 'vite';
import { coverageConfigDefaults, defineConfig } from 'vitest/config';
import type { InlineConfig } from 'vitest/node';

import { coverageExcludes } from './coverage-excludes.js';

/**
 * Pin dual-build (ESM+CJS) deps to their CJS entry so a single class identity is shared
 * across test/source (which ESM-import the dep) and externalized workspace dist (which
 * `require()`s the CJS build) — otherwise cross-boundary `instanceof` checks fail. Vite's
 * externalizer always prefers a dep's `import` export condition, so the two sides land on
 * different files; rewriting the bare specifier to a concrete CJS path is the only way to
 * unify them. Resolved from the consuming package (cwd) so it tracks the catalog version.
 * The exact-match regex leaves subpaths (e.g. `zod/v4`) on their normal resolution. Deps
 * not resolvable from the package are skipped (harmless — they can't be imported there).
 */
export const cjsPinAliases = (deps: string[], from: string = process.cwd()): Alias[] => {
	const req = createRequire(join(from, 'noop.js'));
	return deps.flatMap((dep) => {
		try {
			return [{ find: new RegExp(`^${dep}$`), replacement: req.resolve(dep) }];
		} catch {
			return [];
		}
	});
};

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
	// Restore `vi.spyOn` spies to their original implementation before each test, so
	// spies set up once don't leak across tests. Packages may override via `options`.
	restoreMocks: true,
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

export const createVitestConfig = (
	options: InlineConfig = {},
	{ pinCjs = [] }: { pinCjs?: string[] } = {},
) =>
	defineConfig({
		test: createBaseInlineConfig(options),
		...(pinCjs.length ? { resolve: { alias: cjsPinAliases(pinCjs) } } : {}),
	});

export const vitestConfig = createVitestConfig();
