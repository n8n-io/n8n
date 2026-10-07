import { baseConfig } from '@n8n/oxlint-config/base';
import { defineConfig } from 'oxlint';

export default defineConfig({
	extends: [baseConfig],
	options: { typeAware: true },
	ignorePatterns: ['src/grammar*.ts'],
	rules: {
		'no-useless-escape': 'off',
		'typescript/no-deprecated': 'off',
		'typescript/no-unsafe-enum-comparison': 'off',
	},
});
