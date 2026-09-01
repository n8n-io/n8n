import type { TSESTree } from '@typescript-eslint/utils';
import { AST_NODE_TYPES } from '@typescript-eslint/utils';

import {
	isNodeTypeClass,
	findClassProperty,
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
		if (!isFileType(context.filename, '.node.ts')) {
			return {};
		}

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

		const traverse = (node: TSESTree.Node): void => {
			if (node.type === AST_NODE_TYPES.ObjectExpression) {
				for (const property of node.properties) {
					if (
						property.type === AST_NODE_TYPES.Property &&
						property.key.type === AST_NODE_TYPES.Identifier &&
						LABEL_KEYS.has(property.key.name)
					) {
						checkLabelValue(property.key.name, property.value);
					}
				}
			}

			for (const key in node) {
				if (key === 'parent') {
					continue;
				}
				const child = node[key as keyof TSESTree.Node] as unknown;
				if (Array.isArray(child)) {
					for (const item of child) {
						if (item && typeof item === 'object' && 'type' in item) {
							traverse(item as TSESTree.Node);
						}
					}
				} else if (child && typeof child === 'object' && 'type' in child) {
					traverse(child as TSESTree.Node);
				}
			}
		};

		return {
			ClassDeclaration(node) {
				if (!isNodeTypeClass(node)) {
					return;
				}

				const descriptionProperty = findClassProperty(node, 'description');
				if (!descriptionProperty?.value) {
					return;
				}

				traverse(descriptionProperty.value);
			},
		};
	},
});
