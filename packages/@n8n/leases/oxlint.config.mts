import { backendConfig } from '@n8n/oxlint-config/backend';
import { defineConfig } from 'oxlint';

export default defineConfig({
	extends: [backendConfig],
	options: { typeAware: true },
	overrides: [
		{
			files: ['./src/**/*.ts'],
			rules: {
				'no-restricted-imports': [
					'error',
					{
						paths: ['@n8n/db', '@n8n/di', '@n8n/typeorm', '@n8n/scheduler'],
					},
				],
			},
		},
	],
});
