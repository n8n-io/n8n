import { defineConfig } from 'eslint/config';
import { nodeConfig } from '@n8n/eslint-config/node';

export default defineConfig(nodeConfig, {
	rules: {
		'unicorn/filename-case': ['error', { case: 'kebabCase' }],
	},
});
