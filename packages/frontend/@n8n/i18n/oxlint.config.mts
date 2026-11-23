import { frontendConfig } from '@n8n/oxlint-config/frontend';
import { defineConfig } from 'oxlint';

export default defineConfig({
	extends: [frontendConfig],
	options: { typeAware: true },
	ignorePatterns: ['**/*.d.ts'],
	rules: {
		'typescript/no-unnecessary-type-assertion': 'warn',
	},
});
