import { defineConfig } from 'eslint/config';
import { nodeConfig } from '@n8n/eslint-config/node';

export default defineConfig(nodeConfig, {
	rules: {
		// Low-level CRDT package — no dependency on n8n-workflow where error classes live.
		// Kept as warn (not off) so violations are visible and can be addressed incrementally.
		'n8n-local-rules/no-plain-errors': 'warn',
	},
});
