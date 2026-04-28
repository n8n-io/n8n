import type { TSESTree } from '@typescript-eslint/utils';
import { AST_NODE_TYPES } from '@typescript-eslint/utils';

import {
	createRule,
	isCredentialTypeClass,
	findClassProperty,
	getStringLiteralValue,
} from '../utils/index.js';

export const CredClassFieldNamingRule = createRule({
	name: 'cred-class-field-naming',
	meta: {
		type: 'problem',
		docs: {
			description:
				'Credential class `name` and `displayName` fields must follow naming conventions',
		},
		messages: {
			nameUnsuffixed: 'Credential `name` field "{{value}}" must end with "Api"',
			nameMissingOAuth2:
				'Credential `name` field "{{value}}" must contain "OAuth2" because the class name contains "OAuth2"',
			displayNameMiscased:
				'Credential `displayName` field "{{value}}" must start with an uppercase letter',
			displayNameMissingApi:
				'Credential `displayName` field "{{value}}" must use "API" instead of "Api"',
			displayNameMissingOAuth2:
				'Credential `displayName` field "{{value}}" must contain "OAuth2" because the class name contains "OAuth2"',
		},
		schema: [],
	},
	defaultOptions: [],
	create(context) {
		return {
			ClassDeclaration(node: TSESTree.ClassDeclaration) {
				if (!isCredentialTypeClass(node)) return;

				const className = node.id?.type === AST_NODE_TYPES.Identifier ? node.id.name : null;
				if (!className) return;

				const classHasOAuth2 = className.includes('OAuth2');

				// Validate `name` field
				const nameProp = findClassProperty(node, 'name');
				if (nameProp) {
					const nameValue = getStringLiteralValue(nameProp.value ?? null);
					if (nameValue !== null) {
						if (!nameValue.endsWith('Api')) {
							context.report({
								node: nameProp,
								messageId: 'nameUnsuffixed',
								data: { value: nameValue },
							});
						}

						if (classHasOAuth2 && !nameValue.includes('OAuth2')) {
							context.report({
								node: nameProp,
								messageId: 'nameMissingOAuth2',
								data: { value: nameValue },
							});
						}
					}
				}

				// Validate `displayName` field
				const displayNameProp = findClassProperty(node, 'displayName');
				if (displayNameProp) {
					const displayNameValue = getStringLiteralValue(displayNameProp.value ?? null);
					if (displayNameValue !== null) {
						if (
							displayNameValue.length > 0 &&
							displayNameValue[0] !== displayNameValue[0]?.toUpperCase()
						) {
							context.report({
								node: displayNameProp,
								messageId: 'displayNameMiscased',
								data: { value: displayNameValue },
							});
						}

						if (/\bApi\b/.test(displayNameValue)) {
							context.report({
								node: displayNameProp,
								messageId: 'displayNameMissingApi',
								data: { value: displayNameValue },
							});
						}

						if (classHasOAuth2 && !displayNameValue.includes('OAuth2')) {
							context.report({
								node: displayNameProp,
								messageId: 'displayNameMissingOAuth2',
								data: { value: displayNameValue },
							});
						}
					}
				}
			},
		};
	},
});
