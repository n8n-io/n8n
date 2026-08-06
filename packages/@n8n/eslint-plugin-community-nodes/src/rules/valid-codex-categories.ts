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
	| 'didYouMean';

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

				const codexProperty = findObjectProperty(descriptionProperty.value, 'codex');
				if (codexProperty?.value.type !== AST_NODE_TYPES.ObjectExpression) return;

				const categoriesArray = findArrayLiteralProperty(codexProperty.value, 'categories');
				if (categoriesArray) {
					checkArrayOfKnownStrings(categoriesArray, KNOWN_CODEX_CATEGORIES, 'unknownCategory');
				}

				const subcategoriesProperty = findObjectProperty(codexProperty.value, 'subcategories');
				if (!subcategoriesProperty) return;

				if (subcategoriesProperty.value.type === AST_NODE_TYPES.ArrayExpression) {
					context.report({
						node: subcategoriesProperty.value,
						messageId: 'invalidSubcategoriesShape',
					});
					return;
				}

				if (subcategoriesProperty.value.type !== AST_NODE_TYPES.ObjectExpression) return;

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
					checkArrayOfKnownStrings(property.value, KNOWN_CODEX_SUBCATEGORIES, 'unknownSubcategory');
				}
			},
		};
	},
});
