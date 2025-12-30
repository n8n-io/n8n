/** @type {import('jest').Config} */
module.exports = {
	...require('../../../jest.config'),
	globalSetup: '<rootDir>/test/setup.ts',
	setupFilesAfterEnv: ['<rootDir>/test/setup-mocks.ts'],
	// Include in coverage
	collectCoverageFrom: [
		'src/**/*.ts',
		'!src/**/\\*\\.ts',
		'!src/**/*.d.ts',
		'!src/**/index.ts', // Exclude barrel files
		'!src/**/__tests__/**', // Exclude test files
	],

	// Set minimum thresholds
	coverageThreshold: {
		global: {
			branches: 95,
			functions: 95,
			lines: 95,
			statements: 95,
		},
	},
};
