import { defineConfig } from 'eslint/config';
import { frontendConfig } from '@n8n/eslint-config/frontend';

export default defineConfig(frontendConfig, {
	rules: {
		// Guard: prevent direct node access on workflowsStore — use workflowDocumentStore instead.
		// Level: 'warn' during migration (baseline tracking). Flip to 'error' pre-PR 7.
		'no-restricted-syntax': [
			'warn',
			{
				selector:
					"MemberExpression[property.name='allNodes'][object.name='workflowsStore']",
				message:
					'Use workflowDocumentStore.allNodes instead of workflowsStore.allNodes',
			},
			{
				selector:
					"CallExpression[callee.property.name='getNodeById'][callee.object.name='workflowsStore']",
				message:
					'Use workflowDocumentStore.findNode() instead of workflowsStore.getNodeById()',
			},
			{
				selector:
					"CallExpression[callee.property.name='getNodeByName'][callee.object.name='workflowsStore']",
				message:
					'Use workflowDocumentStore.findNodeByName() instead of workflowsStore.getNodeByName()',
			},
			{
				selector:
					"CallExpression[callee.property.name='getNodes'][callee.object.name='workflowsStore']",
				message:
					'Use workflowDocumentStore.getNodes() instead of workflowsStore.getNodes()',
			},
			{
				selector:
					"CallExpression[callee.property.name='getNodesByIds'][callee.object.name='workflowsStore']",
				message:
					'Use workflowDocumentStore.getNodesByIds() instead of workflowsStore.getNodesByIds()',
			},
			{
				selector:
					"MemberExpression[property.name='nodesByName'][object.name='workflowsStore']",
				message:
					'Use workflowDocumentStore.findNodeByName() instead of workflowsStore.nodesByName',
			},
			{
				selector:
					"CallExpression[callee.property.name='addNode'][callee.object.name='workflowsStore']",
				message:
					'Use workflowDocumentStore.addNode() instead of workflowsStore.addNode()',
			},
			{
				selector:
					"CallExpression[callee.property.name='removeNode'][callee.object.name='workflowsStore']",
				message:
					'Use workflowDocumentStore.removeNode() instead of workflowsStore.removeNode()',
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
				message:
					'Use workflowDocumentStore.setNodes() instead of workflowsStore.setNodes()',
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
});
