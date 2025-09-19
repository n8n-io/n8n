import { defineConfig, globalIgnores } from 'eslint/config';
import { baseConfig } from '@n8n/eslint-config/base';

export default defineConfig(baseConfig, globalIgnores(['src/expressions/grammar*.ts']), {
	rules: {
		// TODO: Remove this
		'@typescript-eslint/naming-convention': 'warn',
		'no-useless-escape': 'warn',
		'@typescript-eslint/unbound-method': 'warn',
	},
});
