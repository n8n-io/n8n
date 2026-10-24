import { ESLintUtils, TSESTree } from '@typescript-eslint/utils';

const REKA_UI = 'reka-ui';

type RekaUiImportBanConfig<TMessageId extends string> = {
	/**
	 * Export-name prefix to ban, or several related prefixes.
	 * `Dialog` does not match `AlertDialog`, so the dialog ban passes both.
	 */
	prefix: string | readonly string[];
	/** Files under this path may import the primitives. The wrapper lives here. */
	allowedPath: RegExp;
	/** Stable message id. Tests and lint output depend on it. */
	messageId: TMessageId;
	description: string;
	/**
	 * Design-system component callers should use instead.
	 * Pass a list when more than one wrapper replaces the primitives.
	 */
	replacement: string | readonly string[];
};

const getModuleName = (node: TSESTree.Identifier | TSESTree.StringLiteral): string =>
	node.type === TSESTree.AST_NODE_TYPES.Identifier ? node.name : node.value;

const asList = (value: string | readonly string[]): readonly string[] =>
	typeof value === 'string' ? [value] : value;

const formatReplacement = (replacement: string | readonly string[]): string =>
	asList(replacement)
		.map((name) => `\`${name}\``)
		.join(' or ');

/**
 * Reka UI import bans visit imports the same way. A fix to that visit
 * belongs here, not in each rule file.
 *
 * Add a ban with a thin rule file: pick the export prefix, the wrapper
 * path, and the design-system component that replaces it.
 */
export function createRekaUiImportBanRule<const TMessageId extends string>(
	config: RekaUiImportBanConfig<TMessageId>,
) {
	const prefixes = asList(config.prefix);
	const isBannedExport = (name: string): boolean =>
		prefixes.some((prefix) => name.startsWith(prefix));
	const messages = {
		[config.messageId]: `Do not import \`{{name}}\` from \`reka-ui\`. Use ${formatReplacement(config.replacement)} from \`@n8n/design-system\` instead.`,
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
