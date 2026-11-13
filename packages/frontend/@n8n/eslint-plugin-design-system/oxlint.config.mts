import { defineConfig } from 'oxlint';

/**
 * The rules of `typescript-eslint`'s `recommended` config, which this package
 * linted with before. It extends no `@n8n/oxlint-config` layer, because
 * `@n8n/oxlint-config` depends on this package, so extending one would be a cycle.
 */
export default defineConfig({
	plugins: ['typescript'],
	categories: { correctness: 'off' },
	options: { typeAware: true },
	rules: {
		'no-array-constructor': 'error',
		'no-unused-expressions': 'error',
		'no-unused-vars': 'error',
		'no-var': 'error',
		'prefer-const': 'error',
		'prefer-rest-params': 'error',
		'prefer-spread': 'error',
		'typescript/ban-ts-comment': 'error',
		'typescript/no-duplicate-enum-values': 'error',
		'typescript/no-empty-object-type': 'error',
		'typescript/no-explicit-any': 'error',
		'typescript/no-extra-non-null-assertion': 'error',
		'typescript/no-misused-new': 'error',
		'typescript/no-namespace': 'error',
		'typescript/no-non-null-asserted-optional-chain': 'error',
		'typescript/no-require-imports': 'error',
		'typescript/no-this-alias': 'error',
		'typescript/no-unnecessary-type-constraint': 'error',
		'typescript/no-unsafe-declaration-merging': 'error',
		'typescript/no-unsafe-function-type': 'error',
		'typescript/no-wrapper-object-types': 'error',
		'typescript/prefer-as-const': 'error',
		'typescript/prefer-namespace-keyword': 'error',
		'typescript/triple-slash-reference': 'error',
	},
});
