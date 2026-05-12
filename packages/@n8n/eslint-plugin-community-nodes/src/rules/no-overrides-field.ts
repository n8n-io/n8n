import type { TSESTree } from '@typescript-eslint/utils';
import { AST_NODE_TYPES } from '@typescript-eslint/utils';

import { createRule, findJsonProperty } from '../utils/index.js';

export const NoOverridesFieldRule = createRule({
	name: 'no-overrides-field',
	meta: {
		type: 'problem',
		docs: {
			description: 'Ban the "overrides" field in community node package.json',
		},
		messages: {
			overridesForbidden:
				'The "overrides" field is not allowed in community node packages. Dependency overrides can introduce incompatible versions of shared libraries into the n8n runtime and cause conflicts with other nodes.',
		},
		schema: [],
	},
	defaultOptions: [],
	create(context) {
		if (!context.filename.endsWith('package.json')) {
			return {};
		}

		return {
			ObjectExpression(node: TSESTree.ObjectExpression) {
				if (node.parent?.type !== AST_NODE_TYPES.ExpressionStatement) {
					return;
				}

				const overridesProp = findJsonProperty(node, 'overrides');
				if (!overridesProp) {
					return;
				}

				context.report({
					node: overridesProp,
					messageId: 'overridesForbidden',
				});
			},
		};
	},
});
