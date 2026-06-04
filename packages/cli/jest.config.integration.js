// Override the root 1 MB workerIdleMemoryLimit for integration tests. The root
// setting forces a fresh worker process for every test file, which pays the
// full module-load cost (TypeORM, @n8n/di, the n8n CLI surface) on each file
// and dominates the PG16 integration job's wall time. Removing the key lets
// workers persist across files and exposes any cross-file leakage so it can
// be fixed at the source rather than masked.
const { workerIdleMemoryLimit: _drop, ...rootConfig } = require('../../jest.config');

/** @type {import('jest').Config} */
module.exports = {
	...rootConfig,
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
	coveragePathIgnorePatterns: ['/src/databases/migrations/'],
	testTimeout: 10_000,
	prettierPath: null,
	// Run integration tests from test/integration, test/migration and src/ directories
	testRegex: undefined, // Override base config testRegex
	testMatch: [
		'<rootDir>/test/integration/**/*.test.ts',
		'<rootDir>/test/migration/**/*.test.ts',
		'<rootDir>/src/**/*.integration.test.ts',
	],
	testPathIgnorePatterns: ['/dist/', '/node_modules/'],
};
