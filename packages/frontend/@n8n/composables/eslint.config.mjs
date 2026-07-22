import { defineConfig } from 'eslint/config';
import { frontendConfig } from '@n8n/eslint-config/frontend';

export default defineConfig(frontendConfig, {
	files: ['**/*.test.ts'],
	rules: {
		'@typescript-eslint/no-unsafe-assignment': 'warn',
		// Component tests key DOM attributes (e.g. `data-test-id`) via string
		// literals; align with the sibling FE app-libs that treat this as a warning.
		'@typescript-eslint/naming-convention': 'warn',
	},
});
