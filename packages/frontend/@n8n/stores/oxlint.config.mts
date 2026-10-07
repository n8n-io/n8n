import { defineConfig } from 'oxlint';
import { frontendConfig } from '@n8n/oxlint-config/frontend';

export default defineConfig({
	extends: [frontendConfig],
	options: { typeAware: true },
	// Not inherited through `extends`.
	ignorePatterns: frontendConfig.ignorePatterns,
	rules: {
		'typescript/no-unnecessary-type-assertion': 'warn',
	},
});
