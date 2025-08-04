// Avoid tests failing because of difference between local and GitHub actions timezone
process.env.TZ = 'UTC';

/** @type {import('jest').Config} */
module.exports = {
	...require('../../jest.config.cjs'),
	collectCoverageFrom: ['credentials/**/*.ts', 'nodes/**/*.ts', 'utils/**/*.ts'],
	globalSetup: '<rootDir>/test/globalSetup.ts',
	setupFilesAfterEnv: ['jest-expect-message', '<rootDir>/test/setup.ts'],
	// Performance optimizations for large node test suite
	testTimeout: 20000, // Increased timeout for complex node tests
	maxWorkers: process.env.CI ? 2 : '50%', // Balanced worker allocation
};
