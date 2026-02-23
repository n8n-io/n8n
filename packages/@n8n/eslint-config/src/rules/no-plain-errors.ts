import { ESLintUtils, TSESTree } from '@typescript-eslint/utils';

export const NoPlainErrorsRule = ESLintUtils.RuleCreator.withoutDocs({
	meta: {
		type: 'problem',
		docs: {
			description:
				'Disallow throwing plain `Error` or deprecated `ApplicationError`. Use `UnexpectedError`, `OperationalError`, or `UserError` instead.',
		},
		messages: {
			useProperErrorClass:
				'Do not throw plain `Error`. Use `UnexpectedError`, `OperationalError`, or `UserError` instead. Import from the appropriate package. See AGENTS.md for guidance.',
			noApplicationError:
				'Do not throw `ApplicationError` directly — it is deprecated. Use `UnexpectedError`, `OperationalError`, or `UserError` instead. Import from the appropriate package. See AGENTS.md for guidance.',
		},
		schema: [],
	},
	defaultOptions: [],
	create(context) {
		return {
			ThrowStatement(node) {
				if (!node.argument) return;

				if (node.argument.type !== TSESTree.AST_NODE_TYPES.NewExpression) return;

				const { callee } = node.argument;
				if (callee.type !== TSESTree.AST_NODE_TYPES.Identifier) return;

				if (callee.name === 'Error') {
					return context.report({
						messageId: 'useProperErrorClass',
						node,
					});
				}

				if (callee.name === 'ApplicationError') {
					return context.report({
						messageId: 'noApplicationError',
						node,
					});
				}
			},
		};
	},
});
