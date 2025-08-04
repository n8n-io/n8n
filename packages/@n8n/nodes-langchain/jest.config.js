/** @type {import('jest').Config} */
module.exports = {
	...require('../../../jest.config.cjs'),
	collectCoverageFrom: ['credentials/**/*.ts', 'nodes/**/*.ts', 'utils/**/*.ts'],
	setupFilesAfterEnv: ['jest-expect-message'],
	// Performance optimizations for AI/LangChain node tests
	testTimeout: 25000, // Increased timeout for AI operations
	maxWorkers: process.env.CI ? 1 : '25%', // Conservative worker allocation for AI tests
};
