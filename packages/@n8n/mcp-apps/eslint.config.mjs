import { defineConfig } from 'eslint/config';
import { frontendConfig } from '@n8n/eslint-config/frontend';

export default defineConfig(
	{
		ignores: ['vite.config.mts', 'vitest.config.mts', 'dist/**'],
	},
	frontendConfig,
	{
		rules: {
			'unicorn/filename-case': ['error', { case: 'kebabCase' }],
		},
	},
	{
		files: ['src/apps/**/*.vue'],
		rules: {
			'unicorn/filename-case': ['error', { case: 'pascalCase' }],
		},
	},
	{
		// The embedded workflow canvas imports editor-ui sources directly (via
		// the `@/` vite/tsconfig alias). editor-ui (`n8n-editor-ui`) is a
		// private, unpublishable app package, so it lives in devDependencies —
		// these imports are compiled into the app bundle at build time and
		// never resolved at runtime.
		files: [
			'src/components/workflow-preview/workflow-canvas-host.vue',
			'src/components/workflow-diff/workflow-diff-canvas-host.vue',
			'src/apps/canvas-spike/**',
			'src/telemetry/types.ts',
		],
		rules: {
			'import-x/no-extraneous-dependencies': 'off',
		},
	},
	{
		files: ['src/**/*.test.ts', 'src/__tests__/**/*.ts'],
		rules: {
			'n8n-local-rules/no-uncaught-json-parse': 'off',
			'@typescript-eslint/no-unsafe-assignment': 'off',
			'@typescript-eslint/no-unsafe-argument': 'off',
			'@typescript-eslint/no-explicit-any': 'off',
			'id-denylist': 'off',
		},
	},
);
