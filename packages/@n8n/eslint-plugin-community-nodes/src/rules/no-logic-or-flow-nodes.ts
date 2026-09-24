import { AST_NODE_TYPES, type TSESTree } from '@typescript-eslint/utils';

import { createRule, findJsonProperty, getTopLevelObjectInJson } from '../utils/index.js';

const FORBIDDEN_CATEGORIES = new Set(['Logic', 'Flow']);

export const NoLogicOrFlowNodesRule = createRule({
	name: 'no-logic-or-flow-nodes',
	meta: {
		type: 'problem',
		docs: {
			description: 'Reject Logic and Flow community nodes',
		},
		messages: {
			logicOrFlowNode: 'Logic and Flow nodes are not allowed',
		},
		schema: [],
	},
	defaultOptions: [],
	create(context) {
		if (!context.filename.endsWith('.node.json')) {
			return {};
		}

		const reportForbiddenCategories = (categories: TSESTree.ArrayExpression) => {
			for (const category of categories.elements) {
				if (
					category?.type === AST_NODE_TYPES.Literal &&
					typeof category.value === 'string' &&
					FORBIDDEN_CATEGORIES.has(category.value)
				) {
					context.report({ node: category, messageId: 'logicOrFlowNode' });
				}
			}
		};

		return {
			ObjectExpression(node) {
				const root = getTopLevelObjectInJson(node);
				if (!root) return;

				const categories = findJsonProperty(root, 'categories');
				if (categories?.value.type === AST_NODE_TYPES.ArrayExpression) {
					reportForbiddenCategories(categories.value);
				}

				const subcategories = findJsonProperty(root, 'subcategories');
				if (subcategories?.value.type !== AST_NODE_TYPES.ObjectExpression) return;

				for (const property of subcategories.value.properties) {
					if (
						property.type === AST_NODE_TYPES.Property &&
						property.value.type === AST_NODE_TYPES.ArrayExpression
					) {
						reportForbiddenCategories(property.value);
					}
				}
			},
		};
	},
});
