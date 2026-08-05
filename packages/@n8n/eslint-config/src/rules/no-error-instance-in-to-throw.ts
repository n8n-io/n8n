import { ESLintUtils, TSESTree } from '@typescript-eslint/utils';

export const NoErrorInstanceInToThrowRule = ESLintUtils.RuleCreator.withoutDocs({
	meta: {
		type: 'problem',
		docs: {
			description:
				'Disallow passing error instances to `.toThrow()` and `.toThrowError`. Passing an instance makes the assertion ambiguous and flaky. Pass the error class and message string separately instead.',
		},
		messages: {
			noErrorInstance:
				"Do not pass an error instance to `.toThrow()` or `.toThrowError`. Use `.toThrow({{className}})` for type checking and `.toThrow('message')` for message matching.",
		},
		schema: [],
	},
	defaultOptions: [],
	create(context) {
		return {
			CallExpression(node) {
				// Match: expect(...).toThrow(new Foo(...))
				// Match: expect(...).rejects.toThrow(new Foo(...))
				// Match: expect(...).rejects.toThrowError(new Foo(...))
				if (
					node.callee.type !== TSESTree.AST_NODE_TYPES.MemberExpression ||
					node.callee.property.type !== TSESTree.AST_NODE_TYPES.Identifier ||
					(node.callee.property.name !== 'toThrow' && node.callee.property.name !== 'toThrowError')
				) {
					return;
				}

				// Must have exactly one argument that is a NewExpression
				if (
					node.arguments.length !== 1 ||
					node.arguments[0].type !== TSESTree.AST_NODE_TYPES.NewExpression
				) {
					return;
				}

				const newExpr = node.arguments[0];
				const className =
					newExpr.callee.type === TSESTree.AST_NODE_TYPES.Identifier
						? newExpr.callee.name
						: 'ErrorClass';

				context.report({
					messageId: 'noErrorInstance',
					node: node.arguments[0],
					data: { className },
				});
			},
		};
	},
});
