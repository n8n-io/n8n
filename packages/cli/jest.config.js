const { resolve } = require('path');

const baseConfig = require('../../jest.config');

/** @type {import('jest').Config} */
module.exports = {
	...baseConfig,
	testEnvironmentOptions: {
		url: 'http://localhost/',
	},
	globalSetup: '<rootDir>/test/setup.ts',
	globalTeardown: '<rootDir>/test/teardown.ts',
	setupFilesAfterEnv: [
		'<rootDir>/test/setup-test-folder.ts',
		'<rootDir>/test/setup-mocks.ts',
		'<rootDir>/test/extend-expect.ts',
	],
	moduleNameMapper: {
		...baseConfig.moduleNameMapper,
		// Resolve `@n8n/mcp-apps/server` to source so tests don't require the
		// package's `dist/` to be built first. Tests still mock the module via
		// `jest.mock(...)`; this mapper just ensures Jest can resolve the
		// specifier when the dist is absent (e.g. fresh checkouts, ad-hoc
		// `pnpm test ...` runs that bypass turbo's `^build` dependency).
		'^@n8n/mcp-apps/server$': resolve(__dirname, '../@n8n/mcp-apps/src/server/index.ts'),
	},
	coveragePathIgnorePatterns: ['/src/databases/migrations/'],
	testTimeout: 10_000,
	prettierPath: null,
};
