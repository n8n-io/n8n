/** @type {import('@swc/core').Config} */
const swcJestOptions = {
	minify: false,
	sourceMaps: true,
	module: {
		type: 'commonjs',
	},
	jsc: {
		parser: {
			syntax: 'typescript',
			decorators: true,
		},
		target: 'es2022',
		transform: {
			legacyDecorator: true,
			decoratorMetadata: true,
			useDefineForClassFields: false,
		},
		experimental: {
			plugins: [['jest_workaround', {}]],
		},
	},
};

/** @type {import('jest').Config} */
const config = {
	verbose: true,
	testEnvironment: 'node',
	testRegex: '\\.(test|spec)\\.(js|ts)$',
	testPathIgnorePatterns: ['/dist/', '/node_modules/'],
	transform: {
		'^.+\\.ts$': ['@swc/jest', swcJestOptions],
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
