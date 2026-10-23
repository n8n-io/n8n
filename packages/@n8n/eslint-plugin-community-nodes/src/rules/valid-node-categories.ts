import type { TSESTree } from '@typescript-eslint/utils';
import { AST_NODE_TYPES } from '@typescript-eslint/utils';

import { createRule, findJsonProperty, getTopLevelObjectInJson } from '../utils/index.js';

const validCategories = new Set([
	'Data & Storage',
	'Finance & Accounting',
	'Marketing & Content',
	'Productivity',
	'Miscellaneous',
	'Sales',
	'Development',
	'Analytics',
	'Communication',
	'Utility',
]);

export const ValidNodeCategoriesRule = createRule({
	name: 'valid-node-categories',
	meta: {
		type: 'problem',
		docs: {
			description: 'Require supported community node categories in .node.json codex files',
		},
		messages: {
			invalidCategories: '"categories" must be a non-empty array of community node categories.',
			invalidCategoryType: 'Each category must be a string from the community node category list.',
			invalidCategory:
				'"{{ category }}" is not a supported community node category. See https://docs.n8n.io/connect/create-nodes/build-your-node/reference/codex-files/#node-categories for the allowed values.',
			marketingCategory: '"Marketing" is not a supported category. Use "Marketing & Content".',
		},
		schema: [],
	},
	defaultOptions: [],
	create(context) {
		if (!context.filename.endsWith('.node.json')) return {};

		return {
			ObjectExpression(node: TSESTree.ObjectExpression) {
				const root = getTopLevelObjectInJson(node);
				if (!root) return;

				const categories = findJsonProperty(root, 'categories');
				if (!categories) return;

				if (
					categories.value.type !== AST_NODE_TYPES.ArrayExpression ||
					categories.value.elements.length === 0
				) {
					context.report({ node: categories.value, messageId: 'invalidCategories' });
					return;
				}

				for (const category of categories.value.elements) {
					if (!category) continue;
					if (category.type !== AST_NODE_TYPES.Literal || typeof category.value !== 'string') {
						context.report({ node: category, messageId: 'invalidCategoryType' });
					} else if (category.value === 'Marketing') {
						context.report({ node: category, messageId: 'marketingCategory' });
					} else if (!validCategories.has(category.value)) {
						context.report({
							node: category,
							messageId: 'invalidCategory',
							data: { category: category.value },
						});
					}
				}
			},
		};
	},
});
