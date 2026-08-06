import { AST_NODE_TYPES, type TSESTree } from '@typescript-eslint/utils';
import type { ReportSuggestionArray } from '@typescript-eslint/utils/ts-eslint';

import {
	createRule,
	findArrayLiteralProperty,
	findClassProperty,
	findObjectProperty,
	findSimilarStrings,
	getStringLiteralValue,
	isNodeTypeClass,
	KNOWN_CODEX_CATEGORIES,
	KNOWN_CODEX_SUBCATEGORIES,
} from '../utils/index.js';

type MessageIds =
	| 'unknownCategory'
	| 'unknownSubcategoryKey'
	| 'unknownSubcategory'
	| 'invalidSubcategoriesShape'
	| 'aiCategoryWithoutRootNodes'
	| 'didYouMean';

/**
 * Returns whether `outputs` includes a `main` connection (the node can be
 * dropped into a workflow as a standalone step), `false` when it definitely
 * doesn't, or `null` when the shape can't be determined statically (e.g. a
 * computed/dynamic `outputs` expression) — callers should skip the check on
 * `null` rather than assume either answer.
 */
function includesMainOutput(outputsValue: TSESTree.Node | null): boolean | null {
	if (outputsValue?.type !== AST_NODE_TYPES.ArrayExpression) return null;

	return outputsValue.elements.some((element) => {
		if (!element) return false;
		if (getStringLiteralValue(element) === 'main') return true;
		return (
			element.type === AST_NODE_TYPES.MemberExpression &&
			element.object.type === AST_NODE_TYPES.Identifier &&
			element.object.name === 'NodeConnectionTypes' &&
			element.property.type === AST_NODE_TYPES.Identifier &&
			element.property.name === 'Main'
		);
	});
}

export const ValidCodexCategoriesRule = createRule({
	name: 'valid-codex-categories',
	meta: {
		type: 'problem',
		docs: {
			description:
				"Ensure codex categories and subcategories only use values from n8n's known taxonomy",
		},
		messages: {
			unknownCategory:
				'Codex category "{{ value }}" is not part of n8n\'s known category taxonomy. An unrecognized value can silently hide the node from the node panel search.',
			unknownSubcategoryKey:
				'"{{ value }}" is not a recognized category, so it cannot be used as a key in `codex.subcategories`.',
			unknownSubcategory:
				'Codex subcategory "{{ value }}" is not part of n8n\'s known subcategory taxonomy. An unrecognized value can silently hide the node from the node panel search.',
			invalidSubcategoriesShape:
				'`codex.subcategories` must map category names to arrays of subcategory strings (e.g. `{ "Core Nodes": ["Helpers"] }`), not a plain array.',
			aiCategoryWithoutRootNodes:
				'This node outputs "main" data (it can be used as a standalone step) but declares codex category "AI" without "Root Nodes" in `subcategories.AI`. The node panel only shows "AI"-categorized nodes in the main "Add node" search when they are marked as a Root Node — otherwise this node is silently hidden from search and only reachable via the AI browse view or as an attachable tool.',
			didYouMean: "Did you mean '{{ suggestedName }}'?",
		},
		schema: [],
		hasSuggestions: true,
	},
	defaultOptions: [],
	create(context) {
		function checkKnownStringValue(
			valueNode: TSESTree.Node,
			value: string,
			knownValues: Set<string>,
			messageId: 'unknownCategory' | 'unknownSubcategory',
		) {
			if (knownValues.has(value)) return;

			const similar = findSimilarStrings(value, knownValues);
			const suggestions: ReportSuggestionArray<MessageIds> = similar.map((suggestedName) => ({
				messageId: 'didYouMean' as const,
				data: { suggestedName },
				fix(fixer) {
					return fixer.replaceText(valueNode, `"${suggestedName}"`);
				},
			}));

			context.report({
				node: valueNode,
				messageId,
				data: { value },
				suggest: suggestions,
			});
		}

		function checkArrayOfKnownStrings(
			array: TSESTree.ArrayExpression,
			knownValues: Set<string>,
			messageId: 'unknownCategory' | 'unknownSubcategory',
		) {
			for (const element of array.elements) {
				if (!element) continue;
				const value = getStringLiteralValue(element);
				if (value === null) continue;
				checkKnownStringValue(element, value, knownValues, messageId);
			}
		}

		return {
			ClassDeclaration(node) {
				if (!isNodeTypeClass(node)) return;

				const descriptionProperty = findClassProperty(node, 'description');
				if (descriptionProperty?.value?.type !== AST_NODE_TYPES.ObjectExpression) return;
				const descriptionValue = descriptionProperty.value;

				const codexProperty = findObjectProperty(descriptionValue, 'codex');
				if (codexProperty?.value.type !== AST_NODE_TYPES.ObjectExpression) return;

				const categoriesArray = findArrayLiteralProperty(codexProperty.value, 'categories');
				if (categoriesArray) {
					checkArrayOfKnownStrings(categoriesArray, KNOWN_CODEX_CATEGORIES, 'unknownCategory');
				}

				const subcategoriesProperty = findObjectProperty(codexProperty.value, 'subcategories');

				let aiSubcategoriesArray: TSESTree.ArrayExpression | null = null;
				let subcategoriesShapeValid = true;

				if (subcategoriesProperty?.value.type === AST_NODE_TYPES.ArrayExpression) {
					context.report({
						node: subcategoriesProperty.value,
						messageId: 'invalidSubcategoriesShape',
					});
					subcategoriesShapeValid = false;
				} else if (subcategoriesProperty?.value.type === AST_NODE_TYPES.ObjectExpression) {
					for (const property of subcategoriesProperty.value.properties) {
						if (property.type !== AST_NODE_TYPES.Property) continue;
						if (property.computed) continue;

						const keyName =
							property.key.type === AST_NODE_TYPES.Identifier
								? property.key.name
								: getStringLiteralValue(property.key);

						if (keyName !== null && !KNOWN_CODEX_CATEGORIES.has(keyName)) {
							context.report({
								node: property.key,
								messageId: 'unknownSubcategoryKey',
								data: { value: keyName },
							});
						}

						if (property.value.type !== AST_NODE_TYPES.ArrayExpression) continue;
						checkArrayOfKnownStrings(
							property.value,
							KNOWN_CODEX_SUBCATEGORIES,
							'unknownSubcategory',
						);

						if (keyName === 'AI') {
							aiSubcategoriesArray = property.value;
						}
					}
				}

				// A node categorized "AI" that's also usable as a standalone step (outputs
				// "main") must be marked "Root Nodes" — the node panel filters out any other
				// "AI"-categorized node from the main "Add node" search, regardless of whether
				// its declared subcategories are otherwise valid. Skip when the subcategories
				// shape is already broken (reported above) — fix that first.
				if (!categoriesArray || !subcategoriesShapeValid) return;

				const aiCategoryElement = categoriesArray.elements.find(
					(element) => element && getStringLiteralValue(element) === 'AI',
				);
				if (!aiCategoryElement) return;

				const outputsProperty = findObjectProperty(descriptionValue, 'outputs');
				if (includesMainOutput(outputsProperty?.value ?? null) !== true) return;

				const hasRootNodes =
					aiSubcategoriesArray?.elements.some(
						(element) => element && getStringLiteralValue(element) === 'Root Nodes',
					) ?? false;

				if (!hasRootNodes) {
					context.report({ node: aiCategoryElement, messageId: 'aiCategoryWithoutRootNodes' });
				}
			},
		};
	},
});
