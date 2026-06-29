import { mergeConfig } from 'vite';

import { baseConfig } from './vitest.config.base';

/**
 * Integration tests against a postgres container started via testcontainers,
 * mirroring `jest.config.integration.testcontainers.js`. Migration tests are
 * excluded here (they have a dedicated testcontainers config), matching the
 * former `test:postgres:integration:tc` which ignored `/test/migration/`.
 *
 * The testcontainers global setup *replaces* the default nock global setup
 * (matching the old jest config, which overrode `globalSetup`/`globalTeardown`).
 */
const integrationTcConfig = mergeConfig(baseConfig, {
	test: {
		include: ['test/integration/**/*.test.ts', 'src/**/*.integration.test.ts'],
		testTimeout: 30_000,
	},
});

export default {
	...integrationTcConfig,
	test: {
		...integrationTcConfig.test,
		globalSetup: ['./test/setup-testcontainers.ts'],
	},
};
