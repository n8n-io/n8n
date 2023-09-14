const tsConfig = require('get-tsconfig').getTsconfig();
const compilerOptions = tsConfig.config.compilerOptions;
const { baseUrl, paths } = compilerOptions;
const useSwc = !tsConfig.path.includes('packages/cli');

/** @type {import('@swc/types').Config} */
const swcJestOptions = {
	jsc: {
		parser: {
			syntax: 'typescript',
			tsx: false,
			decorators: true,
		},
		transform: {
			legacyDecorator: true,
			decoratorMetadata: true,
		},
		target: 'es2020',
	},
};

// TODO: remove ts-jest and use swc in `cli` once swc supports emitting decorator metadata
// https://github.com/swc-project/swc/issues/6824
/** @type {import('ts-jest').TsJestTransformerOptions} */
const tsJestOptions = {
	isolatedModules: true,
	tsconfig: {
		...compilerOptions,
		declaration: false,
		sourceMap: true,
	},
};

/** @type {import('jest').Config} */
const config = {
	verbose: true,
	testEnvironment: 'node',
	testRegex: '\\.(test|spec)\\.(js|ts)$',
	testPathIgnorePatterns: ['/dist/', '/node_modules/'],
	transform: {
		'^.+\\.ts$': useSwc ? ['@swc/jest', swcJestOptions] : ['ts-jest', tsJestOptions],
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
	collectCoverage: true,
	coverageReporters: [process.env.COVERAGE_REPORT === 'true' ? 'text' : 'text-summary'],
	collectCoverageFrom: ['src/**/*.ts'],
};

if (process.env.CI === 'true') {
	config.workerIdleMemoryLimit = 1024;
	config.coverageReporters = ['cobertura'];
}

module.exports = config;
