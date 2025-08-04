/** @type {import('jest').Config} */
module.exports = {
	...require('../../jest.config.cjs'),
	globalSetup: '<rootDir>/test/setup.ts',
	setupFilesAfterEnv: ['<rootDir>/test/setup-mocks.ts'],
	// Performance optimizations for core execution engine tests
	testTimeout: 20000, // Increased timeout for execution engine tests
	maxWorkers: process.env.CI ? 2 : '50%', // Balanced worker allocation
};
