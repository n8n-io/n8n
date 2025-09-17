import { ESLintUtils } from '@typescript-eslint/utils';

// Common sensitive field name patterns
const SENSITIVE_FIELD_PATTERNS = [
	'password',
	'key',
	'secret',
	'token',
	'apikey',
	'accesstoken',
	'secretkey',
	'privatekey',
	'authkey',
	'passphrase',
];

const isSensitiveFieldName = (name: string): boolean => {
	const lowerName = name.toLowerCase();
	return SENSITIVE_FIELD_PATTERNS.some(
		(pattern) => lowerName.includes(pattern) || lowerName.endsWith(pattern),
	);
};

export const CredentialPasswordFieldRule = ESLintUtils.RuleCreator.withoutDocs({
	meta: {
		type: 'problem',
		docs: {
			description: 'Ensure credential fields with sensitive names have typeOptions.password = true',
		},
		messages: {
			missingPasswordOption:
				"Field '{{ fieldName }}' appears to be a sensitive field but is missing 'typeOptions: { password: true }'",
		},
		fixable: 'code',
		schema: [],
	},
	defaultOptions: [],
	create(context) {
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

				// Check if this credential extends oAuth2Api (OAuth2 credentials are exempt)
				const extendsProperty = node.body.body.find(
					(member) =>
						member.type === 'PropertyDefinition' &&
						member.key?.type === 'Identifier' &&
						(member.key as any).name === 'extends',
				);

				if (
					extendsProperty &&
					extendsProperty.type === 'PropertyDefinition' &&
					extendsProperty.value?.type === 'ArrayExpression'
				) {
					const extendsOAuth2 = extendsProperty.value.elements.some(
						(element: any) => element?.type === 'Literal' && element.value === 'oAuth2Api',
					);

					if (extendsOAuth2) {
						return; // Skip OAuth2 credentials
					}
				}

				// Find the properties array
				const propertiesProperty = node.body.body.find(
					(member) =>
						member.type === 'PropertyDefinition' &&
						member.key?.type === 'Identifier' &&
						(member.key as any).name === 'properties',
				);

				if (
					!propertiesProperty ||
					propertiesProperty.type !== 'PropertyDefinition' ||
					!propertiesProperty.value ||
					propertiesProperty.value.type !== 'ArrayExpression'
				) {
					return;
				}

				// Check each property in the array
				propertiesProperty.value.elements.forEach((element: any) => {
					if (element?.type !== 'ObjectExpression') {
						return;
					}

					let fieldName = '';
					let hasPasswordTypeOption = false;

					// Analyze the property object
					element.properties.forEach((prop: any) => {
						if (prop.type !== 'Property' || prop.key.type !== 'Identifier') {
							return;
						}

						// Get field name
						if (
							prop.key.name === 'name' &&
							prop.value.type === 'Literal' &&
							typeof prop.value.value === 'string'
						) {
							fieldName = prop.value.value;
						}

						// Check for typeOptions.password
						if (prop.key.name === 'typeOptions' && prop.value.type === 'ObjectExpression') {
							const passwordOption = prop.value.properties.find(
								(opt: any) =>
									opt.type === 'Property' &&
									opt.key.type === 'Identifier' &&
									opt.key.name === 'password' &&
									opt.value.type === 'Literal' &&
									opt.value.value === true,
							);
							if (passwordOption) {
								hasPasswordTypeOption = true;
							}
						}
					});

					// Report if sensitive field name but no password option
					if (fieldName && isSensitiveFieldName(fieldName) && !hasPasswordTypeOption) {
						context.report({
							node: element,
							messageId: 'missingPasswordOption',
							data: {
								fieldName,
							},
							fix(fixer) {
								// Check if typeOptions already exists
								const typeOptionsProperty = element.properties.find(
									(prop: any) =>
										prop.type === 'Property' &&
										prop.key.type === 'Identifier' &&
										prop.key.name === 'typeOptions',
								);

								if (typeOptionsProperty && typeOptionsProperty.value.type === 'ObjectExpression') {
									// typeOptions exists but doesn't have password: true
									const passwordProperty = typeOptionsProperty.value.properties.find(
										(opt: any) =>
											opt.type === 'Property' &&
											opt.key.type === 'Identifier' &&
											opt.key.name === 'password',
									);

									if (passwordProperty) {
										// password property exists but is false, change it to true
										return fixer.replaceText(passwordProperty.value, 'true');
									} else {
										// Add password: true to existing typeOptions
										const lastProperty =
											typeOptionsProperty.value.properties[
												typeOptionsProperty.value.properties.length - 1
											];
										const insertText =
											typeOptionsProperty.value.properties.length > 0
												? ', password: true'
												: 'password: true';
										return fixer.insertTextAfter(lastProperty, insertText);
									}
								} else {
									// No typeOptions property exists, add the entire typeOptions
									const lastProperty = element.properties[element.properties.length - 1];
									return fixer.insertTextAfter(
										lastProperty,
										',\n\t\t\ttypeOptions: { password: true }',
									);
								}
							},
						});
					}
				});
			},
		};
	},
});
