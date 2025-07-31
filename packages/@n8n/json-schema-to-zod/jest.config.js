/** @type {import('jest').Config} */
module.exports = {
	...require('../../../jest.config.cjs'),
	setupFilesAfterEnv: ['<rootDir>/test/extend-expect.ts'],
};
