import storybook from 'eslint-plugin-storybook';

import { defineConfig } from 'eslint/config';
import { frontendConfig } from '@n8n/eslint-config/frontend';

export default defineConfig(
	frontendConfig,
	{
		rules: {
			'vue/no-undef-components': ['error', { ignorePatterns: ['N8nDropdownMenuItem'] }],

			'no-prototype-builtins': 'warn',
			'@typescript-eslint/prefer-optional-chain': 'warn',
			'@typescript-eslint/restrict-template-expressions': 'warn',
		},
	},
	{
		files: ['src/**/*.stories.ts', 'src/**/*.vue', 'src/**/*.spec.ts'],
		rules: {
			'@typescript-eslint/naming-convention': [
				'off',
				{
					selector: ['variable', 'property'],
					format: ['PascalCase', 'camelCase', 'UPPER_CASE'],
				},
			],
		},
	},
	{
		files: ['src/components/N8nFormInput/validators.ts'],
		rules: {
			'@typescript-eslint/naming-convention': [
				'error',
				{
					selector: ['property'],
					format: ['camelCase', 'UPPER_CASE'],
				},
			],
		},
	},
	storybook.configs['flat/recommended'],
);
