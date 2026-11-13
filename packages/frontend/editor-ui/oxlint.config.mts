import { frontendConfig } from '@n8n/oxlint-config/frontend';
import { defineConfig } from 'oxlint';

/**
 * Extraction ratchet: a feature that has become a module package must not reappear
 * under `src/features/`. Append one entry per extraction — this list only grows.
 *
 * The old path no longer resolves, so this is about the message, not the failure: it
 * names the package and it says that the shell reaches a module through
 * `src/app/modules.manifest.ts`, not through a deep path.
 *
 * Spread into every block that sets `no-restricted-imports`. An override replaces
 * the rule options rather than merging them, so a scoped block that omits these
 * patterns would switch the ratchet off for its own files.
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
	{
		group: ['@/features/ai/mcpAccess', '@/features/ai/mcpAccess/*'],
		message:
			'mcpAccess is the @n8n/frontend-module-mcp package. The shell registers a module through src/app/modules.manifest.ts.',
	},
];

const prettierImport = {
	group: ['prettier', 'prettier/*'],
	allowTypeImports: true,
	message:
		'Use loadPrettier() from @/features/shared/editors/utils/loadPrettier. A static import puts prettier back in the startup bundle.',
};

export default defineConfig({
	extends: [frontendConfig],
	options: { typeAware: true },
	ignorePatterns: ['**/*.d.ts', '**/*.js', '**/*.ts.snap'],
	rules: {
		// TODO: Remove these
		'n8n-local-rules/no-internal-package-import': 'warn',
		'typescript/ban-ts-comment': 'off',
		'id-denylist': 'warn',
		'no-case-declarations': 'warn',
		'no-useless-escape': 'warn',
		'no-prototype-builtins': 'warn',
		'no-fallthrough': 'warn',
		'no-extra-boolean-cast': 'warn',
		'no-sparse-arrays': 'warn',
		'no-control-regex': 'warn',
		'import/no-cycle': 'warn',
		'import/no-duplicates': 'warn',
		'no-unsafe-optional-chaining': 'warn',
		'typescript/no-restricted-types': 'warn',
		'typescript/no-for-in-array': 'warn',
		'typescript/no-this-alias': 'warn',
		'typescript/no-unnecessary-boolean-literal-compare': 'warn',
		'typescript/no-unnecessary-type-assertion': 'warn',
		'no-unused-expressions': 'warn',
		'typescript/restrict-plus-operands': 'warn',
		'typescript/no-redundant-type-constituents': 'warn',
		'typescript/no-unsafe-enum-comparison': 'warn',
		'typescript/prefer-promise-reject-errors': 'warn',
		'typescript/no-base-to-string': 'warn',
		'typescript/restrict-template-expressions': 'warn',

		'no-restricted-imports': ['error', { patterns: [...extractedFeatures, prettierImport] }],

		// Vite bundles everything this package imports and nothing resolves it from
		// node_modules at runtime, so every dependency is a devDependency. That keeps
		// the frontend libraries out of the server image, which installs editor-ui's
		// production closure via packages/cli. The rule still catches imports of
		// packages the manifest does not declare at all.
		'import-x-alias/no-extraneous-dependencies': [
			'error',
			{ devDependencies: true, optionalDependencies: false },
		],
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
							prettierImport,
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
			// Oxlint also checks a dynamic `import()`, which ESLint did not. These files
			// load prettier on purpose: the loader itself, and tests that mock it.
			files: [
				'src/features/shared/editors/utils/loadPrettier.ts',
				'src/features/shared/editors/utils/loadPrettier.test.ts',
				'src/features/shared/editors/plugins/codemirror/format.test.ts',
			],
			rules: {
				'no-restricted-imports': ['error', { patterns: extractedFeatures }],
			},
		},
		{
			// The old Oxlint pass skipped `*.test.ts`, and ESLint ran on them only the
			// rules that Oxlint did not run. Test files keep that coverage and no more,
			// so this block turns off the rules of the old Oxlint pass.
			// TODO: Lint test files with the whole layer.
			files: ['**/*.test.ts'],
			rules: {
				eqeqeq: 'off',
				'for-direction': 'off',
				'no-array-constructor': 'off',
				'no-async-promise-executor': 'off',
				'no-compare-neg-zero': 'off',
				'no-cond-assign': 'off',
				'no-constant-binary-expression': 'off',
				'no-constant-condition': 'off',
				'no-delete-var': 'off',
				'no-dupe-else-if': 'off',
				'no-duplicate-case': 'off',
				'no-empty-character-class': 'off',
				'no-empty-pattern': 'off',
				'no-empty-static-block': 'off',
				'no-ex-assign': 'off',
				'no-global-assign': 'off',
				'no-invalid-regexp': 'off',
				'no-irregular-whitespace': 'off',
				'no-loss-of-precision': 'off',
				'no-misleading-character-class': 'off',
				'no-nonoctal-decimal-escape': 'off',
				'no-regex-spaces': 'off',
				'no-self-assign': 'off',
				'no-shadow-restricted-names': 'off',
				'no-unsafe-finally': 'off',
				'no-unused-labels': 'off',
				'no-unused-private-class-members': 'off',
				'no-useless-backreference': 'off',
				'no-useless-catch': 'off',
				'no-var': 'off',
				'no-void': 'off',
				'object-shorthand': 'off',
				'prefer-const': 'off',
				'prefer-rest-params': 'off',
				'require-yield': 'off',
				'typescript/array-type': 'off',
				'typescript/await-thenable': 'off',
				'typescript/consistent-type-assertions': 'off',
				'typescript/consistent-type-exports': 'off',
				'typescript/consistent-type-imports': 'off',
				'typescript/explicit-member-accessibility': 'off',
				'typescript/no-array-delete': 'off',
				'typescript/no-duplicate-enum-values': 'off',
				'typescript/no-duplicate-type-constituents': 'off',
				'typescript/no-explicit-any': 'off',
				'typescript/no-extra-non-null-assertion': 'off',
				'typescript/no-floating-promises': 'off',
				'typescript/no-implied-eval': 'off',
				'typescript/no-invalid-void-type': 'off',
				'typescript/no-misused-new': 'off',
				'typescript/no-misused-promises': 'off',
				'typescript/no-non-null-asserted-optional-chain': 'off',
				'typescript/no-require-imports': 'off',
				'typescript/no-unnecessary-qualifier': 'off',
				'typescript/no-unnecessary-type-constraint': 'off',
				'typescript/no-unsafe-declaration-merging': 'off',
				'typescript/no-unsafe-unary-minus': 'off',
				'typescript/no-wrapper-object-types': 'off',
				'typescript/only-throw-error': 'off',
				'typescript/prefer-as-const': 'off',
				'typescript/prefer-namespace-keyword': 'off',
				'typescript/promise-function-async': 'off',
				'typescript/return-await': 'off',
				'unicorn/no-unnecessary-await': 'off',
				'unicorn/no-useless-promise-resolve-reject': 'off',
				'use-isnan': 'off',
				'valid-typeof': 'off',
				'vue/no-arrow-functions-in-watch': 'off',
				'vue/no-deprecated-destroyed-lifecycle': 'off',
				'vue/no-export-in-script-setup': 'off',
				'vue/no-lifecycle-after-await': 'off',
				'vue/prefer-import-from-vue': 'off',
				'vue/valid-define-emits': 'off',
				'vue/valid-define-props': 'off',
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
				// A stub component keeps its Vue template in a plain string, where
				// `${...}` and backticks belong to the Vue expression and must stay
				// uninterpolated. Both rules read them as JavaScript.
				'n8n-local-rules/no-interpolation-in-regular-string': 'off',
				'n8n-local-rules/no-unneeded-backticks': 'off',
			},
		},
	],
});
