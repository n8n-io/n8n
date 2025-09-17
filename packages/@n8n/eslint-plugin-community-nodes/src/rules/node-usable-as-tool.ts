import { ESLintUtils } from '@typescript-eslint/utils';

export const NodeUsableAsToolRule = ESLintUtils.RuleCreator.withoutDocs({
	meta: {
		type: 'problem',
		docs: {
			description: 'Ensure node classes have usableAsTool property set to true',
		},
		messages: {
			missingUsableAsTool: 'Node class should have usableAsTool property set to true',
		},
		fixable: 'code',
		schema: [],
	},
	defaultOptions: [],
	create(context) {
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

				// Look for description property containing usableAsTool
				const descriptionProperty = node.body.body.find(
					(member) =>
						member.type === 'PropertyDefinition' &&
						member.key?.type === 'Identifier' &&
						(member.key as any).name === 'description',
				);

				if (!descriptionProperty || descriptionProperty.type !== 'PropertyDefinition') {
					context.report({
						node,
						messageId: 'missingUsableAsTool',
					});
					return;
				}

				// Look for usableAsTool property within description object
				let usableAsToolProperty: any = null;
				let hasUsableAsTool = false;
				let isUsableAsToolTrue = false;

				const descriptionValue = descriptionProperty.value;
				if (descriptionValue?.type === 'ObjectExpression') {
					const usableAsToolProp = descriptionValue.properties.find(
						(prop: any) =>
							prop.type === 'Property' &&
							prop.key.type === 'Identifier' &&
							prop.key.name === 'usableAsTool',
					);

					if (usableAsToolProp?.type === 'Property') {
						usableAsToolProperty = usableAsToolProp;
						hasUsableAsTool = true;
						if (
							usableAsToolProp.value.type === 'Literal' &&
							usableAsToolProp.value.value === true
						) {
							isUsableAsToolTrue = true;
						}
					}
				}

				if (!hasUsableAsTool || !isUsableAsToolTrue) {
					context.report({
						node,
						messageId: 'missingUsableAsTool',
						fix(fixer) {
							// If property exists but has wrong value, replace it
							if (hasUsableAsTool && usableAsToolProperty?.value) {
								return fixer.replaceText(usableAsToolProperty.value, 'true');
							}

							// If usableAsTool doesn't exist in description, add it
							if (descriptionValue?.type === 'ObjectExpression') {
								const properties = descriptionValue.properties;
								if (properties.length === 0) {
									// Empty object, add the property
									const openBrace = descriptionValue.range![0] + 1;
									return fixer.insertTextAfterRange(
										[openBrace, openBrace],
										'\n\t\tusableAsTool: true,',
									);
								} else {
									// Add after the last property
									const lastProperty = properties[properties.length - 1];
									return fixer.insertTextAfter(lastProperty, ',\n\t\tusableAsTool: true');
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
