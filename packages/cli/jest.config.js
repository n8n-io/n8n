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
	maxWorkers: process.env.CI ? 1 : '25%', // Reduce workers for integration tests
	testTimeout: 30000, // Increase timeout for integration tests
	workerIdleMemoryLimit: '256MB', // Reduce memory per worker
	detectOpenHandles: false, // Disable for performance unless debugging
	forceExit: true, // Force exit to prevent hanging
};
