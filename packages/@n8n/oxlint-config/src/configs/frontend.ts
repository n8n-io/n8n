import { defineConfig } from 'oxlint';
import { baseConfig } from './base.js';

export const frontendConfig = defineConfig({
	extends: [baseConfig],
	plugins: ['vue'],
	// The alias matches the ESLint plugin key so the rule id stays the same.
	jsPlugins: [{ name: '@n8n/design-system', specifier: '@n8n/eslint-plugin-design-system' }],
	env: { browser: true, node: true },
	rules: {
		'unicorn/filename-case': 'off',
		'@n8n/design-system/no-direct-wrapped-component-imports': 'error',
		'vue/define-emits-declaration': ['error', 'type-literal'],
		'vue/no-reserved-component-names': [
			'error',
			{ disallowVueBuiltInComponents: true, disallowVue3BuiltInComponents: false },
		],
		'vue/prop-name-casing': ['error', 'camelCase'],
	},
});

export default frontendConfig;
