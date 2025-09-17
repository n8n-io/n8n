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
	if (modulePath.startsWith('./') || modulePath.startsWith('../')) return true;

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
