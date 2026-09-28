import { defineConfig } from 'eslint/config';
import { nodesConfig } from '@n8n/eslint-config/nodes';
import { n8nCommunityNodesPlugin } from '@n8n/eslint-plugin-community-nodes';

export default defineConfig(nodesConfig, {
	plugins: {
		'@n8n/community-nodes': n8nCommunityNodesPlugin,
	},
	rules: {
		'@n8n/community-nodes/no-builder-hint-leakage': 'error',

		'@n8n/community-nodes/credential-documentation-url': ['error', { allowSlugs: true }],

		'@typescript-eslint/naming-convention': ['error', { selector: 'memberLike', format: null }],
		'@typescript-eslint/no-unused-expressions': ['error', { allowTernary: true }],
	},
});
