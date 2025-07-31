/** @type {import('jest').Config} */
module.exports = {
	...require('../../../jest.config.cjs'),
	transform: {
		'^.+\\.ts$': ['ts-jest', { isolatedModules: false }],
	},
	// Exclude test fixtures from coverage as they are test utilities, not production code
	collectCoverageFrom: [
		'src/**/*.ts',
		'!src/**/*.test.ts',
		'!src/**/*.spec.ts',
		'!src/__tests__/fixtures/**/*',
	],
};
