import type { TSESTree } from '@typescript-eslint/utils';
import { AST_NODE_TYPES } from '@typescript-eslint/utils';

import {
	createRule,
	findClassProperty,
	getStringLiteralValue,
	isCredentialTypeClass,
	isFileType,
} from '../utils/index.js';

const OAUTH2_PATTERN = /oauth2/i;

function containsOAuth2(value: string): boolean {
	return OAUTH2_PATTERN.test(value);
}

function getExtendsArrayValues(node: TSESTree.PropertyDefinition): string[] {
	if (node.value?.type !== AST_NODE_TYPES.ArrayExpression) return [];
	const values: string[] = [];
	for (const element of node.value.elements) {
		const value = element ? getStringLiteralValue(element) : null;
		if (value !== null) values.push(value);
	}
	return values;
}

function suggestOAuth2ApiName(className: string): string {
	if (className.endsWith('Api')) {
		return `${className.slice(0, -'Api'.length)}OAuth2Api`;
	}
	return `${className}OAuth2Api`;
}

export const CredClassOAuth2NamingRule = createRule({
	name: 'cred-class-oauth2-naming',
	meta: {
		type: 'problem',
		docs: {
			description:
				'OAuth2 credentials must include `OAuth2` in the class name, `name`, and `displayName`',
		},
		messages: {
			classNameMissingOAuth2: "OAuth2 credential class name '{{name}}' must end with 'OAuth2Api'",
			nameMissingOAuth2: "OAuth2 credential `name` field '{{value}}' must contain 'OAuth2'",
			displayNameMissingOAuth2:
				"OAuth2 credential `displayName` field '{{value}}' must contain 'OAuth2'",
		},
		schema: [],
		fixable: 'code',
	},
	defaultOptions: [],
	create(context) {
		if (!isFileType(context.filename, '.credentials.ts')) {
			return {};
		}

		return {
			ClassDeclaration(node) {
				if (!isCredentialTypeClass(node)) return;
				if (!node.id) return;

				const className = node.id.name;
				const superClassName =
					node.superClass?.type === AST_NODE_TYPES.Identifier ? node.superClass.name : null;

				const nameProperty = findClassProperty(node, 'name');
				const nameValue = nameProperty?.value ? getStringLiteralValue(nameProperty.value) : null;

				const displayNameProperty = findClassProperty(node, 'displayName');
				const displayNameValue = displayNameProperty?.value
					? getStringLiteralValue(displayNameProperty.value)
					: null;

				const extendsProperty = findClassProperty(node, 'extends');
				const extendsValues = extendsProperty ? getExtendsArrayValues(extendsProperty) : [];

				const isOAuth2Credential =
					containsOAuth2(className) ||
					(superClassName !== null && containsOAuth2(superClassName)) ||
					extendsValues.some(containsOAuth2) ||
					(nameValue !== null && containsOAuth2(nameValue)) ||
					(displayNameValue !== null && containsOAuth2(displayNameValue));

				if (!isOAuth2Credential) return;

				if (!className.endsWith('OAuth2Api')) {
					const fixedClassName = suggestOAuth2ApiName(className);

					context.report({
						node: node.id,
						messageId: 'classNameMissingOAuth2',
						data: { name: className },
						fix(fixer) {
							return fixer.replaceText(node.id!, fixedClassName);
						},
					});
				}

				if (nameValue !== null && !containsOAuth2(nameValue)) {
					context.report({
						node: nameProperty!.value!,
						messageId: 'nameMissingOAuth2',
						data: { value: nameValue },
					});
				}

				if (displayNameValue !== null && !containsOAuth2(displayNameValue)) {
					context.report({
						node: displayNameProperty!.value!,
						messageId: 'displayNameMissingOAuth2',
						data: { value: displayNameValue },
					});
				}
			},
		};
	},
});
