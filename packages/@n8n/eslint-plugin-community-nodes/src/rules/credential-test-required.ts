import { ESLintUtils, TSESTree } from '@typescript-eslint/utils';

export const CredentialTestRequiredRule = ESLintUtils.RuleCreator.withoutDocs({
	meta: {
		type: 'problem',
		docs: {
			description: 'Ensure credential classes have a test property unless they extend oAuth2Api',
		},
		messages: {
			missingCredentialTest:
				'Credential class "{{ className }}" must have a test property or extend oAuth2Api',
		},
		schema: [],
	},
	defaultOptions: [],
	create(context) {
		// Only run on .credentials.ts files
		if (!context.filename.endsWith('.credentials.ts')) {
			return {};
		}

		return {
			ClassDeclaration(node) {
				// Check if this class implements ICredentialType
				const implementsCredentialType = node.implements?.some(
					(impl) =>
						impl.type === 'TSClassImplements' &&
						impl.expression.type === 'Identifier' &&
						impl.expression.name === 'ICredentialType',
				);

				if (!implementsCredentialType) {
					return;
				}

				// Check if the class extends oAuth2Api
				const extendsOAuth2 = hasExtendsOAuth2Api(node);
				if (extendsOAuth2) {
					return; // Exempt from test requirement
				}

				// Check if the class has a test property
				const hasTestProperty = node.body.body.some(
					(member) =>
						member.type === 'PropertyDefinition' &&
						member.key?.type === 'Identifier' &&
						(member.key as any).name === 'test',
				);

				if (!hasTestProperty) {
					context.report({
						node,
						messageId: 'missingCredentialTest',
						data: {
							className: node.id?.name || 'Unknown',
						},
					});
				}
			},
		};
	},
});

// Look for extends = ['oAuth2Api'] property in the class body
function hasExtendsOAuth2Api(node: TSESTree.ClassDeclaration): boolean {
	return node.body.body.some((member) => {
		if (
			member.type === 'PropertyDefinition' &&
			member.key?.type === 'Identifier' &&
			(member.key as any).name === 'extends'
		) {
			if (
				member.value?.type === 'ArrayExpression' &&
				member.value.elements.some(
					(element) =>
						element?.type === 'Literal' &&
						typeof element.value === 'string' &&
						element.value === 'oAuth2Api',
				)
			) {
				return true;
			}
		}
		return false;
	});
}
