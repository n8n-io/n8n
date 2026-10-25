import { defineConfig } from 'oxlint';
import { baseConfig } from './base.js';

export const frontendConfig = defineConfig({
	extends: [baseConfig],
	plugins: ['vue'],
	env: { browser: true, node: true },
	rules: {
		'unicorn/filename-case': 'off',
		'n8n-local-rules/no-element-plus-menu': 'error',
		'n8n-local-rules/no-reka-ui-checkbox': 'error',
		'n8n-local-rules/no-reka-ui-combobox': 'error',
		'n8n-local-rules/no-reka-ui-date-range-picker': 'error',
		'n8n-local-rules/no-reka-ui-dialog': 'error',
		'n8n-local-rules/no-reka-ui-editable': 'error',
		'n8n-local-rules/no-reka-ui-number-field': 'error',
		'n8n-local-rules/no-reka-ui-pagination': 'error',
		'n8n-local-rules/no-reka-ui-popover': 'error',
		'n8n-local-rules/no-reka-ui-radio-group': 'error',
		'n8n-local-rules/no-reka-ui-scroll-area': 'error',
		'n8n-local-rules/no-reka-ui-select': 'error',
		'n8n-local-rules/no-reka-ui-switch': 'error',
		'n8n-local-rules/no-reka-ui-tags-input': 'error',
		'n8n-local-rules/no-reka-ui-toggle': 'error',
		'n8n-local-rules/no-reka-ui-tooltip': 'error',
		'n8n-local-rules/no-reka-ui-tree': 'error',
		'vue/define-emits-declaration': ['error', 'type-literal'],
		'vue/no-reserved-component-names': [
			'error',
			{ disallowVueBuiltInComponents: true, disallowVue3BuiltInComponents: false },
		],
		'vue/prop-name-casing': ['error', 'camelCase'],
	},
});

export default frontendConfig;
