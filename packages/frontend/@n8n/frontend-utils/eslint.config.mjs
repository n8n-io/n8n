import { defineConfig } from 'eslint/config';
import { frontendConfig } from '@n8n/eslint-config/frontend';

export default defineConfig(frontendConfig, {
	files: ['**/*.test.ts'],
	rules: {
		// Test spies (e.g. `vi.spyOn`) surface as loosely-typed values; align with
		// the sibling FE app-libs (composables, editor-ui) that treat these as
		// warnings in test files rather than errors.
		'@typescript-eslint/no-unsafe-assignment': 'warn',
		'@typescript-eslint/no-unsafe-call': 'warn',
		'@typescript-eslint/no-unsafe-member-access': 'warn',
		'@typescript-eslint/naming-convention': 'warn',
	},
});
