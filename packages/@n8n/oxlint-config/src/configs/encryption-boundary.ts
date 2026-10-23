import { defineConfig } from 'oxlint';

export const encryptionBoundaryConfig = defineConfig({
	rules: {
		'n8n-local-rules/no-encryption-guardrail-disable': 'error',
	},
});
