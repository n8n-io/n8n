/** @type {import('jest').Config} */
module.exports = {
	...require('../../jest.config'),
	testEnvironmentOptions: {
		url: 'http://localhost/',
	},
	globalSetup: '<rootDir>/test/setup.ts',
	globalTeardown: '<rootDir>/test/teardown.ts',
	setupFilesAfterEnv: [
		'n8n-workflow/test/setup.ts',
		'<rootDir>/test/setup-test-folder.ts',
		'<rootDir>/test/setup-mocks.ts',
		'<rootDir>/test/extend-expect.ts',
	],
	coveragePathIgnorePatterns: ['/src/databases/migrations/'],
	testTimeout: 10_000,
	prettierPath: null,
};
