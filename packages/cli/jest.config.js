/** @type {import('jest').Config} */
module.exports = {
	...require('../../jest.config'),
	testEnvironmentOptions: {
		url: 'http://n8n-1-trui.onrender.com/',
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
};
