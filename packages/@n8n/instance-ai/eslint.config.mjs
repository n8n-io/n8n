import { defineConfig } from 'eslint/config';
import { baseConfig } from '@n8n/eslint-config/base';

const LAZY_RUNTIME_IMPORT_MESSAGE =
	'Use an existing lazy loader, or add one near first use. Static runtime imports of this dependency undo the idle-memory guardrail.';

const restrictedLazyRuntimeImports = [
	'@daytonaio/sdk',
	'@joplin/turndown-plugin-gfm',
	'@mozilla/readability',
	'csv-parse/sync',
	'linkedom',
	'pdf-parse',
	'psl',
	'turndown',
].map((name) => ({
	name,
	allowTypeImports: true,
	message: LAZY_RUNTIME_IMPORT_MESSAGE,
}));

export default defineConfig(
	baseConfig,
	{
		ignores: ['scripts/**/*.cjs', 'skills/**/*.mjs'],
	},
	{
		rules: {
			// Tool names may be kebab-case identifiers (e.g. 'list-workflows'), which
			// require quotes in object literals. Skip naming checks for those.
			'@typescript-eslint/naming-convention': [
				'error',
				{
					selector: 'objectLiteralProperty',
					modifiers: ['requiresQuotes'],
					format: null,
				},
			],
		},
	},
	{
		files: ['src/**/*.ts'],
		ignores: ['src/**/__tests__/**/*.ts'],
		rules: {
			'@typescript-eslint/no-restricted-imports': [
				'error',
				{ paths: restrictedLazyRuntimeImports },
			],
		},
	},
	{
		files: ['src/tools/__tests__/**/*.test.ts'],
		rules: {
			// Tool execute() returns complex discriminated-union types that resolve
			// differently across environments (error-typed in CI). Relax type-safety
			// lint rules in test files where we assert on tool behavior, not types.
			'@typescript-eslint/no-unsafe-assignment': 'off',
			'@typescript-eslint/no-unsafe-member-access': 'off',
			'@typescript-eslint/no-unsafe-argument': 'off',
		},
	},
	{
		files: ['evaluations/computer-use/report-html.ts'],
		rules: {
			// Large template literal + inline CSS: type-aware `no-unsafe-*` rules
			// can false-positive (imports/fields show as `error` in some editors).
			// `tsc -p` still typechecks this file (evaluations/** is in tsconfig).
			'@typescript-eslint/no-unsafe-assignment': 'off',
			'@typescript-eslint/no-unsafe-member-access': 'off',
			'@typescript-eslint/no-unsafe-argument': 'off',
			'@typescript-eslint/no-unsafe-call': 'off',
		},
	},
);
