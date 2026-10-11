import { backendConfig } from '@n8n/oxlint-config/backend';
import { defineConfig } from 'oxlint';

export default defineConfig({
	extends: [backendConfig],
	options: { typeAware: true },
	overrides: [
		{
			files: ['**/*.config.ts'],
			jsPlugins: ['@n8n/eslint-config/plugin'],
			rules: {
				'n8n-local-rules/no-untyped-config-class-field': 'error',
			},
		},
	],
});
