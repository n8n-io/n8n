/** @type {import('jest').Config} */
module.exports = {
	...require('../../../jest.config'),
	collectCoverageFrom: ['src/**/*.ts'],
	coveragePathIgnorePatterns: ['src/index.ts'],
};
