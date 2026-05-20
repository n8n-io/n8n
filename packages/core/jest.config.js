/** @type {import('vi').Config} */
module.exports = {
	...require('../../vi.config'),
	globalSetup: '<rootDir>/test/setup.ts',
	setupFilesAfterEnv: ['<rootDir>/test/setup-mocks.ts'],
};
