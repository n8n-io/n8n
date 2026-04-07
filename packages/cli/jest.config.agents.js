/** @type {import('jest').Config} */
// Dedicated config for agent integration tests that require the real filesystem.
// setup-mocks.ts is intentionally excluded — it mocks node:fs which breaks
// LazyPackageDirectoryLoader and any test that loads real node types from disk.
module.exports = {
	...require('../../jest.config'),
	testEnvironmentOptions: {
		url: 'http://localhost/',
	},
	globalSetup: '<rootDir>/test/setup.ts',
	globalTeardown: '<rootDir>/test/teardown.ts',
	setupFilesAfterEnv: ['<rootDir>/test/setup-test-folder.ts', '<rootDir>/test/extend-expect.ts'],
	testRegex: undefined,
	testMatch: ['<rootDir>/src/modules/agents/__tests__/*.integration.test.ts'],
	testPathIgnorePatterns: ['/dist/', '/node_modules/'],
	testTimeout: 30_000,
	prettierPath: null,
};
