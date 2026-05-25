const { pathsToModuleNameMapper } = require('ts-jest');
const { compilerOptions } = require('get-tsconfig').getTsconfig().config;
const { resolve } = require('path');

/** @type {import('ts-jest').TsJestTransformerOptions} */
const tsJestOptions = {
	tsconfig: {
		...compilerOptions,
		declaration: false,
		sourceMap: true,
		rootDir: '.',
		// Force the transpile-only path for tests. Without this, ts-jest runs
		// the full type-checker on every transformed file, which combined with
		// aggressive worker recycling (workerIdleMemoryLimit) makes test runs
		// ~4-5x slower. Package builds and `pnpm typecheck` read the package
		// tsconfig directly and are unaffected.
		isolatedModules: true,
		// Relax strictness for cross-package imports. ts-jest applies the host
		// package's tsconfig to every file it transforms, including imports
		// from packages like nodes-base that disable these in their own
		// tsconfig. The host package's own `pnpm typecheck` is unaffected.
		noImplicitReturns: false,
		noUncheckedIndexedAccess: false,
		noImplicitOverride: false,
		useUnknownInCatchVariables: false,
	},
};

const isCoverageEnabled = process.env.COVERAGE_ENABLED === 'true';

const esmDependencies = [
	'pdfjs-dist',
	'openid-client',
	'oauth4webapi',
	'jose',
	'p-retry',
	'is-network-error',
	'uuid',
	// Add other ESM dependencies that need to be transformed here
];

const esmDependenciesPattern = esmDependencies.join('|');
const esmDependenciesRegex = `node_modules/(${esmDependenciesPattern})/.+\\.m?js$`;

/** @type {import('jest').Config} */
const config = {
	verbose: false,
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
	moduleNameMapper: {
		'^@n8n/utils$': resolve(__dirname, 'packages/@n8n/utils/dist/index.cjs'),
		// jest-resolve@29 doesn't honor `./lib/*` subpath patterns in @anthropic-ai/sdk's exports map
		'^@anthropic-ai/sdk/lib/(.*)$': '@anthropic-ai/sdk/lib/$1.js',
		...(compilerOptions?.paths
			? pathsToModuleNameMapper(compilerOptions.paths, {
					prefix: `<rootDir>${compilerOptions.baseUrl ? `/${compilerOptions.baseUrl.replace(/^\.\//, '')}` : ''}`,
				})
			: {}),
	},
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
