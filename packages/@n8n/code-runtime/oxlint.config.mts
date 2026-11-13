import { backendConfig } from '@n8n/oxlint-config/backend';
import { defineConfig } from 'oxlint';

export default defineConfig({
	extends: [backendConfig],
	options: { typeAware: true },
	rules: {
		// The runtime evaluates user code and exposes the native require on purpose.
		'no-eval': 'off',
		'typescript/no-require-imports': 'off',
	},
});
