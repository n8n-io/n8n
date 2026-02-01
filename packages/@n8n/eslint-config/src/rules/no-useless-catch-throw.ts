import { ESLintUtils } from '@typescript-eslint/utils';

export const NoUselessCatchThrowRule = ESLintUtils.RuleCreator.withoutDocs({
	meta: {
		type: 'problem',
		docs: {
			description: 'Disallow `try-catch` blocks where the `catch` only contains a `throw error`.',
		},
		messages: {
			noUselessCatchThrow: 'Remove useless `catch` block.',
		},
		fixable: 'code',
		schema: [],
	},
	defaultOptions: [],
	create(context) {
		return {
			CatchClause(node) {
				if (
					node.body.body.length === 1 &&
					node.body.body[0].type === 'ThrowStatement' &&
					node.body.body[0].argument.type === 'Identifier' &&
					node.param?.type === 'Identifier' &&
					node.body.body[0].argument.name === node.param.name
				) {
					context.report({
						node,
						messageId: 'noUselessCatchThrow',
						fix(fixer) {
							const tryStatement = node.parent;
							const tryBlock = tryStatement.block;
							const sourceCode = context.sourceCode;
							const tryBlockText = sourceCode.getText(tryBlock);
							const tryBlockTextWithoutBraces = tryBlockText.slice(1, -1).trim();
							const indentedTryBlockText = tryBlockTextWithoutBraces
								.split('\n')
								.map((line) => line.replace(/\t/, ''))
								.join('\n');
							return fixer.replaceText(tryStatement, indentedTryBlockText);
						},
					});
				}
			},
		};
	},
});
