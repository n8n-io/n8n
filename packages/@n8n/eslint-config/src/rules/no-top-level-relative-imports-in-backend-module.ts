import { ESLintUtils, TSESTree } from '@typescript-eslint/utils';

export const NoTopLevelRelativeImportsInBackendModuleRule = ESLintUtils.RuleCreator.withoutDocs({
	meta: {
		type: 'problem',
		docs: {
			description:
				'Relative imports in `.module.ts` files must be placed inside the `init` method. This ensures that module imports are loaded only when the module is used.',
		},
		messages: {
			placeInsideInit:
				"Place this relative import inside the `init` method, using `await import('./path')` syntax.",
		},
		schema: [],
	},
	defaultOptions: [],
	create(context) {
		return {
			'Program > ImportDeclaration'(node: TSESTree.ImportDeclaration) {
				if (node.source.value.startsWith('.')) {
					context.report({ node, messageId: 'placeInsideInit' });
				}
			},
		};
	},
});
