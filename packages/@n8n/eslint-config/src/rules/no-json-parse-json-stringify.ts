import { isJsonParseCall, isJsonStringifyCall } from '../utils/json.js';
import { ESLintUtils, TSESTree } from '@typescript-eslint/utils';

export const NoJsonParseJsonStringifyRule = ESLintUtils.RuleCreator.withoutDocs({
	meta: {
		type: 'problem',
		docs: {
			description:
				'Calls to `JSON.parse(JSON.stringify(arg))` must be replaced with `deepCopy(arg)` from `n8n-workflow`.',
		},
		schema: [],
		messages: {
			noJsonParseJsonStringify: 'Replace with `deepCopy({{ argText }})`',
		},
		fixable: 'code',
	},
	defaultOptions: [],
	create(context) {
		return {
			CallExpression(node) {
				if (isJsonParseCall(node) && isJsonStringifyCall(node)) {
					const [callExpression] = node.arguments;

					if (callExpression.type !== TSESTree.AST_NODE_TYPES.CallExpression) {
						return;
					}

					const { arguments: args } = callExpression;

					if (!Array.isArray(args) || args.length !== 1) return;

					const [arg] = args;

					if (!arg) return;

					const argText = context.sourceCode.getText(arg);

					context.report({
						messageId: 'noJsonParseJsonStringify',
						node,
						data: { argText },
						fix: (fixer) => fixer.replaceText(node, `deepCopy(${argText})`),
					});
				}
			},
		};
	},
});
