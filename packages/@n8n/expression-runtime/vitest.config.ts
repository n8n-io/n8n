import { defineConfig, defaultExclude } from 'vitest/config';
import { createBaseInlineConfig } from '@n8n/vitest-config/node';

const { reporters, outputFile, ...sharedTestConfig } = createBaseInlineConfig({
	coverage: {
		exclude: ['dist/**', 'bundle/**', '**/*.test.ts', '**/*.config.ts'],
	},
});

// Only these suites vary by engine (they build the bridge from N8N_EXPRESSION_ENGINE
// via test-bridge). Everything else is engine-independent and runs once in the
// default project instead of twice, once per engine.
const ENGINE_AWARE = [
	'**/integration.test.ts',
	'**/typed-rpc.test.ts',
	'**/host-fn-shadowing.test.ts',
];

export default defineConfig({
	test: {
		reporters,
		outputFile,
		projects: [
			{
				test: {
					...sharedTestConfig,
					name: 'default',
					exclude: [...defaultExclude, ...ENGINE_AWARE],
				},
			},
			{
				test: {
					...sharedTestConfig,
					name: 'isolated-vm-engine',
					include: ENGINE_AWARE,
					env: { N8N_EXPRESSION_ENGINE: 'vm' },
				},
			},
			{
				test: {
					...sharedTestConfig,
					name: 'quickjs-engine',
					include: ENGINE_AWARE,
					env: { N8N_EXPRESSION_ENGINE: 'quickjs' },
				},
			},
		],
	},
});
