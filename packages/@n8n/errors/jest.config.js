/** @type {import('jest').Config} */
module.exports = {
	displayName: '@n8n/errors',
	preset: 'ts-jest',
	testEnvironment: 'node',
	testMatch: ['<rootDir>/src/**/*.test.ts'],
	collectCoverage: true,
	coverageDirectory: 'coverage',
	collectCoverageFrom: [
		'src/**/*.ts',
		'!src/**/*.d.ts',
		'!src/**/__tests__/**',
		'!src/**/index.ts', // Index files usually just re-export
	],
	coverageThreshold: {
		global: {
			branches: 95,
			functions: 95,
			lines: 95,
			statements: 95,
		},
	},
	transform: {
		'^.+\\.ts$': [
			'ts-jest',
			{
				isolatedModules: true,
				tsconfig: {
					experimentalDecorators: true,
					emitDecoratorMetadata: true,
					declaration: false,
					sourceMap: true,
				},
			},
		],
	},
	testTimeout: 15000,
};
