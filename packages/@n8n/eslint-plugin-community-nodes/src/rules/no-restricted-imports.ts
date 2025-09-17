import { ESLintUtils } from '@typescript-eslint/utils';
import { getStringLiteralValue } from '../utils/index.js';

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
	// Allow relative paths
	if (modulePath.startsWith('./') || modulePath.startsWith('../')) return true;

	// Extract module name from imports that might contain additional path
	const moduleName = modulePath.startsWith('@')
		? modulePath.split('/').slice(0, 2).join('/')
		: modulePath.split('/')[0];
	return allowedModules.includes(moduleName);
};

export const NoRestrictedImportsRule = ESLintUtils.RuleCreator.withoutDocs({
	meta: {
		type: 'problem',
		docs: {
			description: 'Disallow usage of restricted imports in community nodes.',
		},
		messages: {
			restrictedImport: "Import of '{{ modulePath }}' is not allowed.",
			restrictedRequire: "Require of '{{ modulePath }}' is not allowed.",
			restrictedDynamicImport: "Dynamic import of '{{ modulePath }}' is not allowed.",
		},
		schema: [],
	},
	defaultOptions: [],
	create(context) {
		return {
			ImportDeclaration(node) {
				const modulePath = getStringLiteralValue(node.source);
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
				const modulePath = getStringLiteralValue(node.source);
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
				if (
					node.callee.type === 'Identifier' &&
					node.callee.name === 'require' &&
					node.arguments.length > 0
				) {
					const modulePath = getStringLiteralValue(node.arguments[0]);
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
