import { backendConfig } from '@n8n/oxlint-config/backend';
import { defineConfig } from 'oxlint';

export default defineConfig({
	extends: [backendConfig],
	options: { typeAware: true },
	jsPlugins: [
		{
			name: '@n8n/community-nodes',
			specifier: '@n8n/eslint-plugin-community-nodes',
		},
	],
	ignorePatterns: ['test-fixtures/**', 'scripts/**'],
	rules: {
		'@n8n/community-nodes/no-builder-hint-leakage': 'error',
	},
	overrides: [
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
			files: ['src/prompts/node-guidance/parameter-guides/**/*.ts'],
			rules: {
				'@n8n/community-nodes/no-builder-hint-leakage': 'off',
			},
		},
	],
});
