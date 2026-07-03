import { ESLintUtils, TSESTree } from '@typescript-eslint/utils';

const ALLOWED_SOURCE = '@n8n/utils/sleep';

export const NoRestrictedSleepImportRule = ESLintUtils.RuleCreator.withoutDocs({
	meta: {
		type: 'problem',
		docs: {
			description: 'Enforce that `sleep` is only imported from `@n8n/utils/sleep`.',
		},
		messages: {
			noRestrictedSleepImport: 'Import `sleep` from `@n8n/utils/sleep`, not from `{{ source }}`.',
		},
		schema: [],
	},
	defaultOptions: [],
	create(context) {
		return {
			ImportDeclaration(node) {
				const source = node.source.value;
				if (source === ALLOWED_SOURCE) return;

				for (const specifier of node.specifiers) {
					if (
						specifier.type === TSESTree.AST_NODE_TYPES.ImportSpecifier &&
						specifier.imported.type === TSESTree.AST_NODE_TYPES.Identifier &&
						specifier.imported.name === 'sleep'
					) {
						context.report({
							node: specifier,
							messageId: 'noRestrictedSleepImport',
							data: { source },
						});
					}
				}
			},
		};
	},
});
