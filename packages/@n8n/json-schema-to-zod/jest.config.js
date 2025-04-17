/** @type {import('jest').Config} */
module.exports = {
	...require('../../../jest.config'),
	setupFilesAfterEnv: ['<rootDir>/test/extend-expect.ts'],
};
