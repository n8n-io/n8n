import { frontendConfig } from '@n8n/oxlint-config/frontend';
import { defineConfig } from 'oxlint';

export default defineConfig({
	extends: [frontendConfig],
	options: { typeAware: true },
	ignorePatterns: ['src/shims.d.ts'],
	rules: {
		'typescript/no-deprecated': 'off',
	},
});
