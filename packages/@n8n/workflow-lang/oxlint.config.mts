import { backendConfig } from '@n8n/oxlint-config/backend';
import { defineConfig } from 'oxlint';

export default defineConfig({
	extends: [backendConfig],
	options: { typeAware: true },
	ignorePatterns: ['corpus/**', 'src/generated/**', 'src/nodes/declarative/**'],
	overrides: [
		{
			// The reference runner and the test VM model workflow semantics: workflow
			// code throws plain values and converts any value to a string.
			files: ['./src/reference/runner.ts', './src/testing/vm.ts'],
			rules: {
				'typescript/only-throw-error': 'off',
				'typescript/prefer-promise-reject-errors': 'off',
				'typescript/no-base-to-string': 'off',
			},
		},
		{
			// The translator emits template strings into generated code.
			files: ['./scripts/translate-declarative.ts'],
			rules: {
				'n8n-local-rules/no-interpolation-in-regular-string': 'off',
				'typescript/no-base-to-string': 'off',
			},
		},
	],
});
