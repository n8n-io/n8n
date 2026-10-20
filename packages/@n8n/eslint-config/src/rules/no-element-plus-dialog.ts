import { ESLintUtils, TSESTree } from '@typescript-eslint/utils';

const ELEMENT_PLUS = 'element-plus';

const isElementPlusDialogModule = (source: string): boolean =>
	source.startsWith(`${ELEMENT_PLUS}/`) && /\/components\/dialog(?:\/|$)/.test(source);

const isElDialogName = (name: string): boolean => name === 'ElDialog';

const getModuleName = (node: TSESTree.Identifier | TSESTree.StringLiteral): string =>
	node.type === TSESTree.AST_NODE_TYPES.Identifier ? node.name : node.value;

export const NoElementPlusDialogRule = ESLintUtils.RuleCreator.withoutDocs({
	meta: {
		type: 'problem',
		docs: {
			description:
				'Disallow Element Plus dialogs. Use N8nDialog or N8nAlertDialog from @n8n/design-system.',
		},
		messages: {
			noElementPlusDialog:
				'Do not use Element Plus `ElDialog`. Use `N8nDialog` or `N8nAlertDialog` from `@n8n/design-system`.',
		},
		schema: [],
	},
	defaultOptions: [],
	create(context) {
		const report = (node: TSESTree.Node) => {
			context.report({ node, messageId: 'noElementPlusDialog' });
		};

		return {
			ImportDeclaration(node) {
				const source = node.source.value;
				if (isElementPlusDialogModule(source)) {
					report(node);
					return;
				}
				if (source !== ELEMENT_PLUS) return;

				for (const specifier of node.specifiers) {
					if (specifier.type !== TSESTree.AST_NODE_TYPES.ImportSpecifier) continue;
					if (isElDialogName(getModuleName(specifier.imported))) report(specifier);
				}
			},
			ExportNamedDeclaration(node) {
				if (!node.source) return;
				const source = node.source.value;
				if (isElementPlusDialogModule(source)) {
					report(node);
					return;
				}
				if (source !== ELEMENT_PLUS) return;

				for (const specifier of node.specifiers) {
					if (isElDialogName(getModuleName(specifier.local))) report(specifier);
				}
			},
			// vue-eslint-parser visits template elements. The dialog component is `el-dialog`.
			VElement(node: TSESTree.Node & { rawName?: string }) {
				if (node.rawName === 'el-dialog' || node.rawName === 'ElDialog') report(node);
			},
		};
	},
});
