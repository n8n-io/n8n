import { defineConfig } from 'eslint/config';
import { backendConfig } from '@n8n/eslint-config/backend';

export default defineConfig(
	// Frozen bundles are build output.
	{ ignores: ['versions/**'] },
	backendConfig,
	{
		// n8n loads each node class by its file name, so node files are PascalCase.
		files: ['src/nodes/*.node.ts'],
		rules: { 'unicorn/filename-case': 'off' },
	},
);
