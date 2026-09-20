import { AST_NODE_TYPES } from '@typescript-eslint/utils';

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

		return {
			ObjectExpression(node) {
				const root = getTopLevelObjectInJson(node);
				if (!root) return;

				const categories = findJsonProperty(root, 'categories');
				if (categories?.value.type !== AST_NODE_TYPES.ArrayExpression) return;

				for (const category of categories.value.elements) {
					if (
						category?.type === AST_NODE_TYPES.Literal &&
						typeof category.value === 'string' &&
						FORBIDDEN_CATEGORIES.has(category.value)
					) {
						context.report({ node: category, messageId: 'logicOrFlowNode' });
					}
				}
			},
		};
	},
});
