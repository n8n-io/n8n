import { ESLintUtils, TSESTree } from '@typescript-eslint/utils';
import type { RuleListener } from '@typescript-eslint/utils/ts-eslint';

const ELEMENT_PLUS = 'element-plus';

type TemplateElement = TSESTree.Node & { rawName?: string };

type VueParserServices = {
	defineTemplateBodyVisitor: (
		templateBodyVisitor: { VElement(node: TemplateElement): void },
		scriptVisitor: RuleListener,
	) => RuleListener;
};

const isVueParserServices = (services: unknown): services is VueParserServices => {
	if (typeof services !== 'object' || services === null) return false;

	return (
		'defineTemplateBodyVisitor' in services &&
		typeof services.defineTemplateBodyVisitor === 'function'
	);
};

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
	 * Files under this path may still use the component.
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

			const scriptVisitor: RuleListener = {
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
			};

			// ESLint traverses the script AST only.
			// vue-eslint-parser reports template tags through defineTemplateBodyVisitor.
			const services = context.sourceCode.parserServices;
			if (templateNames.size === 0 || !isVueParserServices(services)) return scriptVisitor;

			return services.defineTemplateBodyVisitor(
				{
					VElement(node) {
						const name = node.rawName;
						if (name !== undefined && templateNames.has(name)) report(node, name);
					},
				},
				scriptVisitor,
			);
		},
	});
}
