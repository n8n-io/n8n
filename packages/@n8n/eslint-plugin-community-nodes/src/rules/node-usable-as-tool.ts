import { TSESTree } from '@typescript-eslint/utils';

import {
	isNodeTypeClass,
	isTriggerNode,
	isAiOnlyNode,
	findClassProperty,
	findObjectProperty,
	createRule,
} from '../utils/index.js';

function isSetToTrue(property: TSESTree.Property | null): property is TSESTree.Property {
	return property?.value.type === TSESTree.AST_NODE_TYPES.Literal && property.value.value === true;
}

export const NodeUsableAsToolRule = createRule({
	name: 'node-usable-as-tool',
	meta: {
		type: 'problem',
		docs: {
			description: 'Ensure node classes have usableAsTool property',
		},
		messages: {
			missingUsableAsTool:
				'Node class should have usableAsTool property. When in doubt, set it to true.',
			triggerUsableAsTool:
				'Trigger nodes must not set usableAsTool: true. Trigger nodes cannot be invoked as AI tools and doing so pollutes the tool picker. Remove this property.',
			aiOnlyUsableAsTool:
				'AI-only nodes (non-main output, no inputs) must not set usableAsTool: true. These nodes are only usable through their AI connection type, not as a generic tool, and doing so pollutes the tool picker. Remove this property.',
		},
		fixable: 'code',
		schema: [],
	},
	defaultOptions: [],
	create(context) {
		return {
			ClassDeclaration(node) {
				if (!isNodeTypeClass(node)) {
					return;
				}

				const descriptionProperty = findClassProperty(node, 'description');
				if (!descriptionProperty) {
					return;
				}

				const descriptionValue = descriptionProperty.value;
				if (descriptionValue?.type !== TSESTree.AST_NODE_TYPES.ObjectExpression) {
					return;
				}

				const usableAsToolProperty = findObjectProperty(descriptionValue, 'usableAsTool');

				if (isTriggerNode(node, descriptionValue)) {
					if (isSetToTrue(usableAsToolProperty)) {
						context.report({
							node: usableAsToolProperty,
							messageId: 'triggerUsableAsTool',
						});
					}
					return;
				}

				if (isAiOnlyNode(descriptionValue)) {
					if (isSetToTrue(usableAsToolProperty)) {
						context.report({
							node: usableAsToolProperty,
							messageId: 'aiOnlyUsableAsTool',
						});
					}
					return;
				}

				if (!usableAsToolProperty) {
					context.report({
						node,
						messageId: 'missingUsableAsTool',
						fix(fixer) {
							if (descriptionValue?.type === TSESTree.AST_NODE_TYPES.ObjectExpression) {
								const properties = descriptionValue.properties;
								if (properties.length === 0) {
									const openBrace = descriptionValue.range[0] + 1;
									return fixer.insertTextAfterRange(
										[openBrace, openBrace],
										'\n\t\tusableAsTool: true,',
									);
								} else {
									const lastProperty = properties.at(-1);
									if (lastProperty) {
										return fixer.insertTextAfter(lastProperty, ',\n\t\tusableAsTool: true');
									}
								}
							}

							return null;
						},
					});
				}
			},
		};
	},
});
