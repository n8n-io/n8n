import { defineConfig } from 'eslint/config';
import { frontendConfig } from '@n8n/eslint-config/frontend';
import oxlint from 'eslint-plugin-oxlint';

/**
 * Extraction ratchet: a feature that has become a module package must not reappear
 * under `src/features/`. Append one entry per extraction — this list only grows.
 *
 * The old path no longer resolves, so this is about the message, not the failure: it
 * names the package and it says that the shell reaches a module through
 * `src/app/modules.manifest.ts`, not through a deep path.
 *
 * Spread into every block that sets `no-restricted-imports`. Flat-config replaces
 * rule options rather than merging them, so a scoped block that omits these patterns
 * would switch the ratchet off for its own files.
 */
const extractedFeatures = [
	{
		group: ['@/features/instanceRegistry', '@/features/instanceRegistry/*'],
		message:
			'instanceRegistry is the @n8n/frontend-module-instance-registry package. The shell registers a module through src/app/modules.manifest.ts.',
	},
	{
		group: ['@/features/settings/otel', '@/features/settings/otel/*'],
		message:
			'otel is the @n8n/frontend-module-otel package. The shell registers a module through src/app/modules.manifest.ts.',
	},
];

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
			'@typescript-eslint/no-restricted-imports': ['error', { patterns: extractedFeatures }],
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
		// This is half 1 of 2 of the modal-key ratchet (CAT-3688).
		// Change the level to 'error' when CAT-3973 is complete.
		// This file does not use workflowsStore. So this rule replaces the
		// package-wide list safely.
		files: ['src/app/constants/modals.ts'],
		rules: {
			'no-restricted-syntax': [
				'warn',
				{
					selector:
						'ExportNamedDeclaration > VariableDeclaration > VariableDeclarator[id.name!=/^MODAL_(CANCEL|CONFIRM|CLOSE)$/]',
					message:
						'Do not declare a modal key here. Declare the key in the constants file of the feature that owns it. Then register the modal from the modals.ts fragment of that feature. To see an example, open src/features/core/auth/modals.ts. If the shell owns the modal, declare its key next to its fragment in src/app/modals.manifest.ts. Only MODAL_CANCEL, MODAL_CONFIRM and MODAL_CLOSE stay here. These three are dialog result sentinels, not modal keys.',
				},
				{
					// This selector matches `export { X } from '...'` and also a bare
					// `export { X }` list.
					selector: 'ExportNamedDeclaration[specifiers.length>0]',
					message:
						'Do not re-export a modal key from the shell. A re-export makes @/app/constants an import path for a key that the shell does not own. The shell must not get such a key again. Import the key directly from its feature or from its package.',
				},
			],
		},
	},
	{
		// This is half 2 of 2 of the modal-key ratchet (CAT-3688).
		// The selector matches only the direct members, so you can still change the
		// nested state of each entry. `sneakyModal:` opens the same as `[KEY]:`.
		// So the selector `[computed=true]` was too narrow.
		files: ['src/app/stores/defaults/modals.ts'],
		rules: {
			'no-restricted-syntax': [
				'warn',
				{
					selector:
						"VariableDeclarator[id.name='SHELL_MODAL_INITIAL_STATE'] > CallExpression > ObjectExpression > :matches(Property, SpreadElement)",
					message:
						'Do not add an entry to SHELL_MODAL_INITIAL_STATE. This catalogue can only become smaller. Write a ModalDefinition for the modal in the modals.ts fragment of its feature. Give the definition a component and an initialState. Then modalRegistry registers the modal, and DynamicModalLoader shows it. In the same change, delete the <ModalRoot> of the modal from Modals.vue. To see an example, open src/features/core/auth/modals.ts.',
				},
			],
		},
	},
	{
		files: ['src/features/agents/**/*.ts', 'src/features/agents/**/*.vue'],
		rules: {
			'@typescript-eslint/no-restricted-imports': [
				'error',
				{
					patterns: [
						...extractedFeatures,
						{
							group: ['**/ndv/runData/components/RunData.vue'],
							message:
								'Use StandaloneRunData inside StandaloneRunDataHost so scoped providers and cleanup are owned consistently.',
						},
					],
				},
			],
		},
	},
	{
		files: [
			'src/**/*.test.ts',
			'src/**/test/**/*.ts',
			'src/**/__test__/**/*.ts',
			'src/**/__tests__/**/*.ts',
		],
		rules: {
			'n8n-local-rules/no-dynamic-regexp': 'off',
		},
	},
	{
		// Mirrors the `*.stories.ts` exclusion in tsconfig.json — typescript-eslint
		// can't parse files outside the TS project.
		ignores: ['src/**/*.stories.ts'],
	},
	{
		// CodeMirror/expression-editor autocomplete builders construct short
		// prefix-matching regexes from the user's current cursor token. The
		// patterns are dev-controlled templates wrapped around short keystroke
		// fragments and run only in the browser against trivially small input.
		files: [
			'src/features/shared/editors/components/CodeNodeEditor/**',
			'src/features/shared/editors/plugins/codemirror/completions/**',
			'src/features/settings/environments.ee/completions/**',
		],
		rules: {
			'n8n-local-rules/no-dynamic-regexp': 'off',
		},
	},
	{
		// The CodeMirror TypeScript language service runs in a browser web worker, so
		// Vite bundles `typescript` and `@typescript/vfs` into it and nothing resolves
		// them from node_modules at runtime. They stay devDependencies to keep the
		// ~24MB compiler out of the server image, which installs editor-ui's
		// production closure via packages/cli.
		files: ['src/features/shared/editors/plugins/codemirror/typescript/**'],
		rules: {
			'import-x/no-extraneous-dependencies': [
				'error',
				{ devDependencies: true, optionalDependencies: false },
			],
		},
	},
	...oxlint.buildFromOxlintConfigFile('./.oxlintrc.json'),
);
