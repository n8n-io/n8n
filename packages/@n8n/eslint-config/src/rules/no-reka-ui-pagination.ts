import { ESLintUtils, TSESTree } from '@typescript-eslint/utils';

const REKA_UI = 'reka-ui';

/**
 * Only the design-system Pagination wrapper may reach Reka UI pagination primitives.
 * Consumers must use `N8nPagination` from `@n8n/design-system`.
 */
const ALLOWED_PATH = /[/\\]design-system[/\\]src[/\\]components[/\\]N8nPagination[/\\]/;

const isPaginationExport = (name: string): boolean => name.startsWith('Pagination');

const getModuleName = (node: TSESTree.Identifier | TSESTree.StringLiteral): string =>
	node.type === TSESTree.AST_NODE_TYPES.Identifier ? node.name : node.value;

export const NoRekaUiPaginationRule = ESLintUtils.RuleCreator.withoutDocs({
	meta: {
		type: 'problem',
		docs: {
			description:
				'Disallow importing Reka UI pagination primitives outside the N8nPagination component. Use N8nPagination from @n8n/design-system instead.',
		},
		messages: {
			noRekaUiPagination:
				'Do not import `{{name}}` from `reka-ui`. Use `N8nPagination` from `@n8n/design-system` instead.',
		},
		schema: [],
	},
	defaultOptions: [],
	create(context) {
		if (ALLOWED_PATH.test(context.filename)) {
			return {};
		}

		const reportIfPagination = (node: TSESTree.Node, name: string) => {
			if (!isPaginationExport(name)) return;
			context.report({
				node,
				messageId: 'noRekaUiPagination',
				data: { name },
			});
		};

		return {
			ImportDeclaration(node) {
				if (node.source.value !== REKA_UI) return;

				for (const specifier of node.specifiers) {
					if (specifier.type !== TSESTree.AST_NODE_TYPES.ImportSpecifier) continue;
					reportIfPagination(specifier, getModuleName(specifier.imported));
				}
			},
			ExportNamedDeclaration(node) {
				if (!node.source || node.source.value !== REKA_UI) return;

				for (const specifier of node.specifiers) {
					reportIfPagination(specifier, getModuleName(specifier.local));
				}
			},
		};
	},
});
