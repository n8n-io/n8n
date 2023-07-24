const { compilerOptions } = require('./tsconfig.json');

const tsJestOptions = {
	isolatedModules: true,
	tsconfig: {
		...compilerOptions,
		declaration: false,
		sourceMap: true,
		skipLibCheck: true,
	},
};

/** @type {import('jest').Config} */
const config = {
	verbose: true,
	testEnvironment: 'node',
	testRegex: '\\.(test|spec)\\.(js|ts)$',
	testPathIgnorePatterns: ['/dist/', '/node_modules/'],
	transform: {
		'^.+\\.ts$': ['ts-jest', tsJestOptions],
	},
	moduleNameMapper: {
		'^@/(.*)$': '<rootDir>/src/$1',
	},
	setupFilesAfterEnv: ['jest-expect-message'],
	collectCoverage: true,
	coverageReporters: [process.env.COVERAGE_REPORT === 'true' ? 'text' : 'text-summary'],
	collectCoverageFrom: ['src/**/*.ts'],
};

if (process.env.CI === 'true') {
	config.workerIdleMemoryLimit = 1024;
	config.coverageReporters = ['cobertura'];
}

module.exports = config;
