import { ESLintUtils } from '@typescript-eslint/utils';
import {
	isCredentialTypeClass,
	findClassProperty,
	hasArrayLiteralValue,
	isFileType,
} from '../utils/index.js';

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
		if (!isFileType(context.filename, '.credentials.ts')) {
			return {};
		}

		return {
			ClassDeclaration(node) {
				if (!isCredentialTypeClass(node)) {
					return;
				}

				const extendsProperty = findClassProperty(node, 'extends');
				if (extendsProperty && hasArrayLiteralValue(extendsProperty, 'extends', 'oAuth2Api')) {
					return;
				}

				const testProperty = findClassProperty(node, 'test');
				if (!testProperty) {
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
