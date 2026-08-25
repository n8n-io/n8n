import { ESLintUtils } from '@typescript-eslint/utils';

export const NoArgumentSpreadRule = ESLintUtils.RuleCreator.withoutDocs({
	meta: {
		type: 'problem',
		docs: {
			description:
				'Avoid spreading potentially large arrays in function or constructor calls — can cause stack overflows.',
		},
		messages: {
			noUnboundedSpread:
				"Avoid spreading an array in a function or constructor call unless it's known to be small. Note that `.apply` / `Reflect.construct` do not avoid this problem — they hit the same engine argument-count limit. If the input can be large, use a loop, `[].concat()`, or chunking instead.",
		},
		schema: [],
	},
	defaultOptions: [],
	create(context) {
		return {
			CallExpression(node) {
				for (const arg of node.arguments) {
					if (arg.type !== 'SpreadElement') continue;

					const spreadArg = arg.argument;

					// Allow spread of inline arrays
					if (spreadArg.type === 'ArrayExpression') return;

					context.report({
						node,
						messageId: 'noUnboundedSpread',
					});
				}
			},

			NewExpression(node) {
				for (const arg of node.arguments || []) {
					if (arg.type !== 'SpreadElement') continue;

					const spreadArg = arg.argument;

					if (spreadArg.type === 'ArrayExpression') return;

					context.report({
						node,
						messageId: 'noUnboundedSpread',
					});
				}
			},
		};
	},
});
