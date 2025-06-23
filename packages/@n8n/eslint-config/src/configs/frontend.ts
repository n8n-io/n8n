import { globalIgnores } from 'eslint/config';
import tseslint from 'typescript-eslint';
import VuePlugin from 'eslint-plugin-vue';
import globals from 'globals';
import { baseConfig } from './base.js';

const isCI = process.env.CI === 'true';
const extraFileExtensions = ['.vue'];
const allGlobals = { NodeJS: true, ...globals.node, ...globals.browser };

export const frontendConfig = tseslint.config(
	globalIgnores(['**/*.js', '**/*.d.ts', 'vite.config.ts', '**/*.ts.snap']),
	baseConfig,
	VuePlugin.configs['flat/recommended'],
	{
		rules: {
			'no-console': 'warn',
			'no-debugger': isCI ? 'error' : 'off',
			semi: [2, 'always'],
			'comma-dangle': ['error', 'always-multiline'],
			'no-tabs': 0,
			'no-labels': 0,
			'@typescript-eslint/no-use-before-define': 'warn',
			'@typescript-eslint/no-explicit-any': 'error',
			'import/no-extraneous-dependencies': 'warn',

			// TODO: fix these
			'@typescript-eslint/no-unsafe-call': 'warn',
			'@typescript-eslint/no-unsafe-assignment': 'warn',
			'@typescript-eslint/no-unsafe-argument': 'warn',
			'@typescript-eslint/no-unsafe-return': 'warn',
			'@typescript-eslint/restrict-template-expressions': 'warn',
			'@typescript-eslint/unbound-method': 'warn',
			'@typescript-eslint/no-unsafe-member-access': 'warn',
		},
	},
	{
		files: ['**/*.ts'],
		languageOptions: {
			ecmaVersion: 'latest',
			sourceType: 'module',
			globals: allGlobals,
			parser: tseslint.parser,
			parserOptions: { projectService: true, extraFileExtensions },
		},
	},
	{
		files: ['**/*.vue'],
		languageOptions: {
			ecmaVersion: 'latest',
			sourceType: 'module',
			globals: allGlobals,
			parserOptions: {
				parser: tseslint.parser,
				extraFileExtensions,
			},
		},
	},
	{
		files: ['**/*.test.ts', '**/test/**/*.ts', '**/__tests__/**/*.ts', '**/*.stories.ts'],
		rules: {
			'import/no-extraneous-dependencies': 'warn',
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
);
