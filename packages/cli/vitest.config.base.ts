import { createVitestConfigWithDecorators } from '@n8n/vitest-config/node-decorators';
import path from 'node:path';
import { mergeConfig } from 'vite';
import { configDefaults } from 'vitest/config';

import { tscEntityTransform } from './vitest.tsc-entity-transform';
import { workspaceDistExternals } from './vitest.workspace-externals';

/**
 * Path aliases mirroring the `paths` entries in `tsconfig.json`, plus the
 * `@n8n/mcp-apps/server` -> source mapping the former jest config used so tests
 * can resolve the specifier without the package's `dist/` being built first.
 *
 * Note on alias order/specificity: Vite matches a string alias only when the
 * import equals it or starts with `alias + '/'`, so `@` matches `@/...` but not
 * `@n8n/...` or `@test/...`. The entries are therefore non-overlapping.
 */
const alias = {
	'@test-integration': path.resolve(__dirname, 'test/integration/shared'),
	'@test': path.resolve(__dirname, 'test/shared'),
	'@n8n/mcp-apps/server': path.resolve(__dirname, '../@n8n/mcp-apps/src/server/index.ts'),
	// Force the test-utils package to load from source: its `dist/` is the stale
	// jest build (still imports `jest-mock-extended`), and we want the migrated
	// `vitest-mock-extended` source. `workspaceDistExternals` already excludes it.
	'@n8n/backend-test-utils': path.resolve(__dirname, '../@n8n/backend-test-utils/src/index.ts'),
	'@': path.resolve(__dirname, 'src'),
};

/**
 * Shared base for every cli test suite (unit, integration, migration). The
 * variant configs (`vitest.config.*.ts`) merge their own `include`/pool tweaks
 * on top of this.
 */
export const baseConfig = mergeConfig(
	createVitestConfigWithDecorators({
		// The former root jest.config set `restoreMocks: true`, and a large share of
		// test files silently rely on mocks being restored before each test. Keep it.
		restoreMocks: true,
	}),
	{
		// `workspaceDistExternals` must run before `tscEntityTransform`: once a
		// workspace package is externalized to its built dist, the entity transform
		// (which only targets first-party `src/**/*.entity.ts`) never sees it.
		plugins: [workspaceDistExternals(), tscEntityTransform()],
		resolve: { alias },
		test: {
			// Run each test file in its own forked process, matching Jest's
			// process-per-file model. This is load-bearing: cli tests register service
			// mocks into the `@n8n/di` Container (`mockInstance`), and a shared worker
			// would leak that state across files.
			pool: 'forks',
			globalSetup: ['./test/global-setup.ts'],
			setupFiles: [
				'./test/setup-test-folder.ts',
				'./test/setup-mocks.ts',
				'./test/extend-expect.ts',
			],
			// Vitest's default exclude does not cover dist; compiled test files left in
			// dist would otherwise be collected and fail as CJS.
			exclude: [...configDefaults.exclude, '**/dist/**'],
			coverage: {
				exclude: ['src/databases/migrations/**', ...(configDefaults.coverage.exclude ?? [])],
			},
		},
	},
);
