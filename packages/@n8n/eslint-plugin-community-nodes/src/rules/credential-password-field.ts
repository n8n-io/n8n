import { ESLintUtils } from '@typescript-eslint/utils';
import {
	isCredentialTypeClass,
	findClassProperty,
	findObjectProperty,
	getStringLiteralValue,
	getBooleanLiteralValue,
} from '../utils/index.js';

const SENSITIVE_PATTERNS = [
	'password',
	'secret',
	'token',
	'cert',
	'passphrase',
	'apikey',
	'secretkey',
	'privatekey',
	'authkey',
];

const NON_SENSITIVE_PATTERNS = ['url', 'pub', 'id'];

function isSensitiveFieldName(name: string): boolean {
	const lowerName = name.toLowerCase();

	if (NON_SENSITIVE_PATTERNS.some((pattern) => lowerName.includes(pattern))) {
		return false;
	}

	return SENSITIVE_PATTERNS.some((pattern) => lowerName.includes(pattern));
}

function hasPasswordTypeOption(element: any): boolean {
	const typeOptionsProperty = findObjectProperty(element, 'typeOptions');

	if (typeOptionsProperty?.value?.type !== 'ObjectExpression') {
		return false;
	}

	const passwordProperty = findObjectProperty(typeOptionsProperty.value, 'password');
	const passwordValue = passwordProperty ? getBooleanLiteralValue(passwordProperty.value) : null;

	return passwordValue === true;
}

function createPasswordFix(element: any, typeOptionsProperty: any) {
	return function (fixer: any) {
		if (typeOptionsProperty?.value?.type === 'ObjectExpression') {
			const passwordProperty = findObjectProperty(typeOptionsProperty.value, 'password');

			if (passwordProperty) {
				return fixer.replaceText(passwordProperty.value, 'true');
			}

			if (typeOptionsProperty.value.properties.length > 0) {
				const lastProperty =
					typeOptionsProperty.value.properties[typeOptionsProperty.value.properties.length - 1];
				return lastProperty ? fixer.insertTextAfter(lastProperty, ', password: true') : null;
			} else {
				const openBrace = typeOptionsProperty.value.range![0] + 1;
				return fixer.insertTextAfterRange([openBrace, openBrace], ' password: true ');
			}
		}

		const lastProperty = element.properties[element.properties.length - 1];
		return fixer.insertTextAfter(lastProperty, ',\n\t\t\ttypeOptions: { password: true }');
	};
}

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

				for (const element of propertiesProperty.value.elements) {
					if (element?.type !== 'ObjectExpression') {
						continue;
					}

					const nameProperty = findObjectProperty(element, 'name');
					const fieldName = nameProperty ? getStringLiteralValue(nameProperty.value) : null;

					if (!fieldName || !isSensitiveFieldName(fieldName)) {
						continue;
					}

					if (!hasPasswordTypeOption(element)) {
						const typeOptionsProperty = findObjectProperty(element, 'typeOptions');

						context.report({
							node: element,
							messageId: 'missingPasswordOption',
							data: { fieldName },
							fix: createPasswordFix(element, typeOptionsProperty),
						});
					}
				}
			},
		};
	},
});
