import { defineConfig, globalIgnores } from 'eslint/config';
import { backendConfig } from '@n8n/eslint-config/backend';
import { n8nCommunityNodesPlugin } from '@n8n/eslint-plugin-community-nodes';

export default defineConfig(
	globalIgnores(['test-fixtures/**', 'scripts/**']),
	backendConfig,
	{
		plugins: {
			'@n8n/community-nodes': n8nCommunityNodesPlugin,
		},
		rules: {
			// Default scope (`builderHint`) won't fire here because workflow-sdk source has no
			// builderHint properties; the prompts override below switches on `scope: 'all'`.
			'@n8n/community-nodes/no-builder-hint-leakage': 'error',
		},
	},
	{
		files: [
			'src/codegen/execution-schema-jsdoc.ts',
			'src/lint/code-node/python.ts',
			'src/validation/node-parameter-schema/schema-validation-integration.test.ts',
		],
		rules: { 'id-denylist': 'off' },
	},
	{
		files: [
			'src/ast-interpreter/interpreter.test.ts',
			'src/ast-interpreter/interpreter.ts',
			'src/codegen/codegen-roundtrip.test.ts',
			'src/codegen/codegen.test.ts',
			'src/codegen/locate-node-declarations.test.ts',
			'src/codegen/parse-workflow-code.ts',
			'src/codegen/string-utils.test.ts',
			'src/codegen/string-utils.ts',
			'src/expression.test.ts',
			'src/lint/code-node/code-node.test.ts',
			'src/workflow-builder.test.ts',
		],
		rules: { 'n8n-local-rules/no-interpolation-in-regular-string': 'off' },
	},
	{
		files: ['src/prompts/**/*.ts'],
		rules: {
			'@n8n/community-nodes/no-builder-hint-leakage': ['error', { scope: 'all' }],
		},
	},
	{
		// Multi-agent parameter guides intentionally document wire-format parameters
		// (consumed by the legacy parameter-updater chain in ai-workflow-builder.ee,
		// not by the code-builder or instance-ai SDK paths).
		files: ['src/prompts/node-guidance/parameter-guides/**/*.ts'],
		rules: {
			'@n8n/community-nodes/no-builder-hint-leakage': 'off',
		},
	},
);
