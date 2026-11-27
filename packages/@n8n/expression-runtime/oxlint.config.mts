import { baseConfig } from '@n8n/oxlint-config/base';
import { defineConfig } from 'oxlint';

export default defineConfig({
	extends: [baseConfig],
	options: { typeAware: true },
	rules: {
		'import-x-alias/no-extraneous-dependencies': 'error',
		'n8n-local-rules/no-dynamic-regexp': 'error',
		complexity: ['error', 23],
	},
});
