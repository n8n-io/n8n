import { ESLintUtils, TSESTree } from '@typescript-eslint/utils';

const REKA_UI = 'reka-ui';

/**
 * Only the design-system context menu may import Reka UI context menu primitives.
 * Consumers must use `N8nContextMenu` from `@n8n/design-system`.
 */
const ALLOWED_PATH = /[/\\]design-system[/\\]src[/\\]components[/\\]N8nContextMenu[/\\]/;

const isContextMenuExport = (name: string): boolean => name.startsWith('ContextMenu');

const getModuleName = (node: TSESTree.Identifier | TSESTree.StringLiteral): string =>
	node.type === TSESTree.AST_NODE_TYPES.Identifier ? node.name : node.value;

export const NoRekaUiContextMenuRule = ESLintUtils.RuleCreator.withoutDocs({
	meta: {
		type: 'problem',
		docs: {
			description:
				'Disallow importing Reka UI context menu primitives outside the N8nContextMenu component. Use N8nContextMenu from @n8n/design-system instead.',
		},
		messages: {
			noRekaUiContextMenu:
				'Do not import `{{name}}` from `reka-ui`. Use `N8nContextMenu` from `@n8n/design-system` instead.',
		},
		schema: [],
	},
	defaultOptions: [],
	create(context) {
		if (ALLOWED_PATH.test(context.filename)) {
			return {};
		}

		const reportIfContextMenu = (node: TSESTree.Node, name: string) => {
			if (!isContextMenuExport(name)) return;
			context.report({
				node,
				messageId: 'noRekaUiContextMenu',
				data: { name },
			});
		};

		return {
			ImportDeclaration(node) {
				if (node.source.value !== REKA_UI) return;

				for (const specifier of node.specifiers) {
					if (specifier.type !== TSESTree.AST_NODE_TYPES.ImportSpecifier) continue;
					reportIfContextMenu(specifier, getModuleName(specifier.imported));
				}
			},
			ExportNamedDeclaration(node) {
				if (!node.source || node.source.value !== REKA_UI) return;

				for (const specifier of node.specifiers) {
					reportIfContextMenu(specifier, getModuleName(specifier.local));
				}
			},
		};
	},
});
