import { defineConfig } from 'oxlint';
import { baseConfig } from './base.js';
import { vueConfig } from './vue.js';

export const frontendConfig = defineConfig({
	extends: [baseConfig, vueConfig],
	env: { browser: true, node: true },
	rules: {
		'unicorn/filename-case': 'off',
		'n8n-local-rules/no-reka-ui-pagination': 'error',
	},
	overrides: [
		{
			// oxlint sees only the script block, so an import used only in the
			// template reads as unused.
			files: ['**/*.vue'],
			rules: { 'unused-imports/no-unused-imports': 'off' },
		},
	],
});

export default frontendConfig;
