/** @type {import('jest').Config} */
module.exports = {
	...require('../../jest.config'),
	globalSetup: '<rootDir>/test/setup.ts',
	setupFilesAfterEnv: ['<rootDir>/test/setup-mocks.ts'],
};
