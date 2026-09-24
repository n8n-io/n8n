import type { TSESTree } from '@typescript-eslint/utils';
import { AST_NODE_TYPES } from '@typescript-eslint/utils';

import {
	isNodeTypeClass,
	findClassProperty,
	findObjectProperty,
	getStringLiteralValue,
	isFileType,
	isTriggerNode,
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
				'Node must define an operation with an action so it appears in node search and can be used by AI.',
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
			let hasActions = false;

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
						hasActions ||= optionsProperty.value.elements.some(
							(option) =>
								option?.type === AST_NODE_TYPES.ObjectExpression &&
								findObjectProperty(option, 'action') !== null,
						);
					}
				}
			}

			if (!hasActions) {
				context.report({
					node: operationNode ?? descriptionValue,
					messageId: 'missingActions',
				});
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

				const descriptionProperty = findClassProperty(node, 'description');
				if (descriptionProperty?.value?.type !== AST_NODE_TYPES.ObjectExpression) {
					return;
				}

				if (isTriggerNode(node, descriptionProperty.value)) {
					return;
				}

				analyzeNodeDescription(descriptionProperty.value);
			},
		};
	},
});
