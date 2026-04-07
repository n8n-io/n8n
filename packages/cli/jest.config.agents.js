/** @type {import('jest').Config} */
// Dedicated config for agent integration tests that load real nodes from disk.
// setup-mocks.ts is intentionally excluded — it mocks node:fs which breaks
// LazyPackageDirectoryLoader.
module.exports = {
	...require('../../jest.config'),
	testEnvironmentOptions: {
		url: 'http://localhost/',
	},
	globalSetup: '<rootDir>/test/setup.ts',
	globalTeardown: '<rootDir>/test/teardown.ts',
	setupFilesAfterEnv: ['<rootDir>/test/setup-test-folder.ts', '<rootDir>/test/extend-expect.ts'],
	testRegex: undefined,
	testMatch: ['<rootDir>/src/modules/agents/__tests__/*.test.ts'],
	testPathIgnorePatterns: ['/dist/', '/node_modules/'],
	testTimeout: 30_000,
	prettierPath: null,
};
