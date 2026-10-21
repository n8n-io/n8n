import { defineConfig } from 'oxlint';
import { baseConfig } from './base.js';

export const frontendConfig = defineConfig({
	extends: [baseConfig],
	plugins: ['vue'],
	env: { browser: true, node: true },
	rules: {
		'unicorn/filename-case': 'off',
		// The import ban runs here. The `<ElDialog>` template check stays on ESLint:
		// Oxlint does not visit Vue template nodes.
		'n8n-local-rules/no-element-plus-dialog': 'error',
		'n8n-local-rules/no-reka-ui-dialog': 'error',
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
