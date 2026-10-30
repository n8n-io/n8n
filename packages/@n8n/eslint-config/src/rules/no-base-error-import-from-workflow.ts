import { ESLintUtils, TSESTree } from '@typescript-eslint/utils';

const BASE_ERROR_SYMBOLS = new Set([
	'BaseError',
	'BaseErrorOptions',
	'UserError',
	'UserErrorOptions',
	'OperationalError',
	'OperationalErrorOptions',
	'UnexpectedError',
	'UnexpectedErrorOptions',
]);

// Community-node code depends only on `n8n-workflow`, which re-exports these errors.
const ALLOWED_PATHS = [
	'/packages/workflow/',
	'/packages/@n8n/node-cli/',
	'/packages/@n8n/create-node/',
	'/packages/@n8n/eslint-plugin-community-nodes/',
];

export const NoBaseErrorImportFromWorkflowRule = ESLintUtils.RuleCreator.withoutDocs({
	meta: {
		type: 'problem',
		docs: {
			description:
				'Disallow importing `BaseError`, `UserError`, `OperationalError`, `UnexpectedError` or their option types from `n8n-workflow`. They live in `@n8n/errors`.',
		},
		messages: {
			importFromErrors:
				'Import `{{ name }}` from `@n8n/errors`, not from `n8n-workflow`. `n8n-workflow` re-exports it only for community nodes.',
		},
		schema: [],
	},
	defaultOptions: [],
	create(context) {
		const filename = context.filename.replace(/\\/g, '/');
		if (ALLOWED_PATHS.some((allowed) => filename.includes(allowed))) return {};

		const check = (
			source: TSESTree.StringLiteral | null,
			specifiers: Array<TSESTree.ImportClause | TSESTree.ExportSpecifier>,
		) => {
			if (source?.value !== 'n8n-workflow') return;

			for (const specifier of specifiers) {
				let name: string | undefined;
				if (specifier.type === TSESTree.AST_NODE_TYPES.ImportSpecifier) {
					name =
						specifier.imported.type === TSESTree.AST_NODE_TYPES.Identifier
							? specifier.imported.name
							: specifier.imported.value;
				} else if (specifier.type === TSESTree.AST_NODE_TYPES.ExportSpecifier) {
					name =
						specifier.local.type === TSESTree.AST_NODE_TYPES.Identifier
							? specifier.local.name
							: specifier.local.value;
				}
				if (name && BASE_ERROR_SYMBOLS.has(name)) {
					context.report({ node: specifier, messageId: 'importFromErrors', data: { name } });
				}
			}
		};

		return {
			ImportDeclaration(node) {
				check(node.source, node.specifiers);
			},
			ExportNamedDeclaration(node) {
				check(node.source, node.specifiers);
			},
		};
	},
});
