import { globalIgnores } from 'eslint/config';
import tseslint from 'typescript-eslint';
import VuePlugin from 'eslint-plugin-vue';
import eslintConfigPrettier from 'eslint-config-prettier/flat';
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
			'@typescript-eslint/no-use-before-define': 'warn',
			'@typescript-eslint/no-explicit-any': 'error',
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
		files: ['**/*.test.ts', '**/test/**/*.ts', '**/__tests__/**/*.ts', '**/*.stories.ts'],
		rules: {
			'import-x/no-extraneous-dependencies': 'warn',
			'vue/one-component-per-file': 'off',

			// TODO: remove these
			'n8n-local-rules/no-internal-package-import': 'warn',
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
		rules: {
			'vue/no-deprecated-slot-attribute': 'error',
			'vue/no-deprecated-slot-scope-attribute': 'error',
			'vue/no-multiple-template-root': 'error',
			'vue/v-slot-style': 'error',
			'vue/no-unused-components': 'error',
			'vue/no-undef-components': [
				'error',
				{
					ignorePatterns: [
						'FontAwesomeIcon', // Globally registered in plugins/icons/index.ts
						'RouterLink', // Vue Router global component
						'RouterView', // Vue Router global component
						'Teleport', // Vue 3 built-in
						'Transition', // Vue 3 built-in
						'TransitionGroup', // Vue 3 built-in
						'KeepAlive', // Vue 3 built-in
						'Suspense', // Vue 3 built-in
					],
				},
			],
			'vue/multi-word-component-names': 'off',
			'vue/component-name-in-template-casing': [
				'error',
				'PascalCase',
				{
					registeredComponentsOnly: false,
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
			'n8n-local-rules/no-internal-package-import': 'warn',
		},
	},
	eslintConfigPrettier,
);
