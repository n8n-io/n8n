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
			// We use RuleCreator which adds this automatically
			'eslint-plugin/require-meta-docs-url': 'off',
			// typescript-eslint uses different pattern
			'eslint-plugin/require-meta-default-options': 'off',
			// Disable naming convention for plugin configs (ESLint rule names use kebab-case)
			'@typescript-eslint/naming-convention': 'off',
			// Allow default exports for ESLint plugin
			'import-x/no-default-export': 'off',
		},
	},
]);
