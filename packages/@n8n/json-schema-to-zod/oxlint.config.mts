import { baseConfig } from '@n8n/oxlint-config/base';
import { defineConfig } from 'oxlint';

export default defineConfig({
	extends: [baseConfig],
	options: { typeAware: true },
	rules: {
		'import/no-cycle': 'off',
		complexity: 'error',
		'no-constant-condition': 'off',
		'typescript/no-deprecated': 'off',
	},
	overrides: [
		{
			files: ['**/*.test.ts'],
			rules: {
				'typescript/no-unused-expressions': 'off',
				'typescript/no-unsafe-assignment': 'off',
				'typescript/ban-ts-comment': 'off',
			},
		},
	],
});
