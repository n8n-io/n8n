import { baseConfig } from '@n8n/eslint-config/base';
import { defineConfig } from 'eslint/config';

export default defineConfig(baseConfig, {
	files: ['src/**/*.ts'],
	rules: {
		'@typescript-eslint/naming-convention': 'off',
		'import-x/no-default-export': 'off',
	},
});
