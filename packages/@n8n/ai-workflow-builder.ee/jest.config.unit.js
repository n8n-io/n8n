/** @type {import('jest').Config} */
module.exports = {
	...require('./jest.config'),
	// Exclude integration tests - only run unit tests
	testPathIgnorePatterns: [
		'/dist/',
		'/node_modules/',
		'\\.integration\\.test\\.ts$', // Exclude integration test files
	],
};
