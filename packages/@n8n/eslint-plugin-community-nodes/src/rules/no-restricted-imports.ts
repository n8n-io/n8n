import { ESLintUtils } from '@typescript-eslint/utils';
import { getModulePath, isDirectRequireCall, isRequireMemberCall } from '../utils/index.js';

const allowedModules = [
	'n8n-workflow',
	'lodash',
	'moment',
	'p-limit',
	'luxon',
	'zod',
	'crypto',
	'node:crypto',
];

const isModuleAllowed = (modulePath: string): boolean => {
	if (modulePath.startsWith('./') || modulePath.startsWith('../')) return true;

	const moduleName = modulePath.startsWith('@')
		? modulePath.split('/').slice(0, 2).join('/')
		: modulePath.split('/')[0];
	if (!moduleName) return true;
	return allowedModules.includes(moduleName);
};

export const NoRestrictedImportsRule = ESLintUtils.RuleCreator.withoutDocs({
	meta: {
		type: 'problem',
		docs: {
			description: 'Disallow usage of restricted imports in community nodes.',
		},
		messages: {
			restrictedImport:
				"Import of '{{ modulePath }}' is not allowed. n8n Cloud does not allow community nodes with dependencies.",
			restrictedRequire:
				"Require of '{{ modulePath }}' is not allowed. n8n Cloud does not allow community nodes with dependencies.",
			restrictedDynamicImport:
				"Dynamic import of '{{ modulePath }}' is not allowed. n8n Cloud does not allow community nodes with dependencies.",
		},
		schema: [],
	},
	defaultOptions: [],
	create(context) {
		return {
			ImportDeclaration(node) {
				const modulePath = getModulePath(node.source);
				if (modulePath && !isModuleAllowed(modulePath)) {
					context.report({
						node,
						messageId: 'restrictedImport',
						data: {
							modulePath,
						},
					});
				}
			},

			ImportExpression(node) {
				const modulePath = getModulePath(node.source);
				if (modulePath && !isModuleAllowed(modulePath)) {
					context.report({
						node,
						messageId: 'restrictedDynamicImport',
						data: {
							modulePath,
						},
					});
				}
			},

			CallExpression(node) {
				if (isDirectRequireCall(node) || isRequireMemberCall(node)) {
					const modulePath = getModulePath(node.arguments[0] ?? null);
					if (modulePath && !isModuleAllowed(modulePath)) {
						context.report({
							node,
							messageId: 'restrictedRequire',
							data: {
								modulePath,
							},
						});
					}
				}
			},
		};
	},
});
