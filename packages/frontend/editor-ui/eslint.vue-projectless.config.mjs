import VuePlugin from 'eslint-plugin-vue';
import tseslint from 'typescript-eslint';

export default [
	...VuePlugin.configs['flat/recommended'],
	{
		files: ['**/*.vue'],
		linterOptions: {
			noInlineConfig: true,
		},
		languageOptions: {
			parserOptions: {
				parser: tseslint.parser,
			},
		},
		rules: {
			'vue/no-deprecated-slot-attribute': 'error',
			'vue/no-deprecated-slot-scope-attribute': 'error',
			'vue/no-multiple-template-root': 'off',
			'vue/v-slot-style': 'error',
			'vue/no-unused-components': 'error',
			'vue/no-undef-components': [
				'error',
				{
					ignorePatterns: [
						'RouterLink',
						'RouterView',
						'Teleport',
						'Transition',
						'TransitionGroup',
						'KeepAlive',
						'Suspense',
					],
				},
			],
			'vue/multi-word-component-names': 'off',
			'vue/component-name-in-template-casing': [
				'error',
				'PascalCase',
				{ registeredComponentsOnly: false },
			],
			'vue/no-reserved-component-names': [
				'error',
				{
					disallowVueBuiltInComponents: true,
					disallowVue3BuiltInComponents: false,
				},
			],
			'vue/prop-name-casing': ['error', 'camelCase'],
			'vue/attribute-hyphenation': 'off',
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
			'vue/block-order': ['error', { order: ['script', 'template', 'style'] }],
			'vue/no-v-html': 'error',
			'vue/no-mutating-props': 'warn',
			'vue/no-side-effects-in-computed-properties': 'warn',
			'vue/no-v-text-v-html-on-component': 'warn',
			'vue/return-in-computed-property': 'warn',
		},
	},
];
