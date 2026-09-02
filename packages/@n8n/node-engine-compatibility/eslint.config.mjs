import { defineConfig } from 'eslint/config';
import { nodeConfig } from '@n8n/eslint-config/node';

export default defineConfig({ ignores: ['dist/**'] }, nodeConfig, {
	files: ['src/__tests__/**'],
	rules: {
		// Workflow fixtures key connections by node name, e.g. "When clicking Execute"
		'@typescript-eslint/naming-convention': 'off',
	},
});
