import { defineConfig } from 'eslint/config';
import { frontendConfig } from '@n8n/eslint-config/frontend';
import oxlint from 'eslint-plugin-oxlint';

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
						"MemberExpression[property.name=/^(name|nodes|connections|active|isArchived|settings|tags|pinData|meta|versionId|activeVersionId|createdAt|updatedAt|parentFolder|scopes|usedCredentials|homeProject|description|versionData)$/][object.property.name='workflow'][object.object.name='workflowsStore']",
					message:
						'Use the equivalent workflowDocumentStore accessor instead of workflowsStore.workflow.<property>',
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
				{
					selector: "MemberExpression[property.name='workflowId'][object.name='workflowsStore']",
					message:
						'Use the workflow document store instead of workflowsStore.workflowId: workflowDocumentStore.workflowId (components/composables via injectWorkflowDocumentStore(); stores via useWorkflowId()) or the documentId from the handler options in push handlers',
				},
				{
					selector:
						"CallExpression[callee.property.name='setWorkflowId'][callee.object.name='workflowsStore']",
					message:
						'Do not call workflowsStore.setWorkflowId() — the current workflow id is derived from the route (useWorkflowId())',
				},
				// Guard: the legacy execution bridge on workflowsStore resolves by the
				// global workflow id, which silently reads the wrong instance inside
				// scoped hosts (execution preview, embedded editors). Read through
				// injectWorkflowExecutionStateStore() (or the documentId-keyed
				// useWorkflowExecutionStateStore) instead.
				{
					selector:
						"MemberExpression[property.name='getWorkflowExecution'][object.name='workflowsStore']",
					message:
						'Use injectWorkflowExecutionStateStore().value.activeExecution instead of workflowsStore.getWorkflowExecution — the bridge resolves by global workflow id and reads the wrong instance inside scoped hosts',
				},
				{
					selector:
						"MemberExpression[property.name='workflowExecutionData'][object.name='workflowsStore']",
					message:
						'Use injectWorkflowExecutionStateStore().value.activeExecution instead of workflowsStore.workflowExecutionData — the bridge resolves by global workflow id and reads the wrong instance inside scoped hosts',
				},
				{
					selector:
						"MemberExpression[property.name='getWorkflowRunData'][object.name='workflowsStore']",
					message:
						'Use injectWorkflowExecutionStateStore().value.activeExecutionRunData instead of workflowsStore.getWorkflowRunData',
				},
				{
					selector: "MemberExpression[property.name='executedNode'][object.name='workflowsStore']",
					message:
						'Use injectWorkflowExecutionStateStore().value.activeExecutionExecutedNode instead of workflowsStore.executedNode',
				},
				{
					selector:
						"MemberExpression[property.name='workflowExecutionStartedData'][object.name='workflowsStore']",
					message:
						'Use injectWorkflowExecutionStateStore().value.activeExecutionStartedData instead of workflowsStore.workflowExecutionStartedData',
				},
				{
					selector:
						"MemberExpression[property.name='workflowExecutionResultDataLastUpdate'][object.name='workflowsStore']",
					message:
						'Use injectWorkflowExecutionStateStore().value.activeExecutionResultDataLastUpdate instead of workflowsStore.workflowExecutionResultDataLastUpdate',
				},
				{
					selector:
						"MemberExpression[property.name='workflowExecutionPairedItemMappings'][object.name='workflowsStore']",
					message:
						'Use injectWorkflowExecutionStateStore().value.activeExecutionPairedItemMappings instead of workflowsStore.workflowExecutionPairedItemMappings',
				},
				{
					selector:
						"MemberExpression[property.name='lastSuccessfulExecution'][object.name='workflowsStore']",
					message:
						'Use injectWorkflowExecutionStateStore().value.lastSuccessfulExecution instead of workflowsStore.lastSuccessfulExecution',
				},
				{
					selector:
						"MemberExpression[property.name='getWorkflowResultDataByNodeName'][object.name='workflowsStore']",
					message:
						'Use injectWorkflowExecutionStateStore().value.getActiveExecutionRunDataByNodeName() instead of workflowsStore.getWorkflowResultDataByNodeName()',
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
	{
		// Mirrors the `*.stories.ts` exclusion in tsconfig.json — typescript-eslint
		// can't parse files outside the TS project.
		ignores: ['src/**/*.stories.ts'],
	},
	...oxlint.buildFromOxlintConfigFile('./.oxlintrc.json'),
);
