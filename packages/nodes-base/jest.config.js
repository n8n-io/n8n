/** @type {import('jest').Config} */
module.exports = {
	...require('../../jest.config'),
	collectCoverageFrom: ['credentials/**/*.ts', 'nodes/**/*.ts', 'utils/**/*.ts'],
};
