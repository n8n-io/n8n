/** @type {import('jest').Config} */
module.exports = {
	...require('../../jest.config.cjs'),
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
	coveragePathIgnorePatterns: ['/src/databases/migrations/', '/node_modules/', '/dist/', '/test/'],
	collectCoverageFrom: [
		'src/**/*.ts',
		'!src/**/*.d.ts',
		'!src/**/index.ts',
		'!src/databases/migrations/**',
		'!src/**/*.test.ts',
	],
	prettierPath: null,
	// Performance optimizations
	maxWorkers: process.env.CI ? 1 : 2, // Allow parallel execution in local development
	testTimeout: 20000, // Increased timeout for complex integration tests
	workerIdleMemoryLimit: '256MB', // Balanced memory limit for stability
	detectOpenHandles: false, // Disable for performance unless debugging
	forceExit: false, // Allow proper cleanup to prevent resource leaks
};
