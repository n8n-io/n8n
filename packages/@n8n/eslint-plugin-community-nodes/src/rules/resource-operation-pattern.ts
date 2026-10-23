import type { TSESTree } from '@typescript-eslint/utils';
import { AST_NODE_TYPES } from '@typescript-eslint/utils';

import {
	isNodeTypeClass,
	findClassProperty,
	findObjectProperty,
	getStringLiteralValue,
	isFileType,
	createRule,
	getOptionObjects,
	isOperationParameter,
} from '../utils/index.js';

// n8n-nodes-base/node-param-operation-option-action-wrong-for-get-many reports and fixes these.
const BASE_RULE_GET_ALL_PREFIX = 'Get all ';

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
			wrongGetManyAction:
				'Start the action of the "getAll" operation with "Get many", not "{{ action }}". For example, use "Get many contacts".',
		},
		schema: [],
	},
	defaultOptions: [],
	create(context) {
		const isNodeFile = isFileType(context.filename, '.node.ts');

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

		const checkGetManyAction = (operationParameter: TSESTree.ObjectExpression): void => {
			for (const option of getOptionObjects(operationParameter)) {
				const value = getStringLiteralValue(findObjectProperty(option, 'value')?.value ?? null);
				if (value !== 'getAll') {
					continue;
				}

				const actionProperty = findObjectProperty(option, 'action');
				const action = getStringLiteralValue(actionProperty?.value ?? null);
				if (
					!actionProperty ||
					action === null ||
					/^Get many\b/.test(action) ||
					action.startsWith(BASE_RULE_GET_ALL_PREFIX)
				) {
					continue;
				}

				context.report({
					node: actionProperty.value,
					messageId: 'wrongGetManyAction',
					data: { action },
				});
			}
		};

		return {
			// Most nodes define their operations in description files outside the node class.
			ObjectExpression(node) {
				if (isOperationParameter(node)) {
					checkGetManyAction(node);
				}
			},
			ClassDeclaration(node) {
				if (!isNodeFile || !isNodeTypeClass(node)) {
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
