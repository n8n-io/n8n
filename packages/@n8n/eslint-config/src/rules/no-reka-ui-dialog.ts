import { ESLintUtils, TSESTree } from '@typescript-eslint/utils';

const REKA_UI = 'reka-ui';

/**
 * Only the design-system dialog wrappers may reach Reka UI dialog primitives.
 * Consumers must use `N8nDialog` or `N8nAlertDialog` from `@n8n/design-system`.
 */
const ALLOWED_PATH = /[/\\]design-system[/\\]src[/\\]components[/\\]N8n(?:Dialog|AlertDialog)[/\\]/;

const isDialogExport = (name: string): boolean =>
	name.startsWith('Dialog') || name.startsWith('AlertDialog');

const getModuleName = (node: TSESTree.Identifier | TSESTree.StringLiteral): string =>
	node.type === TSESTree.AST_NODE_TYPES.Identifier ? node.name : node.value;

export const NoRekaUiDialogRule = ESLintUtils.RuleCreator.withoutDocs({
	meta: {
		type: 'problem',
		docs: {
			description:
				'Disallow importing Reka UI dialog primitives outside the design-system dialog components. Use N8nDialog or N8nAlertDialog from @n8n/design-system instead.',
		},
		messages: {
			noRekaUiDialog:
				'Do not import `{{name}}` from `reka-ui`. Use `N8nDialog` or `N8nAlertDialog` from `@n8n/design-system` instead.',
		},
		schema: [],
	},
	defaultOptions: [],
	create(context) {
		if (ALLOWED_PATH.test(context.filename)) {
			return {};
		}

		const reportIfDialog = (node: TSESTree.Node, name: string) => {
			if (!isDialogExport(name)) return;
			context.report({
				node,
				messageId: 'noRekaUiDialog',
				data: { name },
			});
		};

		return {
			ImportDeclaration(node) {
				if (node.source.value !== REKA_UI) return;

				for (const specifier of node.specifiers) {
					if (specifier.type !== TSESTree.AST_NODE_TYPES.ImportSpecifier) continue;
					reportIfDialog(specifier, getModuleName(specifier.imported));
				}
			},
			ExportNamedDeclaration(node) {
				if (!node.source || node.source.value !== REKA_UI) return;

				for (const specifier of node.specifiers) {
					reportIfDialog(specifier, getModuleName(specifier.local));
				}
			},
		};
	},
});
