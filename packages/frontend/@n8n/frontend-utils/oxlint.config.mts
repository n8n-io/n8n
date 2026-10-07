import { defineConfig } from 'oxlint';
import { frontendConfig } from '@n8n/oxlint-config/frontend';

export default defineConfig({
	extends: [frontendConfig],
	options: { typeAware: true },
	// Not inherited through `extends`.
	ignorePatterns: frontendConfig.ignorePatterns,
	overrides: [
		{
			files: ['**/*.test.ts'],
			rules: {
				// Test spies (e.g. `vi.spyOn`) surface as loosely-typed values; align with
				// the sibling FE app-libs (composables, editor-ui) that treat these as
				// warnings in test files rather than errors.
				'typescript/no-unsafe-assignment': 'warn',
				'typescript/no-unsafe-call': 'warn',
				'typescript/no-unsafe-member-access': 'warn',
			},
		},
	],
});
