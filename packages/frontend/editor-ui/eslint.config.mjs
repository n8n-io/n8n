import { defineConfig } from 'eslint/config';
import { frontendConfig } from '@n8n/eslint-config/frontend';

export default defineConfig(
	frontendConfig,
	{
		rules: {
			// Guard: prevent direct node access on workflowsStore — use workflowDocumentStore instead.
			// Level: 'warn' during migration. Flip to 'error' when migration is complete.
			'no-restricted-syntax': [
				'warn',
				{
					selector: "MemberExpression[property.name='allNodes'][object.name='workflowsStore']",
					message: 'Use workflowDocumentStore.allNodes instead of workflowsStore.allNodes',
				},
				{
					selector:
						"CallExpression[callee.property.name='getNodeById'][callee.object.name='workflowsStore']",
					message:
						'Use workflowDocumentStore.getNodeById() instead of workflowsStore.getNodeById()',
				},
				{
					selector:
						"CallExpression[callee.property.name='getNodeByName'][callee.object.name='workflowsStore']",
					message:
						'Use workflowDocumentStore.getNodeByName() instead of workflowsStore.getNodeByName()',
				},
				{
					selector:
						"CallExpression[callee.property.name='getNodes'][callee.object.name='workflowsStore']",
					message: 'Use workflowDocumentStore.getNodes() instead of workflowsStore.getNodes()',
				},
				{
					selector:
						"CallExpression[callee.property.name='getNodesByIds'][callee.object.name='workflowsStore']",
					message:
						'Use workflowDocumentStore.getNodesByIds() instead of workflowsStore.getNodesByIds()',
				},
				{
					selector: "MemberExpression[property.name='nodesByName'][object.name='workflowsStore']",
					message: 'Use workflowDocumentStore.nodesByName instead of workflowsStore.nodesByName',
				},
				{
					selector:
						"CallExpression[callee.property.name='addNode'][callee.object.name='workflowsStore']",
					message: 'Use workflowDocumentStore.addNode() instead of workflowsStore.addNode()',
				},
				{
					selector:
						"CallExpression[callee.property.name='removeNode'][callee.object.name='workflowsStore']",
					message: 'Use workflowDocumentStore.removeNode() instead of workflowsStore.removeNode()',
				},
				{
					selector:
						"CallExpression[callee.property.name='removeNodeById'][callee.object.name='workflowsStore']",
					message:
						'Use workflowDocumentStore.removeNodeById() instead of workflowsStore.removeNodeById()',
				},
				{
					selector:
						"CallExpression[callee.property.name='setNodes'][callee.object.name='workflowsStore']",
					message: 'Use workflowDocumentStore.setNodes() instead of workflowsStore.setNodes()',
				},
				{
					selector:
						"MemberExpression[property.name='nodes'][object.property.name='workflow'][object.object.name='workflowsStore']",
					message:
						'Use workflowDocumentStore node accessors instead of workflowsStore.workflow.nodes',
				},
				{
					selector:
						"CallExpression[callee.property.name='setNodeParameters'][callee.object.name='workflowsStore']",
					message:
						'Use workflowDocumentStore.setNodeParameters() instead of workflowsStore.setNodeParameters()',
				},
				{
					selector:
						"CallExpression[callee.property.name='setNodeValue'][callee.object.name='workflowsStore']",
					message:
						'Use workflowDocumentStore.setNodeValue() instead of workflowsStore.setNodeValue()',
				},
				{
					selector:
						"CallExpression[callee.property.name='setNodePositionById'][callee.object.name='workflowsStore']",
					message:
						'Use workflowDocumentStore.setNodePositionById() instead of workflowsStore.setNodePositionById()',
				},
				{
					selector:
						"CallExpression[callee.property.name='updateNodeById'][callee.object.name='workflowsStore']",
					message:
						'Use workflowDocumentStore.updateNodeById() instead of workflowsStore.updateNodeById()',
				},
				{
					selector:
						"CallExpression[callee.property.name='updateNodeProperties'][callee.object.name='workflowsStore']",
					message:
						'Use workflowDocumentStore.updateNodeProperties() instead of workflowsStore.updateNodeProperties()',
				},
				{
					selector:
						"CallExpression[callee.property.name='setNodeIssue'][callee.object.name='workflowsStore']",
					message:
						'Use workflowDocumentStore.setNodeIssue() instead of workflowsStore.setNodeIssue()',
				},
				{
					selector:
						"CallExpression[callee.property.name='resetAllNodesIssues'][callee.object.name='workflowsStore']",
					message:
						'Use workflowDocumentStore.resetAllNodesIssues() instead of workflowsStore.resetAllNodesIssues()',
				},
				{
					selector:
						"CallExpression[callee.property.name='setLastNodeParameters'][callee.object.name='workflowsStore']",
					message:
						'Use workflowDocumentStore.setLastNodeParameters() instead of workflowsStore.setLastNodeParameters()',
				},
				// Guard: prevent direct workflowObject access — use workflowDocumentStore graph/expression methods.
				{
					selector:
						"MemberExpression[property.name='workflowObject'][object.name='workflowsStore']",
					message:
						'Use workflowDocumentStore graph/expression methods instead of workflowsStore.workflowObject',
				},
				// Guard: prevent per-node mutations via deprecated workflowState composable.
				{
					selector:
						"CallExpression[callee.property.name='setNodeParameters'][callee.object.name='workflowState']",
					message:
						'Use workflowDocumentStore.setNodeParameters() instead of workflowState.setNodeParameters()',
				},
				{
					selector:
						"CallExpression[callee.property.name='setNodeValue'][callee.object.name='workflowState']",
					message:
						'Use workflowDocumentStore.setNodeValue() instead of workflowState.setNodeValue()',
				},
				{
					selector:
						"CallExpression[callee.property.name='setNodePositionById'][callee.object.name='workflowState']",
					message:
						'Use workflowDocumentStore.setNodePositionById() instead of workflowState.setNodePositionById()',
				},
				{
					selector:
						"CallExpression[callee.property.name='updateNodeById'][callee.object.name='workflowState']",
					message:
						'Use workflowDocumentStore.updateNodeById() instead of workflowState.updateNodeById()',
				},
				{
					selector:
						"CallExpression[callee.property.name='updateNodeProperties'][callee.object.name='workflowState']",
					message:
						'Use workflowDocumentStore.updateNodeProperties() instead of workflowState.updateNodeProperties()',
				},
				{
					selector:
						"CallExpression[callee.property.name='setNodeIssue'][callee.object.name='workflowState']",
					message:
						'Use workflowDocumentStore.setNodeIssue() instead of workflowState.setNodeIssue()',
				},
				{
					selector:
						"CallExpression[callee.property.name='resetAllNodesIssues'][callee.object.name='workflowState']",
					message:
						'Use workflowDocumentStore.resetAllNodesIssues() instead of workflowState.resetAllNodesIssues()',
				},
				{
					selector:
						"CallExpression[callee.property.name='setLastNodeParameters'][callee.object.name='workflowState']",
					message:
						'Use workflowDocumentStore.setLastNodeParameters() instead of workflowState.setLastNodeParameters()',
				},
				{
					selector:
						"CallExpression[callee.property.name='resetParametersLastUpdatedAt'][callee.object.name='workflowState']",
					message:
						'Use workflowDocumentStore.resetParametersLastUpdatedAt() instead of workflowState.resetParametersLastUpdatedAt()',
				},
				{
					selector:
						"CallExpression[callee.property.name='removeAllNodes'][callee.object.name='workflowState']",
					message:
						'Use workflowDocumentStore.removeAllNodes() instead of workflowState.removeAllNodes()',
				},
				{
					selector:
						"CallExpression[callee.property.name='updateNodeAtIndex'][callee.object.name='workflowState']",
					message:
						'Use per-node mutation methods on workflowDocumentStore instead of workflowState.updateNodeAtIndex()',
				},
			],
			// TODO: Remove these
			'n8n-local-rules/no-internal-package-import': 'warn',
			'@typescript-eslint/ban-ts-comment': ['warn', { 'ts-ignore': true }],
			'id-denylist': 'warn',
			'no-case-declarations': 'warn',
			'no-useless-escape': 'warn',
			'no-prototype-builtins': 'warn',
			'no-empty': 'warn',
			'no-fallthrough': 'warn',
			'no-extra-boolean-cast': 'warn',
			'no-sparse-arrays': 'warn',
			'no-control-regex': 'warn',
			'import-x/extensions': 'warn',
			'import-x/no-default-export': 'warn',
			'import-x/order': 'off',
			'import-x/no-cycle': 'warn',
			'import-x/no-duplicates': 'warn',
			'no-unsafe-optional-chaining': 'warn',
			'@typescript-eslint/no-restricted-types': 'warn',
			'@typescript-eslint/dot-notation': 'warn',
			'@stylistic/lines-between-class-members': 'warn',
			'@stylistic/member-delimiter-style': 'warn',
			'@typescript-eslint/naming-convention': 'off',
			'@typescript-eslint/no-empty-interface': 'warn',
			'@typescript-eslint/no-for-in-array': 'warn',
			'@typescript-eslint/no-loop-func': 'warn',
			'@typescript-eslint/no-non-null-assertion': 'warn',
			'@typescript-eslint/no-shadow': 'warn',
			'@typescript-eslint/no-this-alias': 'warn',
			'@typescript-eslint/no-unnecessary-boolean-literal-compare': 'warn',
			'@typescript-eslint/no-unnecessary-type-assertion': 'warn',
			'@typescript-eslint/no-unused-expressions': 'warn',
			'@typescript-eslint/no-unused-vars': 'warn',
			'@typescript-eslint/no-var-requires': 'warn',
			'@typescript-eslint/prefer-nullish-coalescing': 'warn',
			'@typescript-eslint/prefer-optional-chain': 'warn',
			'@typescript-eslint/restrict-plus-operands': 'warn',
			'@typescript-eslint/no-redundant-type-constituents': 'warn',
			'@typescript-eslint/no-unsafe-enum-comparison': 'warn',
			'@typescript-eslint/require-await': 'warn',
			'@typescript-eslint/prefer-promise-reject-errors': 'warn',
			'@typescript-eslint/no-base-to-string': 'warn',
			'@typescript-eslint/no-empty-object-type': 'warn',
			'@typescript-eslint/no-unsafe-function-type': 'warn',
			'vue/attribute-hyphenation': 'warn',
			'@typescript-eslint/no-unsafe-assignment': 'warn',
			'@typescript-eslint/unbound-method': 'warn',
			'@typescript-eslint/restrict-template-expressions': 'warn',
			'@typescript-eslint/no-unsafe-call': 'warn',
			'@typescript-eslint/no-unsafe-argument': 'warn',
			'@typescript-eslint/no-unsafe-member-access': 'warn',
			'@typescript-eslint/no-unsafe-return': 'warn',
		},
	},
	{
		// The workflowDocument facades and workflows.store are the canonical delegation layer —
		// they are allowed to access workflowsStore node methods directly.
		files: ['src/app/stores/workflowDocument/**', 'src/app/stores/workflows.store.ts'],
		ignores: ['src/app/stores/workflowDocument/*.test.ts'],
		rules: {
			'no-restricted-syntax': 'off',
		},
	},
);
