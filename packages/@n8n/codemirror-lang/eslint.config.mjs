import { defineConfig, globalIgnores } from 'eslint/config';
import { baseConfig } from '@n8n/eslint-config/base';

export default defineConfig(baseConfig, globalIgnores(['src/expressions/grammar*.ts']), {
	rules: {
		'no-useless-escape': 'warn',
	},
});
