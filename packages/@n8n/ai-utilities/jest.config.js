/** @type {import('jest').Config} */
module.exports = {
	...require('../../../jest.config'),
	collectCoverageFrom: ['src/**/*.ts', 'integration-tests/**/*.ts'],
	setupFilesAfterEnv: ['jest-expect-message'],
	coveragePathIgnorePatterns: ['examples'],
};
