import { defineConfig, globalIgnores } from 'eslint/config';
import { baseConfig } from '@n8n/eslint-config/base';
import cypressPlugin from 'eslint-plugin-cypress/flat';

export default defineConfig(
	globalIgnores(['scripts/**/*.js']),
	baseConfig,
	cypressPlugin.configs.recommended,
	{
		rules: {
			// TODO: remove these rules
			'@typescript-eslint/naming-convention': 'off',
			'@typescript-eslint/no-explicit-any': 'off',
			'@typescript-eslint/no-unsafe-argument': 'off',
			'@typescript-eslint/no-unsafe-assignment': 'off',
			'@typescript-eslint/no-unsafe-call': 'off',
			'@typescript-eslint/no-unsafe-member-access': 'off',
			'@typescript-eslint/no-unsafe-return': 'off',
			'import/order': 'off',
			'@typescript-eslint/no-unused-expressions': 'off',
			'@typescript-eslint/no-use-before-define': 'off',
			'@typescript-eslint/promise-function-async': 'off',
			'n8n-local-rules/no-uncaught-json-parse': 'off',
			'cypress/no-assigning-return-values': 'warn',
			'cypress/no-unnecessary-waiting': 'warn',
			'cypress/unsafe-to-chain-command': 'warn',
			'import/no-extraneous-dependencies': [
				'error',
				{
					devDependencies: ['**/cypress/**'],
					optionalDependencies: false,
				},
			],
		},
	},
);
