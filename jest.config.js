const { pathsToModuleNameMapper } = require('ts-jest')
const { compilerOptions } = require('get-tsconfig').getTsconfig().config;

/** @type {import('ts-jest').TsJestGlobalOptions} */
const tsJestOptions = {
	isolatedModules: true,
	tsconfig: {
		...compilerOptions,
		declaration: false,
		sourceMap: true,
	},
};


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
	moduleNameMapper: pathsToModuleNameMapper(compilerOptions.paths, { prefix: `<rootDir>${compilerOptions.baseUrl ? `/${compilerOptions.baseUrl.replace(/^\.\//, '')}` : ''}` }),
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
