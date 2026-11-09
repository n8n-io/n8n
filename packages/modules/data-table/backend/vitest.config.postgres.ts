import baseConfig from './vitest.config';

export default {
	...baseConfig,
	test: {
		...baseConfig.test,
		include: ['src/**/*.integration.test.ts'],
		env: { N8N_LOG_LEVEL: 'silent', DB_TYPE: 'postgresdb' },
		testTimeout: 30_000,
		hookTimeout: 30_000,
		globalSetup: ['./test/setup-postgres.ts'],
	},
};
