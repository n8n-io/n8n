const { pathsToModuleNameMapper } = require('ts-jest');
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

const esmDependencies = [
	'pdfjs-dist',
	'openid-client',
	'oauth4webapi',
	'jose',
	// Add other ESM dependencies that need to be transformed here
];

const esmDependenciesPattern = esmDependencies.join('|');
const esmDependenciesRegex = `node_modules/(${esmDependenciesPattern})/.+\\.m?js$`;

/** @type {import('jest').Config} */
const config = {
	verbose: true,
	testEnvironment: 'node',
	testRegex: '\\.(test|spec)\\.(js|ts)$',
	testPathIgnorePatterns: ['/dist/', '/node_modules/'],
	transform: {
		'^.+\\.ts$': ['ts-jest', tsJestOptions],
		[esmDependenciesRegex]: [
			'babel-jest',
			{
				presets: ['@babel/preset-env'],
				plugins: ['babel-plugin-transform-import-meta'],
			},
		],
	},
	transformIgnorePatterns: [`/node_modules/(?!${esmDependenciesPattern})/`],
	// This resolve the path mappings from the tsconfig relative to each jest.config.js
	moduleNameMapper: compilerOptions?.paths
		? pathsToModuleNameMapper(compilerOptions.paths, {
				prefix: `<rootDir>${compilerOptions.baseUrl ? `/${compilerOptions.baseUrl.replace(/^\.\//, '')}` : ''}`,
			})
		: {},
	setupFilesAfterEnv: ['jest-expect-message'],
	collectCoverage: isCoverageEnabled,
	coverageReporters: ['text-summary', 'lcov', 'html-spa'],
	workerIdleMemoryLimit: '1MB',
};

if (process.env.CI === 'true') {
	config.collectCoverageFrom = ['src/**/*.ts'];
	config.reporters = ['default', 'jest-junit'];
	config.coverageReporters = ['cobertura'];
}

module.exports = config;
