import path from 'node:path';

import { baseConfig } from '../../cli/vitest.config.base';

export default {
	...baseConfig,
	test: {
		...baseConfig.test,
		hookTimeout: 30_000,
		include: ['test/integration/workflow-test-adapter.spec.ts'],
		env: {
			N8N_TEST_ADAPTER_ENTRY: path.resolve(__dirname, 'dist/index.js'),
		},
	},
};
