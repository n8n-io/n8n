/**
 * @type {import('@types/eslint').ESLint.ConfigData}
 */
module.exports = {
	plugins: ['vue'],

	extends: ['plugin:vue/vue3-recommended', '@vue/typescript', './base'],

	env: {
		browser: true,
		es6: true,
		node: true,
	},

	ignorePatterns: ['**/*.js', '**/*.d.ts', 'vite.config.ts', '**/*.ts.snap'],

	overrides: [
		{
			files: ['**/*.test.ts', '**/test/**/*.ts', '**/__tests__/**/*.ts'],
			rules: {
				'import/no-extraneous-dependencies': 'off',
			},
		},
	],

	rules: {
		'no-console': process.env.NODE_ENV === 'production' ? 'error' : 'off',
		'no-debugger': process.env.NODE_ENV === 'production' ? 'error' : 'off',
		semi: [2, 'always'],
		'comma-dangle': ['error', 'always-multiline'],
		'no-tabs': 0,
		'no-labels': 0,
		'vue/no-deprecated-slot-attribute': 'error',
		'vue/no-deprecated-slot-scope-attribute': 'error',
		'vue/no-multiple-template-root': 'error',
		'vue/v-slot-style': 'error',
		'vue/no-unused-components': 'error',
		'vue/multi-word-component-names': 'off',
		'@typescript-eslint/no-explicit-any': 'error',
		'vue/component-name-in-template-casing': [
			'error',
			'PascalCase',
			{
				registeredComponentsOnly: true,
			},
		],
		'vue/no-reserved-component-names': [
			'error',
			{
				disallowVueBuiltInComponents: true,
				disallowVue3BuiltInComponents: false,
			},
		],
		'vue/prop-name-casing': ['error', 'camelCase'],
		'vue/attribute-hyphenation': ['error', 'always'],
		'import/no-extraneous-dependencies': 'warn',

		// TODO: fix these
		'@typescript-eslint/no-unsafe-call': 'off',
		'@typescript-eslint/no-unsafe-assignment': 'off',
		'@typescript-eslint/no-unsafe-argument': 'off',
		'@typescript-eslint/no-unsafe-return': 'off',
		'@typescript-eslint/restrict-template-expressions': 'off',
		'@typescript-eslint/unbound-method': 'off',
		'@typescript-eslint/no-unsafe-member-access': 'off',

		// TODO: remove these
		'vue/no-mutating-props': 'warn',
		'vue/no-side-effects-in-computed-properties': 'warn',
		'vue/no-v-text-v-html-on-component': 'warn',
		'vue/return-in-computed-property': 'warn',
		'n8n-local-rules/no-plain-errors': 'off',
	},
};
