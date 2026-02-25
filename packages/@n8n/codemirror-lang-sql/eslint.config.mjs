import { defineConfig, globalIgnores } from 'eslint/config';
import { baseConfig } from '@n8n/eslint-config/base';

export default defineConfig(baseConfig, globalIgnores(['src/grammar*.ts']), {
	rules: {
		'@typescript-eslint/naming-convention': 'warn',
		'no-useless-escape': 'warn',
		'@typescript-eslint/unbound-method': 'warn',
		'@typescript-eslint/prefer-nullish-coalescing': 'warn',
		'@typescript-eslint/no-unsafe-enum-comparison': 'off',
		'@typescript-eslint/naming-convention': 'off',
	},
});
