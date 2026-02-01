import type { TSESTree } from '@typescript-eslint/utils';
import { AST_NODE_TYPES } from '@typescript-eslint/utils';

import { createRule } from '../utils/index.js';

const DEPRECATED_FUNCTIONS = {
	request: 'httpRequest',
	requestWithAuthentication: 'httpRequestWithAuthentication',
	requestOAuth1: 'httpRequestWithAuthentication',
	requestOAuth2: 'httpRequestWithAuthentication',
	copyBinaryFile: null,
	prepareOutputData: null,
} as const;

const DEPRECATED_TYPES = {
	IRequestOptions: 'IHttpRequestOptions',
} as const;

function isDeprecatedFunctionName(name: string): name is keyof typeof DEPRECATED_FUNCTIONS {
	return name in DEPRECATED_FUNCTIONS;
}

function isDeprecatedTypeName(name: string): name is keyof typeof DEPRECATED_TYPES {
	return name in DEPRECATED_TYPES;
}

export const NoDeprecatedWorkflowFunctionsRule = createRule({
	name: 'no-deprecated-workflow-functions',
	meta: {
		type: 'problem',
		docs: {
			description: 'Disallow usage of deprecated functions and types from n8n-workflow package',
		},
		messages: {
			deprecatedRequestFunction:
				"'{{ functionName }}' is deprecated. Use '{{ replacement }}' instead for better authentication support and consistency.",
			deprecatedFunction: "'{{ functionName }}' is deprecated and should be avoided. {{ message }}",
			deprecatedType: "'{{ typeName }}' is deprecated. Use '{{ replacement }}' instead.",
			deprecatedWithoutReplacement:
				"'{{ functionName }}' is deprecated and should be removed or replaced with alternative implementation.",
			suggestReplaceFunction: "Replace '{{ functionName }}' with '{{ replacement }}'",
			suggestReplaceType: "Replace '{{ typeName }}' with '{{ replacement }}'",
		},
		schema: [],
		hasSuggestions: true,
	},
	defaultOptions: [],
	create(context) {
		const n8nWorkflowTypes = new Set<string>();

		return {
			ImportDeclaration(node) {
				if (node.source.value === 'n8n-workflow') {
					node.specifiers.forEach((specifier) => {
						if (
							specifier.type === AST_NODE_TYPES.ImportSpecifier &&
							specifier.imported.type === AST_NODE_TYPES.Identifier
						) {
							n8nWorkflowTypes.add(specifier.local.name);
						}
					});
				}
			},

			MemberExpression(node) {
				if (
					node.property.type === AST_NODE_TYPES.Identifier &&
					isDeprecatedFunctionName(node.property.name)
				) {
					if (!isThisHelpersAccess(node)) {
						return;
					}

					const functionName = node.property.name;
					const replacement = DEPRECATED_FUNCTIONS[functionName];

					if (replacement) {
						const messageId = functionName.includes('request')
							? 'deprecatedRequestFunction'
							: 'deprecatedFunction';

						context.report({
							node: node.property,
							messageId,
							data: {
								functionName,
								replacement,
								message: getDeprecationMessage(functionName),
							},
							suggest: [
								{
									messageId: 'suggestReplaceFunction',
									data: { functionName, replacement },
									fix: (fixer) => fixer.replaceText(node.property, replacement),
								},
							],
						});
					} else {
						context.report({
							node: node.property,
							messageId: 'deprecatedWithoutReplacement',
							data: {
								functionName,
							},
						});
					}
				}
			},

			TSTypeReference(node) {
				if (
					node.typeName.type === AST_NODE_TYPES.Identifier &&
					isDeprecatedTypeName(node.typeName.name) &&
					n8nWorkflowTypes.has(node.typeName.name)
				) {
					const typeName = node.typeName.name;
					const replacement = DEPRECATED_TYPES[typeName];

					context.report({
						node: node.typeName,
						messageId: 'deprecatedType',
						data: {
							typeName,
							replacement,
						},
						suggest: [
							{
								messageId: 'suggestReplaceType',
								data: { typeName, replacement },
								fix: (fixer) => fixer.replaceText(node.typeName, replacement),
							},
						],
					});
				}
			},

			ImportSpecifier(node) {
				// Check if this import is from n8n-workflow by looking at the parent ImportDeclaration
				const importDeclaration = node.parent;
				if (
					importDeclaration?.type === AST_NODE_TYPES.ImportDeclaration &&
					importDeclaration.source.value === 'n8n-workflow' &&
					node.imported.type === AST_NODE_TYPES.Identifier &&
					isDeprecatedTypeName(node.imported.name)
				) {
					const typeName = node.imported.name;
					const replacement = DEPRECATED_TYPES[typeName];

					context.report({
						node: node.imported,
						messageId: 'deprecatedType',
						data: {
							typeName,
							replacement,
						},
						suggest: [
							{
								messageId: 'suggestReplaceType',
								data: { typeName, replacement },
								fix: (fixer) => fixer.replaceText(node.imported, replacement),
							},
						],
					});
				}
			},
		};
	},
});

/**
 * Check if the MemberExpression follows the this.helpers.* pattern
 */
function isThisHelpersAccess(node: TSESTree.MemberExpression): boolean {
	if (node.object?.type === AST_NODE_TYPES.MemberExpression) {
		const outerObject = node.object;
		return (
			outerObject.object?.type === AST_NODE_TYPES.ThisExpression &&
			outerObject.property?.type === AST_NODE_TYPES.Identifier &&
			outerObject.property.name === 'helpers'
		);
	}
	return false;
}

function getDeprecationMessage(functionName: string): string {
	switch (functionName) {
		case 'request':
			return 'Use httpRequest for better type safety and consistency.';
		case 'requestWithAuthentication':
		case 'requestOAuth1':
		case 'requestOAuth2':
			return 'Use httpRequestWithAuthentication which provides unified authentication handling.';
		case 'copyBinaryFile':
			return 'This function has been removed. Handle binary data directly.';
		case 'prepareOutputData':
			return 'This function is deprecated. Return data directly from execute method.';
		default:
			return 'This function is deprecated and should be avoided.';
	}
}
