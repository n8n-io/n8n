import { defineConfig } from 'oxlint';
import { frontendConfig } from '@n8n/oxlint-config/frontend';

/**
 * Extraction ratchet: a feature that has become a module package must not reappear
 * under `src/features/`. Append one entry per extraction — this list only grows.
 *
 * The old path no longer resolves, so this is about the message, not the failure: it
 * names the package and it says that the shell reaches a module through
 * `src/app/modules.manifest.ts`, not through a deep path.
 *
 * Spread into every block that sets `no-restricted-imports`. A later block replaces
 * the rule's options wholesale rather than merging them, so a scoped block that
 * omits these patterns would switch the ratchet off for its own files.
 */
const extractedFeatures = [
	{
		group: ['@/features/instanceRegistry', '@/features/instanceRegistry/*'],
		message:
			'instanceRegistry is the @n8n/frontend-module-instance-registry package. The shell registers a module through src/app/modules.manifest.ts.',
	},
	{
		group: ['@/features/settings/otel', '@/features/settings/otel/*'],
		message:
			'otel is the @n8n/frontend-module-otel package. The shell registers a module through src/app/modules.manifest.ts.',
	},
	{
		group: ['@/features/execution/insights', '@/features/execution/insights/*'],
		message:
			'insights is the @n8n/frontend-module-insights package. The shell registers a module through src/app/modules.manifest.ts.',
	},
];

export default defineConfig({
	extends: [frontendConfig],
	options: { typeAware: true },
	// Not inherited through `extends`. Stories sit outside the TS project, which
	// the type-aware rules need (see the `exclude` in tsconfig.json).
	ignorePatterns: [...frontendConfig.ignorePatterns, 'src/**/*.stories.ts'],
	rules: {
		'no-restricted-imports': ['error', { patterns: extractedFeatures }],
		// Vite bundles everything this package imports and nothing resolves it from
		// node_modules at runtime, so every dependency is a devDependency. That keeps
		// the frontend libraries out of the server image, which installs editor-ui's
		// production closure via packages/cli. The rule still catches imports of
		// packages the manifest does not declare at all.
		'import-x-alias/no-extraneous-dependencies': [
			'error',
			{ devDependencies: true, optionalDependencies: false },
		],

		// TODO: Remove these
		'typescript/ban-ts-comment': 'off',
		'id-denylist': 'warn',
		// New with the move to oxlint: ESLint never ran this rule here.
		'typescript/no-deprecated': 'warn',
		'no-case-declarations': 'warn',
		'no-useless-escape': 'warn',
		'no-prototype-builtins': 'warn',
		'no-fallthrough': 'warn',
		'no-extra-boolean-cast': 'warn',
		'no-sparse-arrays': 'warn',
		'no-control-regex': 'warn',
		'no-unsafe-optional-chaining': 'warn',
		'no-unused-expressions': 'warn',
		'import/no-cycle': 'warn',
		'import/no-duplicates': 'warn',
		'typescript/no-restricted-types': 'warn',
		'typescript/no-for-in-array': 'warn',
		'typescript/no-this-alias': 'warn',
		'typescript/no-unnecessary-boolean-literal-compare': 'warn',
		'typescript/no-unnecessary-type-assertion': 'warn',
		'typescript/prefer-promise-reject-errors': 'warn',
		'typescript/restrict-plus-operands': 'warn',
		'typescript/no-redundant-type-constituents': 'warn',
		'typescript/no-unsafe-enum-comparison': 'warn',
		'typescript/no-base-to-string': 'warn',
		'typescript/restrict-template-expressions': 'warn',
	},
	overrides: [
		{
			files: ['src/features/agents/**/*.ts', 'src/features/agents/**/*.vue'],
			rules: {
				'no-restricted-imports': [
					'error',
					{
						patterns: [
							...extractedFeatures,
							{
								group: ['**/ndv/runData/components/RunData.vue'],
								message:
									'Use StandaloneRunData inside StandaloneRunDataHost so scoped providers and cleanup are owned consistently.',
							},
						],
					},
				],
			},
		},
		{
			files: [
				'src/**/*.test.ts',
				'src/**/test/**/*.ts',
				'src/**/__test__/**/*.ts',
				'src/**/__tests__/**/*.ts',
			],
			rules: {
				// oxlint skipped test files before this config, and ESLint turned
				// these rules off for them. TODO: fix the tests and remove these.
				eqeqeq: 'warn',
				'no-void': 'warn',
				'object-shorthand': 'warn',
				'prefer-const': 'warn',
				'import-x-alias/no-extraneous-dependencies': 'warn',
				'typescript/array-type': 'warn',
				'typescript/await-thenable': 'warn',
				'typescript/consistent-type-imports': 'warn',
				'typescript/explicit-member-accessibility': 'warn',
				'typescript/no-duplicate-type-constituents': 'warn',
				'typescript/no-explicit-any': 'warn',
				'typescript/no-floating-promises': 'warn',
				'typescript/no-invalid-void-type': 'warn',
				'typescript/promise-function-async': 'warn',
				'typescript/return-await': 'warn',

				'n8n-local-rules/no-dynamic-regexp': 'off',

				// A stub component keeps its Vue template in a plain string, where
				// `${...}` and backticks belong to the Vue expression and must stay
				// uninterpolated. Both rules read them as JavaScript.
				'n8n-local-rules/no-interpolation-in-regular-string': 'off',
				'n8n-local-rules/no-unneeded-backticks': 'off',

				// A test parses fixtures it declares itself. An unexpected throw is
				// the signal the test wants, so it needs no guard.
				'n8n-local-rules/no-uncaught-json-parse': 'off',
			},
		},
		{
			// CodeMirror/expression-editor autocomplete builders construct short
			// prefix-matching regexes from the user's current cursor token. The
			// patterns are dev-controlled templates wrapped around short keystroke
			// fragments and run only in the browser against trivially small input.
			files: [
				'src/features/shared/editors/components/CodeNodeEditor/**',
				'src/features/shared/editors/plugins/codemirror/completions/**',
				'src/features/settings/environments.ee/completions/**',
			],
			rules: {
				// oxlint skipped test files before this config, and ESLint turned
				// these rules off for them. TODO: fix the tests and remove these.
				eqeqeq: 'warn',
				'no-void': 'warn',
				'object-shorthand': 'warn',
				'prefer-const': 'warn',
				'import-x-alias/no-extraneous-dependencies': 'warn',
				'typescript/array-type': 'warn',
				'typescript/await-thenable': 'warn',
				'typescript/consistent-type-imports': 'warn',
				'typescript/explicit-member-accessibility': 'warn',
				'typescript/no-duplicate-type-constituents': 'warn',
				'typescript/no-explicit-any': 'warn',
				'typescript/no-floating-promises': 'warn',
				'typescript/no-invalid-void-type': 'warn',
				'typescript/promise-function-async': 'warn',
				'typescript/return-await': 'warn',

				'n8n-local-rules/no-dynamic-regexp': 'off',
			},
		},
	],
});
