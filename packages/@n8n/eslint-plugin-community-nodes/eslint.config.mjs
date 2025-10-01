import { defineConfig } from 'eslint/config';
import { nodeConfig } from '@n8n/eslint-config/node';
import eslintPlugin from 'eslint-plugin-eslint-plugin';

export default defineConfig([
	nodeConfig,
	eslintPlugin.configs.recommended,
	{
		files: ['src/**/*.ts'],
		languageOptions: {
			parserOptions: {
				project: './tsconfig.json',
				allowDefaultProject: true,
			},
		},
		rules: {
			'eslint-plugin/require-meta-docs-url': 'off', // We use RuleCreator which adds this automatically
			'eslint-plugin/require-meta-default-options': 'off', // TypeScript-ESLint uses different pattern
			// Disable naming convention for plugin configs (ESLint rule names use kebab-case)
			'@typescript-eslint/naming-convention': 'off',
			// Allow default exports for ESLint plugin
			'import-x/no-default-export': 'off',
		},
	},
]);
