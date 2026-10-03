import { CODEX_AI_CATEGORY, CODEX_AI_SUBCATEGORIES, CODEX_NODE_CATEGORIES } from '@n8n/constants';
import type { TSESTree } from '@typescript-eslint/utils';
import { AST_NODE_TYPES } from '@typescript-eslint/utils';

import {
	createRule,
	findNodeDescriptionObject,
	findObjectProperty,
	getTopLevelObjectInJson,
} from '../utils/index.js';

const validCategories: ReadonlySet<string> = new Set(CODEX_NODE_CATEGORIES);
const validAiSubcategories: ReadonlySet<string> = new Set(Object.values(CODEX_AI_SUBCATEGORIES));

export const ValidNodeCategoriesRule = createRule({
	name: 'valid-node-categories',
	meta: {
		type: 'problem',
		docs: {
			description: 'Require supported community node codex categories and AI subcategories',
		},
		messages: {
			invalidCategories: '"categories" must be a non-empty array of community node categories.',
			invalidCategoryType: 'Each category must be a string from the community node category list.',
			invalidCategory:
				'"{{ category }}" is not a supported community node category. See https://docs.n8n.io/connect/create-nodes/build-your-node/reference/codex-files/#node-categories for the allowed values.',
			marketingCategory: '"Marketing" is not a supported category. Use "Marketing & Content".',
			invalidAiSubcategory:
				'"{{ subcategory }}" is not a supported AI subcategory. Use a subcategory from the node creator.',
			invalidAiSubcategoryType: 'Each AI subcategory must be a supported string value.',
			missingAiSubcategory: 'The "AI" category needs at least one "subcategories.AI" value.',
			unexpectedAiSubcategory: '"subcategories.AI" needs "AI" in "categories".',
		},
		schema: [],
	},
	defaultOptions: [],
	create(context) {
		const isJson = context.filename.endsWith('.node.json');
		if (!isJson && !/\.node\.[jt]s$/.test(context.filename)) return {};

		function checkCodex(codex: TSESTree.ObjectExpression) {
			const categories = findObjectProperty(codex, 'categories');
			let hasAiCategory = false;

			if (categories) {
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
					} else if (category.value === CODEX_AI_CATEGORY) {
						hasAiCategory = true;
					}
				}
			}

			const subcategories = findObjectProperty(codex, 'subcategories');
			const aiSubcategories =
				subcategories?.value.type === AST_NODE_TYPES.ObjectExpression
					? findObjectProperty(subcategories.value, CODEX_AI_CATEGORY)
					: null;

			if (!hasAiCategory) {
				if (aiSubcategories) {
					context.report({ node: aiSubcategories, messageId: 'unexpectedAiSubcategory' });
				}
				return;
			}

			if (
				aiSubcategories?.value.type !== AST_NODE_TYPES.ArrayExpression ||
				aiSubcategories.value.elements.length === 0
			) {
				context.report({
					node: aiSubcategories ?? categories ?? codex,
					messageId: 'missingAiSubcategory',
				});
				return;
			}

			for (const subcategory of aiSubcategories.value.elements) {
				if (!subcategory) continue;
				if (subcategory.type !== AST_NODE_TYPES.Literal || typeof subcategory.value !== 'string') {
					context.report({ node: subcategory, messageId: 'invalidAiSubcategoryType' });
				} else if (!validAiSubcategories.has(subcategory.value)) {
					context.report({
						node: subcategory,
						messageId: 'invalidAiSubcategory',
						data: { subcategory: subcategory.value },
					});
				}
			}
		}

		return {
			ObjectExpression(node: TSESTree.ObjectExpression) {
				if (!isJson) return;
				const root = getTopLevelObjectInJson(node);
				if (!root) return;
				checkCodex(root);
			},
			ClassDeclaration(node: TSESTree.ClassDeclaration) {
				if (isJson) return;
				const description = findNodeDescriptionObject(node);
				if (!description) return;
				const codex = findObjectProperty(description, 'codex');
				if (codex?.value.type === AST_NODE_TYPES.ObjectExpression) checkCodex(codex.value);
			},
		};
	},
});
