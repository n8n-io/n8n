import { ESLintUtils } from '@typescript-eslint/utils';

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
		return {
			MemberExpression(node) {
				if (
					node.property.type === 'Identifier' &&
					DEPRECATED_FUNCTIONS.hasOwnProperty(node.property.name)
				) {
					const functionName = node.property.name as keyof typeof DEPRECATED_FUNCTIONS;
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
					DEPRECATED_TYPES.hasOwnProperty(node.typeName.name)
				) {
					const typeName = node.typeName.name as keyof typeof DEPRECATED_TYPES;
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
				if (
					node.imported.type === 'Identifier' &&
					DEPRECATED_TYPES.hasOwnProperty(node.imported.name)
				) {
					const typeName = node.imported.name as keyof typeof DEPRECATED_TYPES;
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

			CallExpression(node) {
				if (
					node.callee.type === 'Identifier' &&
					DEPRECATED_FUNCTIONS.hasOwnProperty(node.callee.name)
				) {
					const functionName = node.callee.name as keyof typeof DEPRECATED_FUNCTIONS;
					const replacement = DEPRECATED_FUNCTIONS[functionName];

					if (replacement) {
						context.report({
							node: node.callee,
							messageId: 'deprecatedRequestFunction',
							data: {
								functionName,
								replacement,
							},
						});
					} else {
						context.report({
							node: node.callee,
							messageId: 'deprecatedWithoutReplacement',
							data: {
								functionName,
							},
						});
					}
				}
			},
		};
	},
});

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
