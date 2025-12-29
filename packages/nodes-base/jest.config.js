// Avoid tests failing because of difference between local and GitHub actions timezone
process.env.TZ = 'UTC';

/** @type {import('jest').Config} */
const esmDependencies = ['pdfjs-dist', 'openid-client', 'oauth4webapi', 'jose'];
const esmDependenciesPattern = esmDependencies.join('|');

module.exports = {
	...require('../../jest.config'),
	collectCoverageFrom: ['credentials/**/*.ts', 'nodes/**/*.ts', 'utils/**/*.ts'],
	globalSetup: '<rootDir>/test/globalSetup.ts',
	moduleNameMapper: {
		'^@credentials/(.*)$': '<rootDir>/credentials/$1',
		'^@test/(.*)$': '<rootDir>/test/$1',
		'^@utils/(.*)$': '<rootDir>/utils/$1',
		'^@nodes-testing/(.*)$': '<rootDir>/../core/nodes-testing/$1',
		'^@/(.*)$': '<rootDir>/../core/src/$1',
		'^@n8n/backend-common$': '<rootDir>/../../packages/@n8n/backend-common/src/index.ts',
		'^@n8n/client-oauth2$': '<rootDir>/../../packages/@n8n/client-oauth2/src/index.ts',
		'^@n8n/decorators$': '<rootDir>/../../packages/@n8n/decorators/src/index.ts',
		'^@n8n/di$': '<rootDir>/../../packages/@n8n/di/src/di.ts',
		'^@n8n/config$': '<rootDir>/../../packages/@n8n/config/src/index.ts',
		'^@n8n/constants$': '<rootDir>/../../packages/@n8n/constants/src/index.ts',
		'^@n8n/errors$': '<rootDir>/../../packages/@n8n/errors/src/index.ts',
		'^@n8n/permissions$': '<rootDir>/../../packages/@n8n/permissions/src/index.ts',
	},
	// resolver: require.resolve('./test/n8n-resolver.js'), // Disable custom resolver as we use explicit mappings
	moduleDirectories: [
		'node_modules',
		'<rootDir>/../core/node_modules',
		'<rootDir>/../../node_modules',
	],
	transformIgnorePatterns: [`/node_modules/(?!(@n8n|${esmDependenciesPattern}))/`],
	setupFilesAfterEnv: ['jest-expect-message', '<rootDir>/test/setup.ts'],
	roots: ['<rootDir>', '<rootDir>/../core/src', '<rootDir>/../@n8n'],
};
