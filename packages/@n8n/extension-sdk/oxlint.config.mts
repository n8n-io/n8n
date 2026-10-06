import { baseConfig } from '@n8n/oxlint-config/base';
import { defineConfig } from 'oxlint';

export default defineConfig({
	extends: [baseConfig],
	options: { typeAware: true },
	ignorePatterns: ['**/*.vue'],
	rules: {
		'typescript/no-deprecated': 'off',
		'typescript/no-floating-promises': 'off',
		'typescript/no-unnecessary-boolean-literal-compare': 'off',
	},
});
