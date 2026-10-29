import { defineConfig } from 'oxlint';
import { baseConfig } from './base.js';

export const frontendConfig = defineConfig({
	extends: [baseConfig],
	plugins: ['vue'],
	jsPlugins: [{ name: '@n8n/design-system', specifier: '@n8n/eslint-plugin-design-system' }],
	env: { browser: true, node: true },
	rules: {
		'@stylistic/member-delimiter-style': 'off',
		'unicorn/filename-case': 'off',
		'@n8n/design-system/no-direct-component-imports': 'error',
		'typescript/no-deprecated': 'off',
	},
	overrides: [
		{
			files: ['**/*.vue'],
			rules: {
				'constructor-super': 'error',
				'getter-return': 'error',
				'no-class-assign': 'error',
				'no-const-assign': 'error',
				'no-dupe-class-members': 'error',
				'no-dupe-keys': 'error',
				'no-func-assign': 'error',
				'no-import-assign': 'error',
				'no-new-native-nonconstructor': 'error',
				'no-obj-calls': 'error',
				'no-redeclare': 'error',
				'no-setter-return': 'error',
				'no-this-before-super': 'error',
				'no-unreachable': 'error',
				'no-unsafe-negation': 'error',
				'no-with': 'error',
				'unused-imports/no-unused-imports': 'off',
				'vue/define-emits-declaration': ['error', 'type-literal'],
				'vue/no-reserved-component-names': [
					'error',
					{ disallowVueBuiltInComponents: true, disallowVue3BuiltInComponents: false },
				],
				'vue/prop-name-casing': ['error', 'camelCase'],
			},
		},
	],
});

export default frontendConfig;
