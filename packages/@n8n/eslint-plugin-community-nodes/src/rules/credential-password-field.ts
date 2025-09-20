import { ESLintUtils } from '@typescript-eslint/utils';
import {
	isCredentialTypeClass,
	findClassProperty,
	findObjectProperty,
	getStringLiteralValue,
	getBooleanLiteralValue,
} from '../utils/index.js';

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

// URL fields that shouldn't be considered sensitive
const URL_FIELD_PATTERNS = [
	'url',
	'uri',
	'endpoint',
	'baseurl',
	'serverurl',
	'authorizationurl',
	'accesstokenurl',
	'tokenurl',
	'redirecturl',
	'callbackurl',
];

const isSensitiveFieldName = (name: string): boolean => {
	const lowerName = name.toLowerCase();

	const isUrlField = URL_FIELD_PATTERNS.some(
		(pattern) => lowerName.includes(pattern) || lowerName.endsWith(pattern),
	);

	if (isUrlField) {
		return false;
	}

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
				if (!isCredentialTypeClass(node)) {
					return;
				}

				const propertiesProperty = findClassProperty(node, 'properties');
				if (!propertiesProperty?.value || propertiesProperty.value.type !== 'ArrayExpression') {
					return;
				}

				propertiesProperty.value.elements.forEach((element: any) => {
					if (element?.type !== 'ObjectExpression') {
						return;
					}

					const nameProperty = findObjectProperty(element, 'name');
					const fieldName = nameProperty ? getStringLiteralValue(nameProperty.value) : null;

					if (!fieldName || !isSensitiveFieldName(fieldName)) {
						return;
					}

					const typeOptionsProperty = findObjectProperty(element, 'typeOptions');
					let hasPasswordTypeOption = false;

					if (typeOptionsProperty?.value?.type === 'ObjectExpression') {
						const passwordProperty = findObjectProperty(typeOptionsProperty.value, 'password');
						if (passwordProperty) {
							const passwordValue = getBooleanLiteralValue(passwordProperty.value);
							hasPasswordTypeOption = passwordValue === true;
						}
					}

					if (!hasPasswordTypeOption) {
						context.report({
							node: element,
							messageId: 'missingPasswordOption',
							data: {
								fieldName,
							},
							fix(fixer) {
								if (typeOptionsProperty?.value?.type === 'ObjectExpression') {
									const passwordProperty = findObjectProperty(
										typeOptionsProperty.value,
										'password',
									);
									if (passwordProperty) {
										return fixer.replaceText(passwordProperty.value, 'true');
									} else {
										if (typeOptionsProperty.value.properties.length > 0) {
											const lastProperty =
												typeOptionsProperty.value.properties[
													typeOptionsProperty.value.properties.length - 1
												];
											if (!lastProperty) return null;
											return fixer.insertTextAfter(lastProperty, ', password: true');
										} else {
											const openBrace = typeOptionsProperty.value.range![0] + 1;
											return fixer.insertTextAfterRange([openBrace, openBrace], ' password: true ');
										}
									}
								} else {
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
