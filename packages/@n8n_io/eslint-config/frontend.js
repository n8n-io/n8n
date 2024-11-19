const isCI = process.env.CI === 'true';

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
			files: ['**/*.test.ts', '**/test/**/*.ts', '**/__tests__/**/*.ts', '**/*.stories.ts'],
			rules: {
				'import/no-extraneous-dependencies': 'off',
			},
		},
		{
			files: ['**/*.vue'],
			rules: {
				'vue/no-deprecated-slot-attribute': 'error',
				'vue/no-deprecated-slot-scope-attribute': 'error',
				'vue/no-multiple-template-root': 'error',
				'vue/v-slot-style': 'error',
				'vue/no-unused-components': 'error',
				'vue/multi-word-component-names': 'off',
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
				'vue/define-emits-declaration': ['error', 'type-literal'],
				'vue/require-macro-variable-name': [
					'error',
					{
						defineProps: 'props',
						defineEmits: 'emit',
						defineSlots: 'slots',
						useSlots: 'slots',
						useAttrs: 'attrs',
					},
				],
				'vue/block-order': [
					'error',
					{
						order: ['script', 'template', 'style'],
					},
				],
				'vue/no-v-html': 'error',

				// TODO: remove these
				'vue/no-mutating-props': 'warn',
				'vue/no-side-effects-in-computed-properties': 'warn',
				'vue/no-v-text-v-html-on-component': 'warn',
				'vue/return-in-computed-property': 'warn',
			},
		},
	],

	rules: {
		'no-console': 'warn',
		'no-debugger': isCI ? 'error' : 'off',
		semi: [2, 'always'],
		'comma-dangle': ['error', 'always-multiline'],
		'no-tabs': 0,
		'no-labels': 0,
		'@typescript-eslint/no-use-before-define': 'off',
		'@typescript-eslint/no-explicit-any': 'error',
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
		'n8n-local-rules/no-plain-errors': 'off',
	},
};
