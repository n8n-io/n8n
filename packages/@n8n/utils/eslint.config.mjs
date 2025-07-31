import { defineConfig } from 'eslint/config';
import { nodeConfig } from '@n8n/eslint-config/node';

export default defineConfig(nodeConfig, {
	rules: {
		// Upgraded from warn to error - demonstrating strict rule approach
		'no-prototype-builtins': 'error',
		'@typescript-eslint/require-await': 'error',
	},
});
