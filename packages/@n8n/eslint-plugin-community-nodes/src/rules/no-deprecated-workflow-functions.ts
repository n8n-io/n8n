import { AST_NODE_TYPES, TSESLint, type TSESTree } from '@typescript-eslint/utils';

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
	'IExecuteFunctions',
	'IExecuteSingleFunctions',
	'IExecutePaginationFunctions',
	'ISupplyDataFunctions',
	'ILoadOptionsFunctions',
	'IPollFunctions',
	'ITriggerFunctions',
	'IHookFunctions',
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

		function isExecutionContextType(type: TSESTree.TSTypeAnnotation | undefined): boolean {
			return (
				type?.typeAnnotation.type === AST_NODE_TYPES.TSTypeReference &&
				type.typeAnnotation.typeName.type === AST_NODE_TYPES.Identifier &&
				executionContextTypes.has(type.typeAnnotation.typeName.name)
			);
		}

		function resolveVariable(node: TSESTree.Identifier): TSESLint.Scope.Variable | undefined {
			let scope: TSESLint.Scope.Scope | null = context.sourceCode.getScope(node);
			while (scope) {
				const variable = scope.set.get(node.name);
				if (variable) return variable;
				scope = scope.upper;
			}
			return undefined;
		}

		function isExecutionContext(
			node: TSESTree.Expression,
			seen: Set<TSESLint.Scope.Variable>,
		): boolean {
			if (node.type === AST_NODE_TYPES.ThisExpression) return true;
			if (node.type !== AST_NODE_TYPES.Identifier) return false;

			const variable = resolveVariable(node);
			if (!variable || seen.has(variable)) return false;
			seen.add(variable);
			return variable.defs.some((def) => {
				if (
					def.name.type === AST_NODE_TYPES.Identifier &&
					isExecutionContextType(def.name.typeAnnotation)
				)
					return true;
				return (
					def.type === TSESLint.Scope.DefinitionType.Variable &&
					def.node.parent.type === AST_NODE_TYPES.VariableDeclaration &&
					def.node.parent.kind === 'const' &&
					def.node.id.type === AST_NODE_TYPES.Identifier &&
					def.node.init !== null &&
					isExecutionContext(def.node.init, seen)
				);
			});
		}

		function isExecutionHelpers(node: TSESTree.MemberExpression): boolean {
			if (isThisHelpersAccess(node)) return true;

			const { object } = node;
			if (
				object.type === AST_NODE_TYPES.MemberExpression &&
				!object.computed &&
				object.property.type === AST_NODE_TYPES.Identifier &&
				object.property.name === 'helpers'
			) {
				return isExecutionContext(object.object, new Set());
			}

			if (object.type !== AST_NODE_TYPES.Identifier) return false;
			const variable = resolveVariable(object);
			return (
				variable?.defs.some(
					(def) =>
						def.type === TSESLint.Scope.DefinitionType.Variable &&
						def.node.parent.type === AST_NODE_TYPES.VariableDeclaration &&
						def.node.parent.kind === 'const' &&
						def.node.id.type === AST_NODE_TYPES.ObjectPattern &&
						def.node.id.properties.some(
							(property) =>
								property.type === AST_NODE_TYPES.Property &&
								!property.computed &&
								property.key.type === AST_NODE_TYPES.Identifier &&
								property.key.name === 'helpers' &&
								property.value === def.name,
						) &&
						def.node.init !== null &&
						isExecutionContext(def.node.init, new Set()),
				) ?? false
			);
		}

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
					if (!isExecutionHelpers(node)) {
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
