import { TSESTree } from '@typescript-eslint/utils';

import {
	isNodeTypeClass,
	findClassProperty,
	findObjectProperty,
	isFileType,
	createRule,
} from '../utils/index.js';

/** @deprecated Use `require-node-description-fields` instead. */
export const NodeClassDescriptionIconMissingRule = createRule({
	name: 'node-class-description-icon-missing',
	meta: {
		type: 'problem',
		deprecated: {
			message: 'Use require-node-description-fields instead.',
			replacedBy: [{ rule: { name: 'require-node-description-fields' } }],
		},
		docs: {
			description:
				'Node class description must have an `icon` property defined. Deprecated: use `require-node-description-fields` instead.',
		},
		messages: {
			missingIcon: 'Node class description is missing required `icon` property',
			addPlaceholder: 'Add icon property with placeholder',
		},
		schema: [],
		hasSuggestions: true,
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
				if (
					!descriptionProperty?.value ||
					descriptionProperty.value.type !== TSESTree.AST_NODE_TYPES.ObjectExpression
				) {
					return;
				}

				const descriptionValue = descriptionProperty.value;
				const iconProperty = findObjectProperty(descriptionValue, 'icon');
				if (iconProperty) {
					return;
				}

				context.report({
					node,
					messageId: 'missingIcon',
					suggest: [
						{
							messageId: 'addPlaceholder',
							fix(fixer) {
								const lastProperty =
									descriptionValue.properties[descriptionValue.properties.length - 1];
								if (lastProperty) {
									return fixer.insertTextAfter(lastProperty, ',\n\t\ticon: "file:./icon.svg"');
								}
								return null;
							},
						},
					],
				});
			},
		};
	},
});
