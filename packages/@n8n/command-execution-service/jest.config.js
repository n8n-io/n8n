/** @type {import('jest').Config} */
module.exports = {
	preset: 'ts-jest',
	testEnvironment: 'node',
	roots: ['<rootDir>/src'],
	testMatch: ['**/__tests__/**/*.ts', '**/*.{spec,test}.ts'],
	transform: {
		'^.+\\.ts$': 'ts-jest',
	},
	testTimeout: 10_000,
};
