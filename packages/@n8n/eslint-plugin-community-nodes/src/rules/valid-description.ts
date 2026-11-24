import type { TSESTree } from '@typescript-eslint/utils';
import { AST_NODE_TYPES } from '@typescript-eslint/utils';

import { createRule, findJsonProperty } from '../utils/index.js';

export const ValidDescriptionRule = createRule({
	name: 'valid-description',
	meta: {
		type: 'problem',
		docs: {
			description: 'Require a non-empty "description" field in community node package.json',
		},
		messages: {
			missingDescription:
				'The package.json must have a "description" field describing what the community node package does.',
			emptyDescription:
				'The "description" field must be a non-empty string. Replace the placeholder with a real description of your community node package.',
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

				const descriptionProp = findJsonProperty(node, 'description');

				if (!descriptionProp) {
					context.report({
						node,
						messageId: 'missingDescription',
					});
					return;
				}

				if (descriptionProp.value.type !== AST_NODE_TYPES.Literal) {
					return;
				}

				const value = descriptionProp.value.value;
				if (typeof value !== 'string' || value === '') {
					context.report({
						node: descriptionProp,
						messageId: 'emptyDescription',
					});
				}
			},
		};
	},
});
