import { ESLintUtils, TSESTree } from '@typescript-eslint/utils';

const REKA_UI = 'reka-ui';

type RekaUiImportBanConfig<TMessageId extends string> = {
	/** Export-name prefix to ban, for example `ContextMenu` or `Pagination`. */
	prefix: string;
	/** Files under this path may import the primitives. The wrapper lives here. */
	allowedPath: RegExp;
	/** Stable message id. Tests and lint output depend on it. */
	messageId: TMessageId;
	description: string;
	/** Design-system component callers should use instead. */
	replacement: string;
};

const getModuleName = (node: TSESTree.Identifier | TSESTree.StringLiteral): string =>
	node.type === TSESTree.AST_NODE_TYPES.Identifier ? node.name : node.value;

/**
 * Both Reka UI import bans visit imports the same way. A fix to that visit
 * belongs here, not in each rule file.
 */
export function createRekaUiImportBanRule<const TMessageId extends string>(
	config: RekaUiImportBanConfig<TMessageId>,
) {
	const isBannedExport = (name: string): boolean => name.startsWith(config.prefix);
	const messages = {
		[config.messageId]: `Do not import \`{{name}}\` from \`reka-ui\`. Use \`${config.replacement}\` from \`@n8n/design-system\` instead.`,
	} as { [K in TMessageId]: string };

	return ESLintUtils.RuleCreator.withoutDocs({
		meta: {
			type: 'problem',
			docs: {
				description: config.description,
			},
			messages,
			schema: [],
		},
		defaultOptions: [],
		create(context) {
			if (config.allowedPath.test(context.filename)) {
				return {};
			}

			const reportIfBanned = (node: TSESTree.Node, name: string) => {
				if (!isBannedExport(name)) return;
				context.report({
					node,
					messageId: config.messageId,
					data: { name },
				});
			};

			return {
				ImportDeclaration(node) {
					if (node.source.value !== REKA_UI) return;

					for (const specifier of node.specifiers) {
						if (specifier.type !== TSESTree.AST_NODE_TYPES.ImportSpecifier) continue;
						reportIfBanned(specifier, getModuleName(specifier.imported));
					}
				},
				ExportNamedDeclaration(node) {
					if (!node.source || node.source.value !== REKA_UI) return;

					for (const specifier of node.specifiers) {
						reportIfBanned(specifier, getModuleName(specifier.local));
					}
				},
			};
		},
	});
}
