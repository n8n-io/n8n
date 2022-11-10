const { compilerOptions } = require('./tsconfig.json');

/** @type {import('jest').Config} */
module.exports = {
	verbose: true,
	preset: 'ts-jest',
	testEnvironment: 'node',
	testRegex: '\\.(test|spec)\\.(js|ts)$',
	testPathIgnorePatterns: ['/dist/', '/node_modules/'],
	globals: {
		'ts-jest': {
			isolatedModules: true,
			tsconfig: {
				...compilerOptions,
				declaration: false,
				sourceMap: false,
				skipLibCheck: true,
			},
		},
	},
	moduleNameMapper: {
		'^@/(.*)$': '<rootDir>/src/$1',
	},
};
