import { TSESTree } from '@typescript-eslint/utils';

import {
	isCredentialTypeClass,
	findClassProperty,
	findObjectProperty,
	getStringLiteralValue,
	isSensitiveName,
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
					// We check with `exclusions: []` (raw patterns, no URL/ID/pub exclusions) so a
					// real secret like `androidToken` — non-sensitive under the default exclusions
					// only because it contains the substring `id` — is not wrongly flagged.
					// Reported without a fix: removing masking could still be wrong for an
					// unlisted secret name, so the author confirms.
					if (!isSensitiveName(fieldName, { exclusions: [] })) {
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
