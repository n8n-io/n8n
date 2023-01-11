const { compilerOptions } = require('./tsconfig.json');

const tsJestOptions = {
	isolatedModules: true,
	tsconfig: {
		...compilerOptions,
		declaration: false,
		sourceMap: false,
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
};

if (process.env.CI === 'true') {
	config.maxWorkers = 2;
	config.workerIdleMemoryLimit = 2048;
}

module.exports = config;
