import { ESLintUtils, TSESTree } from '@typescript-eslint/utils';

export const NoPlainErrorsRule = ESLintUtils.RuleCreator.withoutDocs({
	meta: {
		type: 'problem',
		docs: {
			description:
				'Only `UserError`, `OperationalError`, `UnexpectedError` (from the `n8n-workflow` package) or their child classes must be thrown. This ensures the error will be normalized when reported to Sentry, if applicable.',
		},
		messages: {
			useN8nError:
				'Throw a `UserError`, `OperationalError` or `UnexpectedError` (from the `n8n-workflow` package) or one of their child classes.',
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
						messageId: 'useN8nError',
						node,
						fix: (fixer) =>
							fixer.replaceText(
								node,
								`throw new UnexpectedError(${(node.argument as TSESTree.CallExpression).arguments
									.map((arg) => context.sourceCode.getText(arg))
									.join(', ')})`,
							),
					});
				}
			},
		};
	},
});
