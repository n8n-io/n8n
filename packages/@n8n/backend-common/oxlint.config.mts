import { backendConfig } from '@n8n/oxlint-config/backend';
import { defineConfig } from 'oxlint';

export default defineConfig({
	extends: [backendConfig],
	options: { typeAware: true },
	overrides: [
		{
			files: ['**/*.test.ts'],
			jsPlugins: ['@n8n/eslint-config/plugin'],
			rules: {
				'n8n-local-rules/no-uncaught-json-parse': 'warn',
				'typescript/no-unsafe-return': 'warn',
				'typescript/no-unsafe-assignment': 'warn',
				'typescript/no-unsafe-argument': 'warn',
				'typescript/unbound-method': 'warn',
			},
		},
	],
});
