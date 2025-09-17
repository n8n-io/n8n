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

				// Check if usableAsTool property exists and is set to true
				const usableAsToolProperty = node.body.body.find(
					(member) =>
						member.type === 'PropertyDefinition' &&
						member.key?.type === 'Identifier' &&
						(member.key as any).name === 'usableAsTool',
				);

				if (
					!usableAsToolProperty ||
					usableAsToolProperty.type !== 'PropertyDefinition' ||
					!usableAsToolProperty.value ||
					usableAsToolProperty.value.type !== 'Literal' ||
					usableAsToolProperty.value.value !== true
				) {
					context.report({
						node,
						messageId: 'missingUsableAsTool',
						fix(fixer) {
							// If property exists but has wrong value, replace it
							if (
								usableAsToolProperty &&
								usableAsToolProperty.type === 'PropertyDefinition' &&
								usableAsToolProperty.value
							) {
								return fixer.replaceText(usableAsToolProperty.value, 'true');
							}

							// Find where to insert the property (after description property if it exists)
							const descriptionProperty = node.body.body.find(
								(member) =>
									member.type === 'PropertyDefinition' &&
									member.key?.type === 'Identifier' &&
									(member.key as any).name === 'description',
							);

							if (descriptionProperty) {
								// Insert after description property
								return fixer.insertTextAfter(descriptionProperty, '\n\tusableAsTool = true;');
							} else {
								// Insert at the beginning of the class body
								const openBrace = node.body.range[0] + 1;
								return fixer.insertTextAfterRange(
									[openBrace, openBrace],
									'\n\tusableAsTool = true;',
								);
							}
						},
					});
				}
			},
		};
	},
});
