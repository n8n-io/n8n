/** @type {import('jest').Config} */
module.exports = {
	...require('../../jest.config'),
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
	// Run integration tests from both test/integration and src/ directories
	testRegex: undefined, // Override base config testRegex
	testMatch: ['<rootDir>/test/integration/**/*.test.ts', '<rootDir>/src/**/*.integration.test.ts'],
	testPathIgnorePatterns: ['/dist/', '/node_modules/'],
};
