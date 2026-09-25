import { AST_NODE_TYPES, type TSESTree } from '@typescript-eslint/utils';

import { createRule, isThisHelpersAccess } from '../utils/index.js';

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

const EXECUTION_CONTEXT_TYPES = new Set([
	'IAllExecuteFunctions',
	'ICredentialTestFunctions',
	'IExecuteFunctions',
	'IExecutePaginationFunctions',
	'IExecuteSingleFunctions',
	'IHookFunctions',
	'ILoadOptionsFunctions',
	'IPollFunctions',
	'ISupplyDataFunctions',
	'ITriggerFunctions',
	'IWebhookFunctions',
]);

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
		const executionContextTypes = new Set<string>();

		const isExecutionContextIdentifier = (node: TSESTree.Identifier): boolean => {
			const type = node.typeAnnotation?.typeAnnotation;
			return (
				type?.type === AST_NODE_TYPES.TSTypeReference &&
				type.typeName.type === AST_NODE_TYPES.Identifier &&
				executionContextTypes.has(type.typeName.name)
			);
		};

		const isExecutionContextReference = (node: TSESTree.Identifier): boolean => {
			const scope = context.sourceCode.getScope(node);
			const reference = scope.references.find(({ identifier }) => identifier === node);

			return (
				reference?.resolved?.defs.some(
					({ name }) =>
						name.type === AST_NODE_TYPES.Identifier && isExecutionContextIdentifier(name),
				) ?? false
			);
		};

		const isTypedThisExpression = (node: TSESTree.ThisExpression): boolean => {
			let parent: TSESTree.Node | undefined = node.parent;
			while (parent) {
				if (
					parent.type === AST_NODE_TYPES.FunctionDeclaration ||
					parent.type === AST_NODE_TYPES.FunctionExpression
				) {
					return parent.params.some(
						(parameter) =>
							parameter.type === AST_NODE_TYPES.Identifier &&
							parameter.name === 'this' &&
							isExecutionContextIdentifier(parameter),
					);
				}
				parent = parent.parent;
			}
			return false;
		};

		const isExecutionContextExpression = (node: TSESTree.Expression): boolean =>
			(node.type === AST_NODE_TYPES.Identifier && isExecutionContextReference(node)) ||
			(node.type === AST_NODE_TYPES.ThisExpression && isTypedThisExpression(node));

		const isDestructuredHelpersReference = (node: TSESTree.Identifier): boolean => {
			const scope = context.sourceCode.getScope(node);
			const reference = scope.references.find(({ identifier }) => identifier === node);

			return (
				reference?.resolved?.defs.some(({ node: definition }) => {
					if (
						definition.type !== AST_NODE_TYPES.VariableDeclarator ||
						definition.id.type !== AST_NODE_TYPES.ObjectPattern ||
						!definition.init ||
						!isExecutionContextExpression(definition.init)
					) {
						return false;
					}

					return definition.id.properties.some(
						(property) =>
							property.type === AST_NODE_TYPES.Property &&
							property.key.type === AST_NODE_TYPES.Identifier &&
							property.key.name === 'helpers' &&
							property.value.type === AST_NODE_TYPES.Identifier &&
							property.value.name === node.name,
					);
				}) ?? false
			);
		};

		const isHelpersAccess = (node: TSESTree.MemberExpression): boolean => {
			if (isThisHelpersAccess(node)) return true;

			if (node.object.type === AST_NODE_TYPES.Identifier) {
				return isDestructuredHelpersReference(node.object);
			}

			return (
				node.object.type === AST_NODE_TYPES.MemberExpression &&
				node.object.property.type === AST_NODE_TYPES.Identifier &&
				node.object.property.name === 'helpers' &&
				isExecutionContextExpression(node.object.object)
			);
		};

		return {
			ImportDeclaration(node) {
				if (node.source.value === 'n8n-workflow') {
					node.specifiers.forEach((specifier) => {
						if (
							specifier.type === AST_NODE_TYPES.ImportSpecifier &&
							specifier.imported.type === AST_NODE_TYPES.Identifier
						) {
							n8nWorkflowTypes.add(specifier.local.name);
							if (EXECUTION_CONTEXT_TYPES.has(specifier.imported.name)) {
								executionContextTypes.add(specifier.local.name);
							}
						}
					});
				}
			},

			MemberExpression(node) {
				if (
					node.property.type === AST_NODE_TYPES.Identifier &&
					isDeprecatedFunctionName(node.property.name)
				) {
					if (!isHelpersAccess(node)) {
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
