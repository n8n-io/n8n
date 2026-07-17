import { defineConfig } from 'eslint/config';
import { frontendConfig } from '@n8n/eslint-config/frontend';

export default defineConfig(frontendConfig, {
	files: ['**/*.test.ts'],
	rules: {
		// Vitest spies stored in untyped `let`s surface as `any`; align with the
		// sibling FE app-libs (editor-ui) that treat these as warnings in tests.
		'@typescript-eslint/no-unsafe-assignment': 'warn',
		'@typescript-eslint/no-unsafe-call': 'warn',
		'@typescript-eslint/no-unsafe-member-access': 'warn',
		// Component tests key DOM attributes (e.g. `data-test-id`) via string
		// literals; align with the sibling FE app-libs that treat this as a warning.
		'@typescript-eslint/naming-convention': 'warn',
	},
});
