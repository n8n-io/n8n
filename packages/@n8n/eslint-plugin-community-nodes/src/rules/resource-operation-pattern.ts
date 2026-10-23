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

export const ResourceOperationPatternRule = createRule({
	name: 'resource-operation-pattern',
	meta: {
		type: 'problem',
		docs: {
			description: 'Enforce proper resource/operation pattern for better UX in n8n nodes',
		},
		messages: {
			tooManyOperationsWithoutResources:
				'Node has {{ operationCount }} operations without resources. Use resources to organize operations when there are more than 5 operations.',
			getAllActionWrong:
				'Start the action of the "getAll" operation with "Get many", not "{{ action }}". For example, use "Get many contacts".',
		},
		schema: [],
	},
	defaultOptions: [],
	create(context) {
		const analyzeNodeDescription = (descriptionValue: TSESTree.Expression | null): void => {
			if (descriptionValue?.type !== AST_NODE_TYPES.ObjectExpression) {
				return;
			}

			const propertiesProperty = findObjectProperty(descriptionValue, 'properties');
			if (propertiesProperty?.value?.type !== AST_NODE_TYPES.ArrayExpression) {
				return;
			}

			const propertiesArray = propertiesProperty.value;
			let hasResources = false;
			let operationCount = 0;
			let operationNode: TSESTree.Node | null = null;

			for (const property of propertiesArray.elements) {
				if (property?.type !== AST_NODE_TYPES.ObjectExpression) {
					continue;
				}

				const nameProperty = findObjectProperty(property, 'name');
				const typeProperty = findObjectProperty(property, 'type');

				const name = nameProperty ? getStringLiteralValue(nameProperty.value) : null;
				const type = typeProperty ? getStringLiteralValue(typeProperty.value) : null;

				if (!name || !type) {
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
			ObjectExpression(node) {
				const nameProperty = findObjectProperty(node, 'name');
				const typeProperty = findObjectProperty(node, 'type');
				if (
					!nameProperty ||
					getStringLiteralValue(nameProperty.value) !== 'operation' ||
					!typeProperty ||
					getStringLiteralValue(typeProperty.value) !== 'options'
				) {
					return;
				}

				const optionsProperty = findObjectProperty(node, 'options');
				if (optionsProperty?.value.type !== AST_NODE_TYPES.ArrayExpression) {
					return;
				}

				for (const option of optionsProperty.value.elements) {
					if (option?.type !== AST_NODE_TYPES.ObjectExpression) {
						continue;
					}

					const valueProperty = findObjectProperty(option, 'value');
					const actionProperty = findObjectProperty(option, 'action');
					if (
						!valueProperty ||
						getStringLiteralValue(valueProperty.value) !== 'getAll' ||
						!actionProperty
					) {
						continue;
					}

					const action = getStringLiteralValue(actionProperty.value);
					if (action === null || action.startsWith('Get many') || action.startsWith('Get all')) {
						continue;
					}

					context.report({
						node: actionProperty.value,
						messageId: 'getAllActionWrong',
						data: { action },
					});
				}
			},
			ClassDeclaration(node) {
				if (!isFileType(context.filename, '.node.ts') || !isNodeTypeClass(node)) {
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
