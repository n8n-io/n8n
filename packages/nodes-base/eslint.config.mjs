import { defineConfig, globalIgnores } from 'eslint/config';
import { nodesConfig } from '@n8n/eslint-config/nodes';
import { n8nCommunityNodesPlugin } from '@n8n/eslint-plugin-community-nodes';

import { databricksUserAgentRestriction } from './nodes/Databricks/eslint-user-agent-restriction.mjs';
import { kafkaImportRestrictions } from './nodes/Kafka/eslint-import-restrictions.mjs';

export default defineConfig(
	nodesConfig,
	// This config fragment lives under nodes/ so it sits next to the code it
	// governs, but it's not lintable TS source — same reason eslint.config.mjs
	// itself is never linted.
	globalIgnores([
		'scenarios/**',
		'scripts/**',
		'./nodes/Databricks/eslint-user-agent-restriction.mjs',
		'./nodes/Kafka/eslint-import-restrictions.mjs',
	]),
	{
		plugins: {
			'@n8n/community-nodes': n8nCommunityNodesPlugin,
		},

		rules: {
			'@n8n/community-nodes/credential-documentation-url': ['error', { allowSlugs: true }],

			'no-ex-assign': 'warn',
			'no-control-regex': 'warn',
			'no-constant-condition': 'warn',
			'no-dupe-else-if': 'warn',
			'no-fallthrough': 'warn',

			'import-x/export': 'warn',
			'import-x/no-extraneous-dependencies': 'warn',

			'@n8n/community-nodes/no-builder-hint-leakage': 'error',

			'@typescript-eslint/ban-ts-comment': 'off',
			'@typescript-eslint/no-unused-expressions': ['error', { allowTernary: true }],
			'@typescript-eslint/prefer-promise-reject-errors': 'warn',
		},
	},
	...databricksUserAgentRestriction,
	...kafkaImportRestrictions,
);
