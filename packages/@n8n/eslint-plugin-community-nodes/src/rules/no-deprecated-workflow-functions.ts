import { ESLintUtils, TSESTree } from '@typescript-eslint/utils';

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

export const NoDeprecatedWorkflowFunctionsRule = ESLintUtils.RuleCreator.withoutDocs({
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
		},
		schema: [],
	},
	defaultOptions: [],
	create(context) {
		const n8nWorkflowTypes = new Set<string>();

		return {
			ImportDeclaration(node) {
				if (node.source.value === 'n8n-workflow') {
					node.specifiers.forEach((specifier) => {
						if (specifier.type === 'ImportSpecifier' && specifier.imported.type === 'Identifier') {
							n8nWorkflowTypes.add(specifier.local.name);
						}
					});
				}
			},

			MemberExpression(node) {
				if (node.property.type === 'Identifier' && isDeprecatedFunctionName(node.property.name)) {
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
					node.typeName.type === 'Identifier' &&
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
					});
				}
			},

			ImportSpecifier(node) {
				// Check if this import is from n8n-workflow by looking at the parent ImportDeclaration
				const importDeclaration = node.parent;
				if (
					importDeclaration?.type === 'ImportDeclaration' &&
					importDeclaration.source.value === 'n8n-workflow' &&
					node.imported.type === 'Identifier' &&
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
	if (node.object?.type === 'MemberExpression') {
		const outerObject = node.object;
		return (
			outerObject.object?.type === 'ThisExpression' &&
			outerObject.property?.type === 'Identifier' &&
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
