/** @type {import('jest').Config} */
module.exports = {
	...require('./jest.config.integration.js'),
	// Override testMatch to only run migration tests
	testMatch: ['<rootDir>/test/migration/**/*.test.ts'],
	// Run migration tests sequentially to avoid database conflicts
	maxWorkers: 1,
};
