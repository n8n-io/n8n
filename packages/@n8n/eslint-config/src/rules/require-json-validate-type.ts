import { ESLintUtils, type TSESTree } from '@typescript-eslint/utils';

function keyName(property: TSESTree.Property): string | undefined {
	const { key } = property;
	if (!property.computed && key.type === 'Identifier') return key.name;
	return key.type === 'Literal' && typeof key.value === 'string' ? key.value : undefined;
}

export const RequireJsonValidateTypeRule = ESLintUtils.RuleCreator.withoutDocs({
	meta: {
		type: 'problem',
		docs: {
			description:
				'Require validateType on a node parameter of type json, so that an expression can return an object or an array.',
		},
		schema: [],
		messages: {
			missingValidateType:
				"Add validateType: 'object' or validateType: 'array' to this json parameter. Then read the parsed value and do not parse it in the node.",
		},
	},
	defaultOptions: [],
	create(context) {
		return {
			ObjectExpression(node) {
				const properties = node.properties.filter(
					(property): property is TSESTree.Property => property.type === 'Property',
				);
				const typeProperty = properties.find((property) => keyName(property) === 'type');
				if (
					typeProperty?.value.type !== 'Literal' ||
					typeProperty.value.value !== 'json' ||
					properties.some((property) => keyName(property) === 'validateType')
				) {
					return;
				}
				context.report({ node: typeProperty, messageId: 'missingValidateType' });
			},
		};
	},
});
