import { defineConfig, mergeConfig } from 'vitest/config';
import { vitestConfig } from '@n8n/vitest-config/node';
import path from 'node:path';

export default mergeConfig(
	vitestConfig,
	defineConfig({
		test: {
			setupFiles: ['./test/setup.ts'],
		},
		resolve: {
			alias: {
				'@utils': path.resolve(__dirname, './utils'),
				'@nodes-testing': path.resolve(__dirname, '../../core/nodes-testing'),
				// Pin n8n-workflow to its CJS build so the single module instance is shared
				// across CJS-required workspace deps and ESM-imported test code.
				// `require.resolve` follows the `require` export condition (the CJS dist).
				'n8n-workflow': require.resolve('n8n-workflow'),
			},
		},
		// The test harness in `core/nodes-testing` uses legacy decorators. That
		// file is outside this package, so the tsconfig setting does not apply to it.
		oxc: {
			decorator: { legacy: true, emitDecoratorMetadata: true },
		},
	}),
);
