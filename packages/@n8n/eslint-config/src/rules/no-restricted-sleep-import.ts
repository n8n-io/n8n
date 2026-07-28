import { ESLintUtils, TSESTree } from '@typescript-eslint/utils';

const ALLOWED_SOURCE = '@n8n/utils/sleep';
const RESTRICTED_NAMES = new Set(['sleep', 'sleepWithAbort']);
const CANONICAL_FILE = /\/@n8n\/utils\/src\/sleep\.ts$/;

export const NoRestrictedSleepImportRule = ESLintUtils.RuleCreator.withoutDocs({
	meta: {
		type: 'problem',
		docs: {
			description:
				'Enforce that `sleep` is only imported from `@n8n/utils/sleep`, and that nobody redefines `sleep`/`sleepWithAbort` locally.',
		},
		messages: {
			noRestrictedSleepImport: 'Import `sleep` from `@n8n/utils/sleep`, not from `{{ source }}`.',
			noRestrictedSleepDefinition:
				'Do not define your own `{{ name }}`. Import `sleep` from `@n8n/utils/sleep` instead.',
		},
		schema: [],
	},
	defaultOptions: [],
	create(context) {
		if (CANONICAL_FILE.test(context.filename.replace(/\\/g, '/'))) {
			return {};
		}

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

			FunctionDeclaration(node) {
				if (node.id && RESTRICTED_NAMES.has(node.id.name)) {
					context.report({
						node: node.id,
						messageId: 'noRestrictedSleepDefinition',
						data: { name: node.id.name },
					});
				}
			},

			VariableDeclarator(node) {
				if (
					node.id.type === TSESTree.AST_NODE_TYPES.Identifier &&
					RESTRICTED_NAMES.has(node.id.name)
				) {
					context.report({
						node: node.id,
						messageId: 'noRestrictedSleepDefinition',
						data: { name: node.id.name },
					});
				}
			},
		};
	},
});
