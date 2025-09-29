import { ESLintUtils, TSESTree } from '@typescript-eslint/utils';

export const NoPlainErrorsRule = ESLintUtils.RuleCreator.withoutDocs({
	meta: {
		type: 'problem',
		docs: {
			description:
				'Only `ApplicationError` (from the `workflow` package) or its child classes must be thrown. This ensures the error will be normalized when reported to Sentry, if applicable.',
		},
		messages: {
			useApplicationError:
				'Throw an `ApplicationError` (from the `workflow` package) or its child classes.',
		},
		fixable: 'code',
		schema: [],
	},
	defaultOptions: [],
	create(context) {
		return {
			ThrowStatement(node) {
				if (!node.argument) return;

				const isNewError =
					node.argument.type === TSESTree.AST_NODE_TYPES.NewExpression &&
					node.argument.callee.type === TSESTree.AST_NODE_TYPES.Identifier &&
					node.argument.callee.name === 'Error';

				const isNewlessError =
					node.argument.type === TSESTree.AST_NODE_TYPES.CallExpression &&
					node.argument.callee.type === TSESTree.AST_NODE_TYPES.Identifier &&
					node.argument.callee.name === 'Error';

				if (isNewError || isNewlessError) {
					return context.report({
						messageId: 'useApplicationError',
						node,
						fix: (fixer) =>
							fixer.replaceText(
								node,
								`throw new ApplicationError(${(node.argument as TSESTree.CallExpression).arguments
									.map((arg) => context.sourceCode.getText(arg))
									.join(', ')})`,
							),
					});
				}
			},
		};
	},
});
