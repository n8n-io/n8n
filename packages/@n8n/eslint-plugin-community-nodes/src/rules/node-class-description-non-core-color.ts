import { TSESTree } from '@typescript-eslint/utils';

import {
	isNodeTypeClass,
	findClassProperty,
	findObjectProperty,
	getStringLiteralValue,
	isFileType,
	createRule,
} from '../utils/index.js';

const N8N_CORE_COLOR = '#ff6d5a';

export const NodeClassDescriptionNonCoreColorRule = createRule({
	name: 'node-class-description-non-core-color',
	meta: {
		type: 'suggestion',
		docs: {
			description: 'Node class description must not use the n8n core color.',
		},
		messages: {
			coreColor:
				'Node class description uses the n8n core color `{{ color }}`. Use a custom color to distinguish your community node from built-in nodes.',
		},
		schema: [],
	},
	defaultOptions: [],
	create(context) {
		if (!isFileType(context.filename, '.node.ts')) {
			return {};
		}

		return {
			ClassDeclaration(node) {
				if (!isNodeTypeClass(node)) {
					return;
				}

				const descriptionProperty = findClassProperty(node, 'description');
				if (descriptionProperty?.value?.type !== TSESTree.AST_NODE_TYPES.ObjectExpression) {
					return;
				}

				const descriptionValue = descriptionProperty.value;

				// `description.color` or `description.defaults.color`
				const colorNodes: TSESTree.Property[] = [];

				const topLevelColor = findObjectProperty(descriptionValue, 'color');
				if (topLevelColor) {
					colorNodes.push(topLevelColor);
				}

				const defaultsProperty = findObjectProperty(descriptionValue, 'defaults');
				if (defaultsProperty?.value.type === TSESTree.AST_NODE_TYPES.ObjectExpression) {
					const defaultsColor = findObjectProperty(defaultsProperty.value, 'color');
					if (defaultsColor) {
						colorNodes.push(defaultsColor);
					}
				}

				for (const colorNode of colorNodes) {
					const color = getStringLiteralValue(colorNode.value);
					if (color?.toLowerCase() === N8N_CORE_COLOR) {
						context.report({
							node: colorNode.value,
							messageId: 'coreColor',
							data: { color },
						});
					}
				}
			},
		};
	},
});
