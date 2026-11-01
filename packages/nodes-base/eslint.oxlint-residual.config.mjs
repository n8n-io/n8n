import { defineConfig, globalIgnores } from 'eslint/config';
import { nodesConfig } from '@n8n/eslint-config/nodes';

import { databricksUserAgentRestriction } from './nodes/Databricks/eslint-user-agent-restriction.mjs';
import { kafkaImportRestrictions } from './nodes/Kafka/eslint-import-restrictions.mjs';

const disabledNodesConfig = nodesConfig.map((config) => ({
	...config,
	rules: Object.fromEntries(Object.keys(config.rules ?? {}).map((rule) => [rule, 'off'])),
}));

export default defineConfig(
	disabledNodesConfig,
	globalIgnores([
		'scenarios/**',
		'scripts/**',
		'nodes/Databricks/eslint-user-agent-restriction.mjs',
		'nodes/Kafka/eslint-import-restrictions.mjs',
	]),
	{
		files: ['nodes/**/*.ts', 'credentials/**/*.ts', 'utils/**/*.ts', 'test/**/*.ts'],
		languageOptions: { parserOptions: { projectService: false } },
		rules: {
			'import-x/no-duplicates': 'error',
			'no-self-assign': 'error',
			'no-unsafe-optional-chaining': 'error',
		},
	},
	{
		files: ['nodes/**/*.ts'],
		rules: { 'n8n-nodes-base/node-filename-against-convention': 'error' },
	},
	{
		files: ['**/*.test.ts', '**/test/**/*.ts', '**/__test__/**/*.ts', '**/__tests__/**/*.ts'],
		rules: { 'n8n-nodes-base/node-filename-against-convention': 'off' },
	},
	...databricksUserAgentRestriction,
	...kafkaImportRestrictions,
);
