import { baseConfig } from '@n8n/oxlint-config/base';
import { defineConfig } from 'oxlint';

export default defineConfig({
	extends: [baseConfig],
	options: { typeAware: true },
	rules: {
		'typescript/no-deprecated': 'off',
		'typescript/no-restricted-types': 'off',
		'typescript/no-implied-eval': 'off',
		'typescript/no-explicit-any': 'off',
		'unicorn/filename-case': 'off',
	},
});
