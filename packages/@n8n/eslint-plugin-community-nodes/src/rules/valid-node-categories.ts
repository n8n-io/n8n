import type { TSESTree } from '@typescript-eslint/utils';
import { AST_NODE_TYPES } from '@typescript-eslint/utils';

import {
	createRule,
	findNodeDescriptionObject,
	findObjectProperty,
	getTopLevelObjectInJson,
	isNodeTypeClass,
} from '../utils/index.js';

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
	'AI',
]);

// Keep these values in sync with the AI_CATEGORY_* constants in editor-ui/src/app/constants/nodeCreator.ts.
const validAiSubcategories = new Set([
	'Agents',
	'Chains',
	'Language Models',
	'Memory',
	'Output Parsers',
	'Tools',
	'Vector Stores',
	'Retrievers',
	'Embeddings',
	'Document Loaders',
	'Text Splitters',
	'Other Tools',
	'Root Nodes',
	'Model Context Protocol',
	'Human in the Loop',
	'Miscellaneous',
	'Rerankers',
	'Evaluation',
]);

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
			missingAiSubcategories: 'The "AI" category requires a non-empty subcategories.AI array.',
			missingAiCategory: 'subcategories.AI requires "AI" in categories.',
			invalidSubcategories: 'subcategories must be an object with an AI category.',
			invalidAiSubcategoryType: 'Each AI subcategory must be a supported string value.',
			invalidAiSubcategory: '"{{ subcategory }}" is not a supported AI subcategory.',
		},
		schema: [],
	},
	defaultOptions: [],
	create(context) {
		if (!context.filename.endsWith('.node.json') && !context.filename.endsWith('.node.ts')) {
			return {};
		}

		function checkCodex(codex: TSESTree.ObjectExpression) {
			const categories = findObjectProperty(codex, 'categories');
			const subcategories = findObjectProperty(codex, 'subcategories');
			if (!categories && !subcategories) return;

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
					} else if (category.value === 'AI') {
						hasAiCategory = true;
					} else if (!validCategories.has(category.value)) {
						context.report({
							node: category,
							messageId: 'invalidCategory',
							data: { category: category.value },
						});
					}
				}
			}

			if (subcategories && subcategories.value.type !== AST_NODE_TYPES.ObjectExpression) {
				context.report({ node: subcategories.value, messageId: 'invalidSubcategories' });
				return;
			}

			const aiSubcategories =
				subcategories?.value.type === AST_NODE_TYPES.ObjectExpression
					? findObjectProperty(subcategories.value, 'AI')
					: null;
			if (hasAiCategory && !aiSubcategories) {
				context.report({ node: categories ?? codex, messageId: 'missingAiSubcategories' });
			}
			if (aiSubcategories && !hasAiCategory) {
				context.report({ node: aiSubcategories, messageId: 'missingAiCategory' });
			}
			if (subcategories && !hasAiCategory && !aiSubcategories) {
				context.report({ node: subcategories, messageId: 'invalidSubcategories' });
			}
			if (!aiSubcategories) return;

			if (
				aiSubcategories.value.type !== AST_NODE_TYPES.ArrayExpression ||
				aiSubcategories.value.elements.length === 0
			) {
				context.report({ node: aiSubcategories.value, messageId: 'missingAiSubcategories' });
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

		if (context.filename.endsWith('.node.json')) {
			return {
				ObjectExpression(node: TSESTree.ObjectExpression) {
					const root = getTopLevelObjectInJson(node);
					if (root) checkCodex(root);
				},
			};
		}

		return {
			ClassDeclaration(node) {
				if (!isNodeTypeClass(node)) return;
				const description = findNodeDescriptionObject(node);
				if (!description) return;
				const codex = findObjectProperty(description, 'codex');
				if (codex?.value.type === AST_NODE_TYPES.ObjectExpression) checkCodex(codex.value);
			},
		};
	},
});
