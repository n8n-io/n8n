import { defineConfig } from 'eslint/config';
import { baseConfig } from '@n8n/eslint-config/base';

export default defineConfig(baseConfig, {
	rules: {
		// Mastra tool names are kebab-case identifiers (e.g. 'list-workflows')
		// which require quotes in object literals — skip naming checks for those
		'@typescript-eslint/naming-convention': [
			'error',
			{
				selector: 'objectLiteralProperty',
				modifiers: ['requiresQuotes'],
				format: null,
			},
		],
	},
}, {
	files: ['src/tools/__tests__/**/*.test.ts'],
	rules: {
		// Tool execute() returns complex discriminated-union types that resolve
		// differently across environments (error-typed in CI). Relax type-safety
		// lint rules in test files where we assert on tool behavior, not types.
		'@typescript-eslint/no-unsafe-assignment': 'off',
		'@typescript-eslint/no-unsafe-member-access': 'off',
		'@typescript-eslint/no-unsafe-argument': 'off',
	},
});
