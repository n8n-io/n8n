import { TSESTree } from '@typescript-eslint/utils';
import type { ReportFixFunction } from '@typescript-eslint/utils/ts-eslint';

import {
	isCredentialTypeClass,
	findClassProperty,
	findObjectProperty,
	getStringLiteralValue,
	isSensitiveFieldName,
	hasPasswordTypeOption,
	createRule,
} from '../utils/index.js';

function createPasswordFix(
	element: TSESTree.ObjectExpression,
	typeOptionsProperty: TSESTree.Property | null,
): ReportFixFunction {
	return (fixer) => {
		if (typeOptionsProperty?.value.type === TSESTree.AST_NODE_TYPES.ObjectExpression) {
			const passwordProperty = findObjectProperty(typeOptionsProperty.value, 'password');

			if (passwordProperty) {
				return fixer.replaceText(passwordProperty.value, 'true');
			}

			const objectValue = typeOptionsProperty.value;
			if (objectValue.properties.length > 0) {
				const lastProperty = objectValue.properties[objectValue.properties.length - 1];
				if (lastProperty) {
					return fixer.insertTextAfter(lastProperty, ', password: true');
				}
			} else {
				const range = objectValue.range;
				if (range) {
					const openBrace = range[0] + 1;
					return fixer.insertTextAfterRange([openBrace, openBrace], ' password: true ');
				}
			}
		}

		const lastProperty = element.properties[element.properties.length - 1];
		if (lastProperty) {
			return fixer.insertTextAfter(lastProperty, ',\n\t\t\ttypeOptions: { password: true }');
		}
		return null;
	};
}

export const CredentialPasswordFieldRule = createRule({
	name: 'credential-password-field',
	meta: {
		type: 'problem',
		docs: {
			description: 'Ensure fields with sensitive names have typeOptions.password = true',
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
				if (
					!propertiesProperty?.value ||
					propertiesProperty.value.type !== TSESTree.AST_NODE_TYPES.ArrayExpression
				) {
					return;
				}

				for (const element of propertiesProperty.value.elements) {
					if (element?.type !== TSESTree.AST_NODE_TYPES.ObjectExpression) {
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
