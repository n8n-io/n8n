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
				'The "overrides" field is not allowed in community node packages. Each community package installs into an isolated dependency tree, so overrides do not affect other nodes or n8n core — in practice they are copy-pasted boilerplate with no useful effect. Use the helpers on the execute context (this.helpers.httpRequest, etc.) instead; most community nodes do not need third-party runtime libraries.',
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
