import type { TSESTree } from '@typescript-eslint/utils';
import { AST_NODE_TYPES } from '@typescript-eslint/utils';

import {
	isNodeTypeClass,
	findObjectProperty,
	getStringLiteralValue,
	isFileType,
	isTriggerNode,
	isAiOnlyNode,
	findNodeDescriptionObject,
	createRule,
} from '../utils/index.js';

export const ResourceOperationPatternRule = createRule({
	name: 'resource-operation-pattern',
	meta: {
		type: 'problem',
		docs: {
			description: 'Enforce proper resource/operation pattern for better UX in n8n nodes',
		},
		messages: {
			missingActions:
				'Add an Operation with an action for each option to give the node explicit action labels.',
			tooManyOperationsWithoutResources:
				'Node has {{ operationCount }} operations without resources. Use resources to organize operations when there are more than 5 operations.',
		},
		schema: [],
	},
	defaultOptions: [],
	create(context) {
		if (!isFileType(context.filename, '.node.ts')) {
			return {};
		}

		const analyzeNodeDescription = (
			descriptionValue: TSESTree.ObjectExpression,
			checkActions: boolean,
		): void => {
			const propertiesProperty = findObjectProperty(descriptionValue, 'properties');
			if (propertiesProperty?.value?.type !== AST_NODE_TYPES.ArrayExpression) {
				return;
			}

			const propertiesArray = propertiesProperty.value;
			let hasResources = false;
			let operationCount = 0;
			let operationNode: TSESTree.Node | null = null;
			let hasUnknownProperties = false;
			const operationOptions: TSESTree.ArrayExpression[] = [];

			for (const property of propertiesArray.elements) {
				if (property?.type !== AST_NODE_TYPES.ObjectExpression) {
					hasUnknownProperties = true;
					continue;
				}

				const nameProperty = findObjectProperty(property, 'name');
				const typeProperty = findObjectProperty(property, 'type');

				const name = nameProperty ? getStringLiteralValue(nameProperty.value) : null;
				const type = typeProperty ? getStringLiteralValue(typeProperty.value) : null;

				if (!name || !type) {
					hasUnknownProperties = true;
					continue;
				}

				if (name === 'resource' && type === 'options') {
					hasResources = true;
				}

				if (name === 'operation' && type === 'options') {
					operationNode = property;
					const optionsProperty = findObjectProperty(property, 'options');
					if (optionsProperty?.value?.type === AST_NODE_TYPES.ArrayExpression) {
						operationCount = optionsProperty.value.elements.length;
						operationOptions.push(optionsProperty.value);
					}
				}
			}

			if (checkActions && !hasUnknownProperties) {
				if (!operationNode) {
					context.report({ node: descriptionValue, messageId: 'missingActions' });
				} else {
					for (const options of operationOptions) {
						if (
							options.elements.some((option) => option?.type !== AST_NODE_TYPES.ObjectExpression)
						) {
							continue;
						}
						for (const option of options.elements) {
							if (option?.type !== AST_NODE_TYPES.ObjectExpression) continue;
							if (
								option.properties.some(
									(entry) =>
										entry.type === AST_NODE_TYPES.SpreadElement ||
										(entry.type === AST_NODE_TYPES.Property &&
											entry.computed &&
											entry.key.type !== AST_NODE_TYPES.Literal),
								)
							) {
								continue;
							}
							const action = findObjectProperty(option, 'action');
							if (
								!action ||
								(action.value.type === AST_NODE_TYPES.Literal &&
									(typeof action.value.value !== 'string' ||
										action.value.value.trim().length === 0))
							) {
								context.report({ node: option, messageId: 'missingActions' });
							}
						}
					}
				}
			}

			if (operationCount > 5 && !hasResources && operationNode) {
				context.report({
					node: operationNode,
					messageId: 'tooManyOperationsWithoutResources',
					data: {
						operationCount: operationCount.toString(),
					},
				});
			}
		};

		return {
			ClassDeclaration(node) {
				if (!isNodeTypeClass(node)) {
					return;
				}

				const description = findNodeDescriptionObject(node);
				if (!description) {
					return;
				}

				analyzeNodeDescription(
					description,
					!isTriggerNode(node, description) && !isAiOnlyNode(description),
				);
			},
		};
	},
});
