/** @type {import('jest').Config} */
module.exports = {
	...require('./jest.config'),
	// Run only integration tests
	testRegex: undefined, // Override base config testRegex
	testMatch: ['**/*.integration.test.ts'],
	testPathIgnorePatterns: ['/dist/', '/node_modules/'],
};
