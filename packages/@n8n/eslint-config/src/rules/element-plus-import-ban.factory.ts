import { ESLintUtils, TSESTree } from '@typescript-eslint/utils';

const ELEMENT_PLUS = 'element-plus';

type TemplateElement = TSESTree.Node & { rawName?: string };

type ElementPlusImportBanConfig<TMessageId extends string> = {
	/** Named exports from `element-plus`, for example `ElDialog`. Match is exact. */
	names?: readonly string[];
	/**
	 * Deep-import path segments under `element-plus/.../components/<segment>`.
	 * `dialog` matches `element-plus/es/components/dialog`.
	 */
	componentPaths?: readonly string[];
	/** Template tags, kebab-case and PascalCase. */
	templateNames?: readonly string[];
	/**
	 * Files under this path may still import the component.
	 * Set it when a design-system wrapper is the only allowed caller.
	 */
	allowedPath?: RegExp;
	/** Stable message id. Tests and lint output depend on it. */
	messageId: TMessageId;
	description: string;
	/** Full lint message. `{{name}}` is the banned export, path, or template tag. */
	message: string;
};

const getModuleName = (node: TSESTree.Identifier | TSESTree.StringLiteral): string =>
	node.type === TSESTree.AST_NODE_TYPES.Identifier ? node.name : node.value;

const matchesComponentPath = (source: string, segment: string): boolean => {
	const marker = `/components/${segment}`;
	const index = source.indexOf(marker);
	if (index === -1) return false;
	const next = source[index + marker.length];
	return next === undefined || next === '/';
};

/**
 * Element Plus import bans visit imports and templates the same way.
 * A fix to that visit belongs here, not in each rule file.
 *
 * Add a ban with a thin rule file, then enable the rule in `frontend.ts`.
 * List the named exports, the deep component path, and the template tags.
 * Leave `allowedPath` unset when the component must disappear everywhere.
 */
export function createElementPlusImportBanRule<const TMessageId extends string>(
	config: ElementPlusImportBanConfig<TMessageId>,
) {
	const names = new Set(config.names ?? []);
	const templateNames = new Set(config.templateNames ?? []);
	const componentPaths = config.componentPaths ?? [];
	const messages = {
		[config.messageId]: config.message,
	} as { [K in TMessageId]: string };

	const isBannedComponentModule = (source: string): boolean =>
		source.startsWith(`${ELEMENT_PLUS}/`) &&
		componentPaths.some((segment) => matchesComponentPath(source, segment));

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
			if (config.allowedPath?.test(context.filename)) {
				return {};
			}

			const report = (node: TSESTree.Node, name: string) => {
				context.report({
					node,
					messageId: config.messageId,
					data: { name },
				});
			};

			return {
				ImportDeclaration(node) {
					const source = node.source.value;
					if (isBannedComponentModule(source)) {
						report(node, source);
						return;
					}
					if (source !== ELEMENT_PLUS) return;

					for (const specifier of node.specifiers) {
						if (specifier.type !== TSESTree.AST_NODE_TYPES.ImportSpecifier) continue;
						const name = getModuleName(specifier.imported);
						if (names.has(name)) report(specifier, name);
					}
				},
				ExportNamedDeclaration(node) {
					if (!node.source) return;
					const source = node.source.value;
					if (isBannedComponentModule(source)) {
						report(node, source);
						return;
					}
					if (source !== ELEMENT_PLUS) return;

					for (const specifier of node.specifiers) {
						const name = getModuleName(specifier.local);
						if (names.has(name)) report(specifier, name);
					}
				},
				// vue-eslint-parser visits template elements.
				VElement(node: TemplateElement) {
					const name = node.rawName;
					if (name !== undefined && templateNames.has(name)) report(node, name);
				},
			};
		},
	});
}
