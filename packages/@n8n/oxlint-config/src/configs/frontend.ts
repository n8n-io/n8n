import { defineConfig } from 'oxlint';
import { baseConfig } from './base.js';

export const frontendConfig = defineConfig({
	extends: [baseConfig],
	plugins: ['vue'],
	env: { browser: true, node: true },
	rules: {
		'unicorn/filename-case': 'off',
		'n8n-local-rules/no-reka-ui-pagination': 'error',
		'vue/define-emits-declaration': ['error', 'type-literal'],
		'vue/no-reserved-component-names': [
			'error',
			{ disallowVueBuiltInComponents: true, disallowVue3BuiltInComponents: false },
		],
		'vue/prop-name-casing': ['error', 'camelCase'],
	},
});

export default frontendConfig;
