/**
 * @type {import('@types/eslint').ESLint.ConfigData}
 */
module.exports = {
	plugins: ['vue'],

	extends: ['plugin:vue/vue3-essential', '@vue/typescript', './base'],

	env: {
		browser: true,
		es6: true,
		node: true,
	},

	ignorePatterns: ['**/*.js', '**/*.d.ts', 'vite.config.ts', '**/*.ts.snap'],

	overrides: [
		{
			files: ['src/**/*.vue'],
			rules: {
				'n8n-local-rules/dangerously-use-html-string-missing': 'error',
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

		// TODO: fix these
		'@typescript-eslint/no-unsafe-call': 'off',
		'@typescript-eslint/no-unsafe-assignment': 'off',
		'@typescript-eslint/restrict-template-expressions': 'off',
		'@typescript-eslint/unbound-method': 'off',

		// TODO: remove these
		'vue/no-mutating-props': 'warn',
		'vue/no-side-effects-in-computed-properties': 'warn',
		'vue/no-v-text-v-html-on-component': 'warn',
		'vue/return-in-computed-property': 'warn',
	},
};
