import { backendConfig } from '@n8n/oxlint-config/backend';
import { defineConfig } from 'oxlint';

export default defineConfig({
	extends: [backendConfig],
	options: { typeAware: true },
	ignorePatterns: ['src/template/templates/**/template', 'src/template/templates/shared'],
	overrides: [
		{
			files: ['**/*.test.ts', 'src/test-utils/**/*'],
			jsPlugins: ['@n8n/oxlint-config/import-x-alias'],
			rules: {
				'import-x-alias/no-extraneous-dependencies': ['error', { devDependencies: true }],
			},
		},
	],
});
