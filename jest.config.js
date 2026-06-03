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

// On Windows, Jest passes raw backslash paths to transform/ignore pattern regexes
// without normalizing separators, so we must match both / and \.
const isWindows = process.platform === 'win32';
const sep = isWindows ? '[/\\\\]' : '/';
const nonSep = isWindows ? '[^/\\\\]' : '[^/]';

const esmDependenciesRegex = `node_modules${sep}(${esmDependenciesPattern})${sep}.+\\.m?js$`;

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
	transformIgnorePatterns: [
		// Exclude the pnpm virtual store dir (.pnpm) and the ESM deps from being ignored.
		`${sep}node_modules${sep}(?!\\.pnpm|${esmDependenciesPattern})${sep}`,
		// On Windows with pnpm, ESM deps live inside the virtual store (.pnpm) and are
		// accessed via hardlinks (no symlinks), so their path goes through
		// .pnpm/<pkg@version>/node_modules/<pkg>/... — exclude ESM deps from being ignored there too.
		...(isWindows
			? [`${sep}\\.pnpm${sep}${nonSep}+${sep}node_modules${sep}(?!${esmDependenciesPattern})${sep}`]
			: []),
	],
	// This resolve the path mappings from the tsconfig relative to each jest.config.js
	moduleNameMapper: {
		'^@n8n/utils$': resolve(__dirname, 'packages/@n8n/utils/dist/index.cjs'),
		// jest-resolve@29 doesn't honor `./lib/*` subpath patterns in @anthropic-ai/sdk's exports map
		'^@anthropic-ai/sdk/lib/(.*)$': '@anthropic-ai/sdk/lib/$1.js',
		// Core uses vitest-mock-extended (ESM-only) for its own tests; route the
		// shim to a CJS-friendly variant for Jest-based consumers (nodes-base, cli).
		'^(\\./|\\.\\./nodes-testing/)mock-extended$': resolve(
			__dirname,
			'packages/core/nodes-testing/mock-extended.jest.cjs',
		),
		...(compilerOptions?.paths
			? pathsToModuleNameMapper(compilerOptions.paths, {
					prefix: `<rootDir>${compilerOptions.baseUrl ? `/${compilerOptions.baseUrl.replace(/^\.\//, '')}` : ''}`,
				})
			: {}),
	},
	setupFilesAfterEnv: ['jest-expect-message'],
	restoreMocks: true,
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
