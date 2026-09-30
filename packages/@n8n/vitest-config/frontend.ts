import { fileURLToPath } from 'node:url';
import { coverageConfigDefaults, defineConfig } from 'vitest/config';
import type { InlineConfig } from 'vitest/node';

import { changedFileCoverage } from './changed-file-coverage.js';
import { coverageExcludes } from './coverage-excludes.js';
import { profilingConfig, profilingReporters } from './profiling.js';

// Resolves to the empty component that stands in for `.svg` imports (see below).
const svgStub = fileURLToPath(new URL('./svg-stub.js', import.meta.url));

export const createVitestConfig = (options: InlineConfig = {}) => {
	const vitestConfig = defineConfig({
		test: {
			...profilingConfig(),
			// Redirect the node-icon `.svg` imports (the ~80 files under
			// `N8nIcon/nodes/`) to an inert component. `node-icons.ts` is imported
			// lazily (on the first `node:*` icon render), so its bulk async
			// `vite-svg-loader` transforms can kick off late and resolve after jsdom
			// tears down — failing an otherwise-green run with `EnvironmentTeardownError`.
			// Scoped to `nodes/` because those icons never appear in component
			// snapshots (unlike the eagerly-imported `custom/` icons), and to
			// `test.alias` so it never leaks into production/dev builds. See svg-stub.ts.
			alias: [
				{ find: /^.*\/nodes\/[^/]+\.svg(\?.*)?$/, replacement: svgStub },
				// Load `element-plus` from its single-file bundle. Its `es/` entry makes Node evaluate
				// ~980 files in every test file (about 0.25 s each); the bundle has the same 432 exports.
				// A bare replacement resolves from the importer, so a package without `element-plus`
				// is not affected. `vue` stays external to the bundle, so there is one Vue instance.
				// `patches/element-plus@2.4.3.patch` applies the same lockscreen guard to this bundle.
				{ find: /^element-plus$/, replacement: 'element-plus/dist/index.full.mjs' },
			],
			silent: true,
			globals: true,
			// Restore `vi.spyOn` spies to their original implementation before each test, so
			// spies set up once don't leak across tests. Packages may override via `options`.
			restoreMocks: true,
			environment: 'jsdom',
			// CI shards the frontend suite across runners. A package with fewer
			// test files than shards leaves a shard with nothing to run, and vitest
			// treats that as an error — so a sparse package (a freshly scaffolded
			// module, a config-only package) would fail outright. Default it on here so
			// every frontend package inherits it instead of rediscovering the failure.
			passWithNoTests: true,
			setupFiles: ['./src/__tests__/setup.ts'],
			// Inline so vitest maps the `vitest` import inside them to the running instance.
			// Externalized, pnpm can link them to a second vitest copy. Vitest 5 bundles
			// `expect` into `vitest`, so a second copy breaks snapshots and `.rejects`.
			server: { deps: { inline: ['vitest-mock-extended', '@testing-library/jest-dom'] } },
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
			reporters: profilingReporters(
				options.reporters ?? (process.env.CI === 'true' ? ['default', 'junit'] : ['default']),
			),
		},
	});

	if (process.env.COVERAGE_ENABLED === 'true' && vitestConfig.test?.coverage) {
		const { coverage } = vitestConfig.test;
		coverage.enabled = true;
		if (process.env.CI === 'true' && coverage.provider === 'v8') {
			coverage.include = ['src/**/*.{ts,vue}'];
			coverage.reporter = ['lcov'];
		}
		// With a CHANGED_FILES signal (PR runs), measure only the changed files.
		Object.assign(coverage, changedFileCoverage());
	}

	return vitestConfig;
};

export const vitestConfig = createVitestConfig();
