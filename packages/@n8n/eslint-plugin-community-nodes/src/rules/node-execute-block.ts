import { AST_NODE_TYPES } from '@typescript-eslint/utils';

import { createRule, isFileType } from '../utils/index.js';

export const NodeExecuteBlockRule = createRule({
	name: 'node-execute-block',
	meta: {
		type: 'problem',
		docs: {
			description:
				'NodeOperationError constructor calls must include an `{ itemIndex }` option to associate the error with the failing item',
		},
		messages: {
			missingItemIndex:
				'NodeOperationError must include `{ itemIndex }` option to associate the error with the failing item',
		},
		schema: [],
	},
	defaultOptions: [],
	create(context) {
		if (!isFileType(context.filename, '.node.ts')) {
			return {};
		}

		return {
			NewExpression(node) {
				if (
					node.callee.type !== AST_NODE_TYPES.Identifier ||
					node.callee.name !== 'NodeOperationError'
				) {
					return;
				}

				const args = node.arguments;
				const lastArg = args.at(-1);

				const hasItemIndex =
					lastArg?.type === AST_NODE_TYPES.ObjectExpression &&
					lastArg.properties.some(
						(prop) =>
							prop.type === AST_NODE_TYPES.Property &&
							prop.key.type === AST_NODE_TYPES.Identifier &&
							prop.key.name === 'itemIndex',
					);

				if (!hasItemIndex) {
					context.report({ node, messageId: 'missingItemIndex' });
				}
			},
		};
	},
});
