import { backendConfig } from '@n8n/oxlint-config/backend';
import { defineConfig } from 'oxlint';

export default defineConfig({
	extends: [backendConfig],
	options: { typeAware: true },
	ignorePatterns: ['stryker.config.mjs', 'vitest.stryker.config.ts', '.stryker-tmp/**'],
	overrides: [
		{
			files: ['./src/**/*.ts'],
			rules: {
				'no-restricted-imports': [
					'error',
					{
						paths: ['@n8n/db', '@n8n/di', '@n8n/typeorm'],
					},
				],
			},
		},
	],
});
