import { backendConfig } from '@n8n/oxlint-config/backend';
import { defineConfig } from 'oxlint';

export default defineConfig({
	extends: [backendConfig],
	options: { typeAware: true },
	overrides: [
		{
			files: ['src/redactable.ts'],
			rules: {
				'typescript/no-base-to-string': 'warn',
			},
		},
		{
			files: ['**/*.test.ts'],
			rules: {
				'no-unused-expressions': 'warn',
				'typescript/no-unsafe-assignment': 'warn',
				'typescript/unbound-method': 'warn',
				'import/no-duplicates': 'warn',
			},
		},
	],
});
