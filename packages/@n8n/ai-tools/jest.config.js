/** @type {import('jest').Config} */
module.exports = {
	...require('../../../jest.config'),
	collectCoverageFrom: ['src/**/*.ts'],
	setupFilesAfterEnv: ['jest-expect-message'],
};
