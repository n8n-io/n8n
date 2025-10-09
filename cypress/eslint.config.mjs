import { defineConfig, globalIgnores } from 'eslint/config';
import { baseConfig } from '@n8n/eslint-config/base';
import cypressPlugin from 'eslint-plugin-cypress/flat';

export default defineConfig(
	globalIgnores(['scripts/**/*.js']),
	baseConfig,
	cypressPlugin.configs.recommended,
	{
		rules: {
			// TODO: Remove this
			'no-useless-escape': 'warn',
			'import-x/order': 'warn',
			'import-x/no-extraneous-dependencies': [
				'error',
				{
					devDependencies: ['**/cypress/**'],
					optionalDependencies: false,
				},
			],
			'@typescript-eslint/naming-convention': 'warn',
			'@typescript-eslint/no-explicit-any': 'warn',
			'@typescript-eslint/no-unsafe-argument': 'warn',
			'@typescript-eslint/no-unsafe-assignment': 'warn',
			'@typescript-eslint/no-unsafe-call': 'warn',
			'@typescript-eslint/no-unsafe-member-access': 'warn',
			'@typescript-eslint/no-unsafe-return': 'warn',
			'@typescript-eslint/no-unused-expressions': 'warn',
			'@typescript-eslint/no-use-before-define': 'warn',
			'@typescript-eslint/promise-function-async': 'warn',
			'@typescript-eslint/prefer-nullish-coalescing': 'warn',
			'@typescript-eslint/unbound-method': 'warn',
			'cypress/no-assigning-return-values': 'warn',
			'cypress/no-unnecessary-waiting': 'warn',
			'cypress/unsafe-to-chain-command': 'warn',
			'n8n-local-rules/no-uncaught-json-parse': 'warn',
		},
	},
);
