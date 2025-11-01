import { ESLintUtils, TSESTree } from '@typescript-eslint/utils';

export const NoConstructorInBackendModuleRule = ESLintUtils.RuleCreator.withoutDocs({
	meta: {
		type: 'problem',
		docs: {
			description:
				'A class decorated with `@BackendModule` must not have a constructor. This ensures that module dependencies are loaded only when the module is used.',
		},
		messages: {
			noConstructorInBackendModule:
				'Remove the constructor from the class decorated with `@BackendModule`.',
		},
		fixable: 'code',
		schema: [],
	},
	defaultOptions: [],
	create(context) {
		return {
			'ClassDeclaration MethodDefinition[kind="constructor"]'(node: TSESTree.MethodDefinition) {
				const classDeclaration = node.parent?.parent as TSESTree.ClassDeclaration;

				const isBackendModule =
					classDeclaration.decorators?.some(
						(d) =>
							d.expression.type === 'CallExpression' &&
							d.expression.callee.type === 'Identifier' &&
							d.expression.callee.name === 'BackendModule',
					) ?? false;

				if (isBackendModule) {
					context.report({
						node,
						messageId: 'noConstructorInBackendModule',
						fix: (fixer) => fixer.remove(node),
					});
				}
			},
		};
	},
});
