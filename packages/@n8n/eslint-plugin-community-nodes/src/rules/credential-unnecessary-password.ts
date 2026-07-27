import { TSESTree } from '@typescript-eslint/utils';

import {
	isCredentialTypeClass,
	findClassProperty,
	findObjectProperty,
	getStringLiteralValue,
	containsSensitivePattern,
	hasPasswordTypeOption,
	createRule,
} from '../utils/index.js';

export const CredentialUnnecessaryPasswordRule = createRule({
	name: 'credential-unnecessary-password',
	meta: {
		type: 'suggestion',
		docs: {
			description:
				'Warn when a credential field with no sensitive name uses typeOptions.password = true',
		},
		messages: {
			unnecessaryPasswordOption:
				"Field '{{ fieldName }}' does not appear to be sensitive but uses 'typeOptions: { password: true }'. Remove it unless the field holds a secret",
		},
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

					if (!fieldName || !hasPasswordTypeOption(element)) {
						continue;
					}

					// Only flag a masked field when its name carries no sensitive marker at all.
					// Requiring the *absence* of any sensitive pattern (rather than reusing
					// isSensitiveFieldName) avoids flagging a real secret like `androidToken`,
					// which is classified non-sensitive only because it contains the substring
					// `id`. Reported without a fix: removing masking could still be wrong for an
					// unlisted secret name, so the author confirms.
					if (!containsSensitivePattern(fieldName)) {
						context.report({
							node: element,
							messageId: 'unnecessaryPasswordOption',
							data: { fieldName },
						});
					}
				}
			},
		};
	},
});
