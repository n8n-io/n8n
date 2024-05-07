/** @type {import('jest').Config} */
module.exports = {
	...require('./jest.config'),
	testEnvironment: './benchmark.env.js',
};
