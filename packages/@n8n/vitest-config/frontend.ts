import { fileURLToPath } from 'node:url';
import { coverageConfigDefaults, defineConfig } from 'vitest/config';
import type { InlineConfig } from 'vitest/node';

import { coverageExcludes } from './coverage-excludes.js';

// Resolves to the empty component that stands in for `.svg` imports (see below).
const svgStub = fileURLToPath(new URL('./svg-stub.js', import.meta.url));

export const createVitestConfig = (options: InlineConfig = {}) => {
	const vitestConfig = defineConfig({
		test: {
			// Redirect the node-icon `.svg` imports (the ~80 files under
			// `N8nIcon/nodes/`) to an inert component. `node-icons.ts` is imported
			// lazily (on the first `node:*` icon render), so its bulk async
			// `vite-svg-loader` transforms can kick off late and resolve after jsdom
			// tears down — failing an otherwise-green run with `EnvironmentTeardownError`.
			// Scoped to `nodes/` because those icons never appear in component
			// snapshots (unlike the eagerly-imported `custom/` icons), and to
			// `test.alias` so it never leaks into production/dev builds. See svg-stub.ts.
			alias: [{ find: /^.*\/nodes\/[^/]+\.svg(\?.*)?$/, replacement: svgStub }],
			silent: true,
			globals: true,
			// Restore `vi.spyOn` spies to their original implementation before each test, so
			// spies set up once don't leak across tests. Packages may override via `options`.
			restoreMocks: true,
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
