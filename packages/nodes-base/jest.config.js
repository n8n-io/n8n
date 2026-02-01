// Avoid tests failing because of difference between local and GitHub actions timezone
process.env.TZ = 'UTC';

/** @type {import('jest').Config} */
module.exports = {
	...require('../../jest.config'),
	testPathIgnorePatterns: ['/dist/', '/node_modules/', '\\.integration\\.test\\.ts$'],
	collectCoverageFrom: ['credentials/**/*.ts', 'nodes/**/*.ts', 'utils/**/*.ts'],
	globalSetup: '<rootDir>/test/globalSetup.ts',
	setupFilesAfterEnv: ['jest-expect-message', '<rootDir>/test/setup.ts'],
};
