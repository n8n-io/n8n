/** @type {import('jest').Config} */
module.exports = {
	...require('../../../jest.config'),
	globalSetup: '<rootDir>/scripts/jest-global-setup.ts',
};
