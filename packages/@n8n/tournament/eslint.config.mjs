import { defineConfig } from 'eslint/config';
import { baseConfig } from '@n8n/eslint-config/base';

export default defineConfig(baseConfig, {
	rules: {
		'@typescript-eslint/naming-convention': 'off',
		'@typescript-eslint/no-unsafe-function-type': 'off',
		'@typescript-eslint/no-restricted-types': 'off',
		'@typescript-eslint/no-implied-eval': 'off',
		'@typescript-eslint/no-unsafe-return': 'off',
		'@typescript-eslint/no-explicit-any': 'off',
		'@typescript-eslint/no-unsafe-member-access': 'off',
		'@typescript-eslint/no-unsafe-assignment': 'off',
	},
});
