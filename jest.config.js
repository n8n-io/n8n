const { compilerOptions } = require('./tsconfig.json');

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
	moduleNameMapper: Object.entries(paths || {}).reduce((acc, [path, [mapping]]) => {
		path = `^${path.replace(/\/\*$/, '/(.*)$')}`;
		mapping = mapping.replace(/^\.\/(?:(.*)\/)?\*$/, '$1');
		mapping = mapping ? `/${mapping}` : '';
		acc[path] = '<rootDir>' + (baseUrl ? `/${baseUrl.replace(/^\.\//, '')}` : '') + mapping + '/$1';
		return acc;
	}, {}),
	setupFilesAfterEnv: ['jest-expect-message'],
	collectCoverage: process.env.COVERAGE_ENABLED === 'true',
	coverageReporters: ['text-summary'],
	collectCoverageFrom: ['src/**/*.ts'],
};

if (process.env.CI === 'true') {
	config.workerIdleMemoryLimit = 1024;
	config.coverageReporters = ['cobertura'];
}

module.exports = config;
