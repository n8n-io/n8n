import { ESLintUtils, TSESTree } from '@typescript-eslint/utils';
import type { RuleListener } from '@typescript-eslint/utils/ts-eslint';

import { designSystemComponentPath } from './design-system-component-path.js';
import {
	formatWrappedComponentReplacement,
	wrappedComponentBans,
	type WrappedComponentBan,
} from './wrapped-component-bans.js';

const REKA_UI = 'reka-ui';
const ELEMENT_PLUS = 'element-plus';

type CompiledBan = WrappedComponentBan & { readonly allowedPath: RegExp };

type TemplateElement = TSESTree.Node & { rawName?: string };

type VueParserServices = {
	defineTemplateBodyVisitor: (
		templateBodyVisitor: { VElement(node: TemplateElement): void },
		scriptVisitor: RuleListener,
	) => RuleListener;
};

const compiledBans: readonly CompiledBan[] = wrappedComponentBans.map((ban) => ({
	...ban,
	allowedPath: designSystemComponentPath(...ban.allowedFolders),
}));

/**
 * Longer prefixes are checked first.
 * An allowed longer prefix does not fall through to a shorter one.
 * `AlertDialog` stays distinct from `Dialog`.
 */
const rekaPrefixes = compiledBans
	.filter((ban): ban is CompiledBan & { library: 'reka-ui' } => ban.library === 'reka-ui')
	.flatMap((ban) => ban.prefixes.map((prefix) => ({ ban, prefix })))
	.sort((left, right) => right.prefix.length - left.prefix.length);

const elementPlusByName = new Map<string, CompiledBan>();
const elementPlusByTemplateName = new Map<string, CompiledBan>();

for (const ban of compiledBans) {
	if (ban.library !== 'element-plus') continue;
	for (const name of ban.names ?? []) elementPlusByName.set(name, ban);
	for (const name of ban.templateNames ?? []) elementPlusByTemplateName.set(name, ban);
}

const isVueParserServices = (services: unknown): services is VueParserServices => {
	if (typeof services !== 'object' || services === null) return false;

	return (
		'defineTemplateBodyVisitor' in services &&
		typeof services.defineTemplateBodyVisitor === 'function'
	);
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

const matchRekaExport = (name: string, filename: string): CompiledBan | undefined => {
	for (const entry of rekaPrefixes) {
		if (!name.startsWith(entry.prefix)) continue;
		if (entry.ban.allowedPath.test(filename)) return undefined;
		return entry.ban;
	}
	return undefined;
};

const matchElementPlusName = (name: string, filename: string): CompiledBan | undefined => {
	const ban = elementPlusByName.get(name);
	if (ban === undefined || ban.allowedPath.test(filename)) return undefined;
	return ban;
};

const matchElementPlusModule = (source: string, filename: string): CompiledBan | undefined => {
	if (!source.startsWith(`${ELEMENT_PLUS}/`)) return undefined;

	let best: { ban: CompiledBan; length: number } | undefined;
	for (const ban of compiledBans) {
		if (ban.library !== 'element-plus') continue;
		for (const segment of ban.componentPaths ?? []) {
			if (!matchesComponentPath(source, segment)) continue;
			if (best !== undefined && segment.length <= best.length) continue;
			best = { ban, length: segment.length };
		}
	}

	if (best === undefined || best.ban.allowedPath.test(filename)) return undefined;
	return best.ban;
};

const matchTemplateName = (name: string, filename: string): CompiledBan | undefined => {
	const ban = elementPlusByTemplateName.get(name);
	if (ban === undefined || ban.allowedPath.test(filename)) return undefined;
	return ban;
};

export const NoDirectWrappedComponentImportsRule = ESLintUtils.RuleCreator.withoutDocs({
	meta: {
		type: 'problem',
		docs: {
			description:
				'Disallow direct use of Reka UI and Element Plus primitives that a design-system component already wraps.',
		},
		messages: {
			noDirectWrappedComponentImport:
				'Do not use `{{name}}` from `{{library}}`. Use {{replacement}} from `@n8n/design-system` instead.',
		},
		schema: [],
	},
	defaultOptions: [],
	create(context) {
		const report = (node: TSESTree.Node, ban: CompiledBan, name: string) => {
			context.report({
				node,
				messageId: 'noDirectWrappedComponentImport',
				data: {
					name,
					library: ban.library,
					replacement: formatWrappedComponentReplacement(ban.replacement),
				},
			});
		};

		const scriptVisitor: RuleListener = {
			ImportDeclaration(node) {
				const source = node.source.value;
				const moduleBan = matchElementPlusModule(source, context.filename);
				if (moduleBan !== undefined) {
					report(node, moduleBan, source);
					return;
				}

				for (const specifier of node.specifiers) {
					if (specifier.type !== TSESTree.AST_NODE_TYPES.ImportSpecifier) continue;
					const name = getModuleName(specifier.imported);
					const ban =
						source === REKA_UI
							? matchRekaExport(name, context.filename)
							: source === ELEMENT_PLUS
								? matchElementPlusName(name, context.filename)
								: undefined;
					if (ban !== undefined) report(specifier, ban, name);
				}
			},
			ExportNamedDeclaration(node) {
				if (!node.source) return;
				const source = node.source.value;
				const moduleBan = matchElementPlusModule(source, context.filename);
				if (moduleBan !== undefined) {
					report(node, moduleBan, source);
					return;
				}

				for (const specifier of node.specifiers) {
					const name = getModuleName(specifier.local);
					const ban =
						source === REKA_UI
							? matchRekaExport(name, context.filename)
							: source === ELEMENT_PLUS
								? matchElementPlusName(name, context.filename)
								: undefined;
					if (ban !== undefined) report(specifier, ban, name);
				}
			},
		};

		// ESLint traverses the script AST only.
		// vue-eslint-parser reports template tags through defineTemplateBodyVisitor.
		// Oxlint does not expose that service, so template tags are reported when ESLint runs this rule.
		const services: unknown = context.sourceCode.parserServices;
		if (elementPlusByTemplateName.size === 0 || !isVueParserServices(services)) {
			return scriptVisitor;
		}

		return services.defineTemplateBodyVisitor(
			{
				VElement(node) {
					const name = node.rawName;
					if (name === undefined) return;
					const ban = matchTemplateName(name, context.filename);
					if (ban !== undefined) report(node, ban, name);
				},
			},
			scriptVisitor,
		);
	},
});
