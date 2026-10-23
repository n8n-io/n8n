import type { TSESTree } from '@typescript-eslint/utils';
import { AST_NODE_TYPES } from '@typescript-eslint/utils';

import {
	isNodeTypeClass,
	findNodeDescriptionObject,
	getPropertyKeyName,
	getStringLiteralValue,
	isFileType,
	createRule,
} from '../utils/index.js';

/**
 * Matches emoji characters: pictographs (😀, 🚀, ✉️, etc.) and regional
 * indicator symbols that compose flag emoji (🇺🇸).
 */
const EMOJI_REGEX = /(\p{Extended_Pictographic}|\p{Regional_Indicator})/gu;

/** Keys whose string values are surfaced to users as labels. */
const LABEL_KEYS = new Set(['name', 'displayName']);

/**
 * Keys whose values hold more labelled objects. The walk enters only these, so
 * data such as `default`, `value` and `routing` is never checked: it is not
 * rendered in the editor.
 */
const STRUCTURAL_KEYS = new Set(['properties', 'options', 'values', 'defaults', 'modes']);

const ARRAY_TYPE_NAMES = new Set(['Array', 'ReadonlyArray']);

/**
 * Types from `n8n-workflow` that describe user-facing node labels. Includes
 * `INodeTypeDescription` for descriptions kept outside the `.node.ts` class,
 * such as a `versionDescription.ts` file.
 */
const NODE_PROPERTY_TYPE_NAMES = new Set([
	'INodeTypeDescription',
	'INodeProperties',
	'INodePropertyOptions',
	'INodePropertyCollection',
]);

/**
 * Matches a node property type (see `NODE_PROPERTY_TYPE_NAMES`), alone or as an
 * array: `T`, `T[]`, `readonly T[]`, `Array<T>` and `ReadonlyArray<T>`.
 */
const isNodePropertiesType = (typeNode: TSESTree.TypeNode): boolean => {
	switch (typeNode.type) {
		case AST_NODE_TYPES.TSArrayType:
			return isNodePropertiesType(typeNode.elementType);
		case AST_NODE_TYPES.TSTypeOperator:
			// Skip `keyof` and `unique`: only `readonly T[]` wraps the property type.
			return typeNode.operator === 'readonly' && typeNode.typeAnnotation
				? isNodePropertiesType(typeNode.typeAnnotation)
				: false;
		case AST_NODE_TYPES.TSTypeReference: {
			if (typeNode.typeName.type !== AST_NODE_TYPES.Identifier) {
				return false;
			}
			if (NODE_PROPERTY_TYPE_NAMES.has(typeNode.typeName.name)) {
				return true;
			}
			const [elementType] = typeNode.typeArguments?.params ?? [];
			return ARRAY_TYPE_NAMES.has(typeNode.typeName.name) && elementType
				? isNodePropertiesType(elementType)
				: false;
		}
		default:
			return false;
	}
};

/** Returns the type of a variable declared as `x: T = …`, `… as T` or `… satisfies T`. */
const getDeclaredType = (
	id: TSESTree.BindingName,
	init: TSESTree.Expression,
): TSESTree.TypeNode | undefined => {
	if (id.type === AST_NODE_TYPES.Identifier && id.typeAnnotation) {
		return id.typeAnnotation.typeAnnotation;
	}
	if (
		init.type === AST_NODE_TYPES.TSAsExpression ||
		init.type === AST_NODE_TYPES.TSSatisfiesExpression
	) {
		return init.typeAnnotation;
	}
	return undefined;
};

export const NoEmojiInOptionsRule = createRule({
	name: 'no-emoji-in-options',
	meta: {
		type: 'problem',
		docs: {
			description: 'Disallow emoji characters in node option name and displayName values',
		},
		messages: {
			emojiInOption: 'Emoji characters are not allowed in "{{ key }}" values. Found: {{ emoji }}.',
		},
		schema: [],
	},
	defaultOptions: [],
	create(context) {
		const isNodeFile = isFileType(context.filename, '.node.ts');

		const checkLabelValue = (key: string, valueNode: TSESTree.Node): void => {
			const value = getStringLiteralValue(valueNode);
			if (value === null) {
				return;
			}

			const matches = value.match(EMOJI_REGEX);
			if (!matches) {
				return;
			}

			context.report({
				node: valueNode,
				messageId: 'emojiInOption',
				data: {
					key,
					emoji: [...new Set(matches)].join(' '),
				},
			});
		};

		const traverse = (node: TSESTree.Node, isMode = false): void => {
			switch (node.type) {
				case AST_NODE_TYPES.TSAsExpression:
				case AST_NODE_TYPES.TSSatisfiesExpression:
					traverse(node.expression, isMode);
					return;
				case AST_NODE_TYPES.ConditionalExpression:
					traverse(node.consequent, isMode);
					traverse(node.alternate, isMode);
					return;
				case AST_NODE_TYPES.SpreadElement:
					traverse(node.argument, isMode);
					return;
				case AST_NODE_TYPES.ArrayExpression:
					for (const element of node.elements) {
						if (element) {
							traverse(element, isMode);
						}
					}
					return;
				case AST_NODE_TYPES.ObjectExpression:
					for (const property of node.properties) {
						if (property.type === AST_NODE_TYPES.SpreadElement) {
							traverse(property, isMode);
							continue;
						}
						const key = getPropertyKeyName(property);
						if (key === null) {
							continue;
						}
						// Mode names are internal identifiers. Only displayName is a label.
						if (isMode ? key === 'displayName' : LABEL_KEYS.has(key)) {
							checkLabelValue(key, property.value);
						} else if (!isMode && STRUCTURAL_KEYS.has(key)) {
							traverse(property.value, key === 'modes');
						}
					}
					return;
				default:
					return;
			}
		};

		return {
			ClassDeclaration(node) {
				if (!isNodeFile || !isNodeTypeClass(node)) {
					return;
				}

				const description = findNodeDescriptionObject(node);
				if (!description) {
					return;
				}

				traverse(description);
			},
			VariableDeclarator(node) {
				if (!node.init) {
					return;
				}

				const declaredType = getDeclaredType(node.id, node.init);
				if (!declaredType || !isNodePropertiesType(declaredType)) {
					return;
				}

				traverse(node.init);
			},
		};
	},
});
