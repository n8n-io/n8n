import { defineConfig } from 'vitest/config';
import { createBaseInlineConfig } from '@n8n/vitest-config/node';

const { reporters, outputFile, ...sharedTestConfig } = createBaseInlineConfig({
	coverage: {
		exclude: ['dist/**', 'bundle/**', '**/*.test.ts', '**/*.config.ts'],
	},
});

export default defineConfig({
	test: {
		reporters,
		outputFile,
		projects: [
			{
				test: {
					...sharedTestConfig,
					name: 'isolated-vm-engine',
					env: { N8N_EXPRESSION_ENGINE: 'isolated-vm' },
				},
			},
			{
				test: {
					...sharedTestConfig,
					name: 'quickjs-engine',
					env: { N8N_EXPRESSION_ENGINE: 'quickjs' },
				},
			},
		],
	},
});
