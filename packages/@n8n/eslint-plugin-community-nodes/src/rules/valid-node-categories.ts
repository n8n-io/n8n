import { CODEX_AI_CATEGORY, CODEX_AI_SUBCATEGORIES, CODEX_NODE_CATEGORIES } from '@n8n/constants';
import { isRecord } from '@n8n/utils/is-record';
import type { TSESTree } from '@typescript-eslint/utils';
import { AST_NODE_TYPES } from '@typescript-eslint/utils';

import {
	createRule,
	findNodeDescriptionObject,
	findObjectProperty,
	findStaticProperty,
	getRuleDocsUrl,
	getStringLiteralValue,
	getTopLevelObjectInJson,
	isMainConnection,
	readJsonObject,
} from '../utils/index.js';

const ruleName = 'valid-node-categories';
const supportedValuesUrl = `${getRuleDocsUrl(ruleName)}#supported-values`;
const validCategories: ReadonlySet<string> = new Set(CODEX_NODE_CATEGORIES);
const validAiSubcategories: ReadonlySet<string> = new Set(Object.values(CODEX_AI_SUBCATEGORIES));
const rootNodes = CODEX_AI_SUBCATEGORIES.ROOT_NODES;

function isMainNode(description: TSESTree.ObjectExpression): boolean {
	const inputs = findStaticProperty(description, 'inputs')?.value;
	const outputs = findStaticProperty(description, 'outputs')?.value;
	if (
		inputs?.type !== AST_NODE_TYPES.ArrayExpression ||
		outputs?.type !== AST_NODE_TYPES.ArrayExpression
	) {
		return false;
	}

	const mainInputs = inputs.elements.map(isMainConnection);
	const mainOutputs = outputs.elements.map(isMainConnection);
	// The editor treats any non-main output as a sub-node output.
	return (
		!mainInputs.includes(null) &&
		mainOutputs.every((output) => output === true) &&
		(mainInputs.includes(true) || mainOutputs.includes(true))
	);
}

function needsRootNodes(aiSubcategories: unknown): boolean {
	return (
		Array.isArray(aiSubcategories) &&
		aiSubcategories.length > 0 &&
		!aiSubcategories.includes(rootNodes) &&
		aiSubcategories.every(
			(value: unknown) => typeof value === 'string' && validAiSubcategories.has(value),
		)
	);
}

export const ValidNodeCategoriesRule = createRule({
	name: ruleName,
	meta: {
		type: 'problem',
		docs: {
			description: 'Require supported community node codex categories and AI subcategories',
		},
		messages: {
			invalidCategories: '"categories" must be a non-empty array of community node categories.',
			invalidCategoryType: 'Each category must be a string from the community node category list.',
			invalidCategory: `"{{ category }}" is not a supported community node category. See ${supportedValuesUrl} for the allowed values.`,
			marketingCategory: '"Marketing" is not a supported category. Use "Marketing & Content".',
			invalidAiSubcategory: `"{{ subcategory }}" is not a supported AI subcategory. See ${supportedValuesUrl} for the allowed values.`,
			invalidAiSubcategoryType: 'Each AI subcategory must be a supported string value.',
			missingAiSubcategory: 'The "AI" category needs at least one "subcategories.AI" value.',
			unexpectedAiSubcategory: '"subcategories.AI" needs "AI" in "categories".',
			missingAiRootNodes: `Add "${rootNodes}" to "subcategories.AI" in {{ source }} to make this main node appear in regular Add node search.`,
		},
		schema: [],
	},
	defaultOptions: [],
	create(context) {
		const isJson = context.filename.endsWith('.node.json');
		if (!isJson && !/\.node\.[jt]s$/.test(context.filename)) return {};

		function checkCodex(codex: TSESTree.ObjectExpression, mainNode = false) {
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
					if (category?.type !== AST_NODE_TYPES.Literal || typeof category.value !== 'string') {
						context.report({
							node: category ?? categories.value,
							messageId: 'invalidCategoryType',
						});
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
				if (subcategory?.type !== AST_NODE_TYPES.Literal || typeof subcategory.value !== 'string') {
					context.report({
						node: subcategory ?? aiSubcategories.value,
						messageId: 'invalidAiSubcategoryType',
					});
				} else if (!validAiSubcategories.has(subcategory.value)) {
					context.report({
						node: subcategory,
						messageId: 'invalidAiSubcategory',
						data: { subcategory: subcategory.value },
					});
				}
			}

			if (mainNode && needsRootNodes(aiSubcategories.value.elements.map(getStringLiteralValue))) {
				context.report({
					node: aiSubcategories.value,
					messageId: 'missingAiRootNodes',
					data: { source: '"description.codex"' },
				});
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
				const codex = findStaticProperty(description, 'codex');
				if (codex === undefined) return;
				if (codex) {
					if (codex.value.type === AST_NODE_TYPES.ObjectExpression) {
						checkCodex(codex.value, isMainNode(description));
					}
					return;
				}

				if (!isMainNode(description)) return;
				const codexPath = context.physicalFilename.replace(/\.node\.[jt]s$/, '.node.json');
				if (codexPath === context.physicalFilename) return;
				const siblingCodex = readJsonObject(codexPath);
				if (
					Array.isArray(siblingCodex?.categories) &&
					siblingCodex.categories.includes(CODEX_AI_CATEGORY) &&
					isRecord(siblingCodex.subcategories) &&
					needsRootNodes(siblingCodex.subcategories[CODEX_AI_CATEGORY])
				) {
					context.report({
						node: description,
						messageId: 'missingAiRootNodes',
						data: { source: 'the sibling ".node.json" file' },
					});
				}
			},
		};
	},
});
