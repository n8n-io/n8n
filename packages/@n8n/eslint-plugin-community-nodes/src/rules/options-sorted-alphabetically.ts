import type { TSESTree } from '@typescript-eslint/utils';
import { AST_NODE_TYPES } from '@typescript-eslint/utils';

import {
	isNodeTypeClass,
	findClassProperty,
	findObjectProperty,
	getStringLiteralValue,
	isFileType,
	createRule,
} from '../utils/index.js';

export const OptionsSortedAlphabeticallyRule = createRule({
	name: 'options-sorted-alphabetically',
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Enforce alphabetical ordering of options arrays in n8n node properties',
		},
		messages: {
			optionsNotSorted:
				'Options in "{{ displayName }}" are not sorted alphabetically. Expected order: {{ expectedOrder }}.',
		},
		schema: [],
	},
	defaultOptions: [],
	create(context) {
		if (!isFileType(context.filename, '.node.ts')) {
			return {};
		}

		const analyzeNodeDescription = (descriptionValue: TSESTree.Expression | null): void => {
			if (!descriptionValue || descriptionValue.type !== AST_NODE_TYPES.ObjectExpression) {
				return;
			}

			const propertiesProperty = findObjectProperty(descriptionValue, 'properties');
			if (
				!propertiesProperty?.value ||
				propertiesProperty.value.type !== AST_NODE_TYPES.ArrayExpression
			) {
				return;
			}

			for (const property of propertiesProperty.value.elements) {
				if (!property || property.type !== AST_NODE_TYPES.ObjectExpression) {
					continue;
				}

				const typeProperty = findObjectProperty(property, 'type');
				const type = typeProperty ? getStringLiteralValue(typeProperty.value) : null;

				if (type !== 'options') {
					continue;
				}

				const optionsProperty = findObjectProperty(property, 'options');
				if (
					!optionsProperty?.value ||
					optionsProperty.value.type !== AST_NODE_TYPES.ArrayExpression
				) {
					continue;
				}

				const optionsArray = optionsProperty.value;

				// Extract all option names; skip if any name is non-literal (dynamic options)
				const names: string[] = [];
				let hasDynamicName = false;

				for (const option of optionsArray.elements) {
					if (!option || option.type !== AST_NODE_TYPES.ObjectExpression) {
						hasDynamicName = true;
						break;
					}
					const nameProperty = findObjectProperty(option, 'name');
					const name = nameProperty ? getStringLiteralValue(nameProperty.value) : null;
					if (name === null) {
						hasDynamicName = true;
						break;
					}
					names.push(name);
				}

				if (hasDynamicName || names.length <= 1) {
					continue;
				}

				const sorted = [...names].sort((a, b) =>
					a.localeCompare(b, undefined, { sensitivity: 'base' }),
				);

				const isSorted = names.every((name, i) => name === sorted[i]);
				if (isSorted) {
					continue;
				}

				const displayNameProperty = findObjectProperty(property, 'displayName');
				const displayName =
					(displayNameProperty ? getStringLiteralValue(displayNameProperty.value) : null) ??
					'unknown';

				context.report({
					node: optionsArray,
					messageId: 'optionsNotSorted',
					data: {
						displayName,
						expectedOrder: sorted.join(', '),
					},
				});
			}
		};

		return {
			ClassDeclaration(node) {
				if (!isNodeTypeClass(node)) {
					return;
				}

				const descriptionProperty = findClassProperty(node, 'description');
				if (!descriptionProperty) {
					return;
				}

				analyzeNodeDescription(descriptionProperty.value);
			},
		};
	},
});
