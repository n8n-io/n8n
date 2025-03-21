const { compilerOptions } = require('./tsconfig.json');
const { pathsToModuleNameMapper } = require('ts-jest')

/** @type {import('ts-jest').TsJestGlobalOptions} */
const tsJestOptions = {
	isolatedModules: true,
	tsconfig: {
		...compilerOptions,
		declaration: false,
		sourceMap: true,
	},
};

const { baseUrl, paths } = require('get-tsconfig').getTsconfig().config?.compilerOptions;

const isCoverageEnabled = process.env.COVERAGE_ENABLED === 'true';

/** @type {import('jest').Config} */
const config = {
	verbose: true,
	testEnvironment: 'node',
	testRegex: '\\.(test|spec)\\.(js|ts)$',
	testPathIgnorePatterns: ['/dist/', '/node_modules/'],
	transform: {
		'^.+\\.ts$': ['ts-jest', tsJestOptions],
	},
	// This resolve the path mappings from the tsconfig relative to each jest.config.js
	moduleNameMapper: pathsToModuleNameMapper(paths, { prefix: `<rootDir>/${baseUrl}` }),
	setupFilesAfterEnv: ['jest-expect-message'],
	collectCoverage: isCoverageEnabled,
	coverageReporters: ['text-summary', 'lcov', 'html-spa'],
	collectCoverageFrom: ['src/**/*.ts'],
	workerIdleMemoryLimit: '1MB',
};

if (process.env.CI === 'true') {
	config.coverageReporters = ['cobertura'];
}

module.exports = config;
