import { ESLintUtils, TSESTree } from '@typescript-eslint/utils';

export const ResourceOperationPatternRule = ESLintUtils.RuleCreator.withoutDocs({
	meta: {
		type: 'problem',
		docs: {
			description: 'Enforce proper resource/operation pattern for better UX in n8n nodes',
		},
		messages: {
			tooManyOperationsWithoutResources:
				'Node has {{ operationCount }} operations without resources. Use resources to organize operations when there are more than 10 operations.',
			operationsWithoutResources:
				'Node has {{ operationCount }} operations without resources. Consider using resources to organize operations for better UX.',
		},
		schema: [],
	},
	defaultOptions: [],
	create(context) {
		// Only run on .node.ts files
		if (!context.filename.endsWith('.node.ts')) {
			return {};
		}

		const analyzeNodeDescription = (descriptionValue: TSESTree.Expression | null): void => {
			if (!descriptionValue || descriptionValue.type !== 'ObjectExpression') {
				return;
			}

			// Find properties array
			const propertiesProperty = descriptionValue.properties.find(
				(prop) =>
					prop.type === 'Property' &&
					prop.key.type === 'Identifier' &&
					prop.key.name === 'properties',
			);

			if (
				!propertiesProperty?.type ||
				propertiesProperty.type !== 'Property' ||
				propertiesProperty.value.type !== 'ArrayExpression'
			) {
				return;
			}

			const propertiesArray = propertiesProperty.value;
			let hasResources = false;
			let operationCount = 0;
			let operationNode: TSESTree.Node | null = null;

			// Analyze each property
			for (const property of propertiesArray.elements) {
				if (!property || property.type !== 'ObjectExpression') {
					continue;
				}

				// Look for name and type properties
				const nameProperty = property.properties.find(
					(prop) =>
						prop.type === 'Property' &&
						prop.key.type === 'Identifier' &&
						prop.key.name === 'name' &&
						prop.value.type === 'Literal' &&
						typeof prop.value.value === 'string',
				);

				const typeProperty = property.properties.find(
					(prop) =>
						prop.type === 'Property' &&
						prop.key.type === 'Identifier' &&
						prop.key.name === 'type' &&
						prop.value.type === 'Literal' &&
						typeof prop.value.value === 'string',
				);

				if (
					!nameProperty ||
					!typeProperty ||
					nameProperty.type !== 'Property' ||
					typeProperty.type !== 'Property'
				) {
					continue;
				}

				const name = (nameProperty.value as TSESTree.Literal).value as string;
				const type = (typeProperty.value as TSESTree.Literal).value as string;

				// Check for resource property
				if (name === 'resource' && type === 'options') {
					hasResources = true;
				}

				// Check for operation property and count options
				if (name === 'operation' && type === 'options') {
					operationNode = property;

					// Find options array to count operations
					const optionsProperty = property.properties.find(
						(prop) =>
							prop.type === 'Property' &&
							prop.key.type === 'Identifier' &&
							prop.key.name === 'options',
					);

					if (
						optionsProperty?.type === 'Property' &&
						optionsProperty.value.type === 'ArrayExpression'
					) {
						operationCount = optionsProperty.value.elements.length;
					}
				}
			}

			// Report issues if operations exist without resources
			if (operationCount > 0 && !hasResources && operationNode) {
				if (operationCount > 10) {
					context.report({
						node: operationNode,
						messageId: 'tooManyOperationsWithoutResources',
						data: {
							operationCount: operationCount.toString(),
						},
					});
				} else {
					context.report({
						node: operationNode,
						messageId: 'operationsWithoutResources',
						data: {
							operationCount: operationCount.toString(),
						},
					});
				}
			}
		};

		return {
			ClassDeclaration(node) {
				// Check if this class implements INodeType
				const implementsNodeType = node.implements?.some(
					(impl) =>
						impl.type === 'TSClassImplements' &&
						impl.expression.type === 'Identifier' &&
						impl.expression.name === 'INodeType',
				);

				if (!implementsNodeType) {
					return;
				}

				// Find the description property
				const descriptionProperty = node.body.body.find(
					(member) =>
						member.type === 'PropertyDefinition' &&
						member.key?.type === 'Identifier' &&
						(member.key as any).name === 'description',
				);

				if (!descriptionProperty || descriptionProperty.type !== 'PropertyDefinition') {
					return;
				}

				analyzeNodeDescription(descriptionProperty.value);
			},
		};
	},
});
