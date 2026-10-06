import { baseConfig } from '@n8n/oxlint-config/base';
import { defineConfig } from 'oxlint';

export default defineConfig({
	extends: [baseConfig],
	options: { typeAware: true },
	ignorePatterns: ['src/shims.d.ts', '**/*.vue'],
	rules: {
		'typescript/no-deprecated': 'off',
	},
});
