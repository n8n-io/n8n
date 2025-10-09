import { ESLintUtils, TSESTree } from '@typescript-eslint/utils';
import {
	isNodeTypeClass,
	findClassProperty,
	findObjectProperty,
	getStringLiteralValue,
	isFileType,
} from '../utils/index.js';

export const ResourceOperationPatternRule = ESLintUtils.RuleCreator.withoutDocs({
	meta: {
		type: 'problem',
		docs: {
			description: 'Enforce proper resource/operation pattern for better UX in n8n nodes',
		},
		messages: {
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
			if (!descriptionValue || descriptionValue.type !== 'ObjectExpression') {
				return;
			}

			const propertiesProperty = findObjectProperty(descriptionValue, 'properties');
			if (!propertiesProperty?.value || propertiesProperty.value.type !== 'ArrayExpression') {
				return;
			}

			const propertiesArray = propertiesProperty.value;
			let hasResources = false;
			let operationCount = 0;
			let operationNode: TSESTree.Node | null = null;

			for (const property of propertiesArray.elements) {
				if (!property || property.type !== 'ObjectExpression') {
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
					if (optionsProperty?.value?.type === 'ArrayExpression') {
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
