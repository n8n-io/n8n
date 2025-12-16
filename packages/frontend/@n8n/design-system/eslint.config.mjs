import storybook from 'eslint-plugin-storybook';

import { defineConfig } from 'eslint/config';
import { frontendConfig } from '@n8n/eslint-config/frontend';

export default defineConfig(
	frontendConfig,
	{
		rules: {
			'vue/no-undef-components': 'error',

			// TODO: Remove these
			'import-x/no-default-export': 'warn',
			'no-empty': 'warn',
			'no-prototype-builtins': 'warn',
			'@typescript-eslint/no-unsafe-argument': 'warn',
			'@typescript-eslint/no-unsafe-return': 'warn',
			'@typescript-eslint/no-unsafe-member-access': 'warn',
			'@typescript-eslint/prefer-optional-chain': 'warn',
			'@typescript-eslint/prefer-nullish-coalescing': 'warn',
			'@typescript-eslint/require-await': 'warn',
			'@typescript-eslint/naming-convention': 'warn',
			'@typescript-eslint/no-empty-object-type': 'warn',
			'@typescript-eslint/no-unsafe-assignment': 'warn',
			'@typescript-eslint/unbound-method': 'warn',
			'@typescript-eslint/restrict-template-expressions': 'warn',
			'@typescript-eslint/no-unsafe-call': 'warn',
		},
	},
	{
		files: ['src/**/*.stories.ts', 'src/**/*.vue', 'src/**/*.spec.ts'],
		rules: {
			'@typescript-eslint/naming-convention': [
				'warn',
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
