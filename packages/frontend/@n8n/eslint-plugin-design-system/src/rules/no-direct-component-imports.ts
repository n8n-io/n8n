import { ESLintUtils, TSESTree } from '@typescript-eslint/utils';
import type { RuleListener } from '@typescript-eslint/utils/ts-eslint';

import { designSystemComponentPath } from './design-system-component-path.js';
import {
	allowedElementPlusComponents,
	elementPlusComponentPath,
	elementPlusComponents,
} from './element-plus-components.js';
import { isPendingRekaImport } from './pending-reka-imports.js';
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

const pendingElementPlusNames: ReadonlySet<string> = new Set(allowedElementPlusComponents);
const elementPlusComponentNames: ReadonlySet<string> = new Set(elementPlusComponents);

const elementPlusNameBySegment = elementPlusComponents
	.map((name) => ({ name, segment: elementPlusComponentPath(name) }))
	.sort((left, right) => right.segment.length - left.segment.length);

const directElementPlusTemplateNames = new Map<string, string>();

for (const name of elementPlusComponents) {
	if (pendingElementPlusNames.has(name) || elementPlusByName.has(name)) continue;
	directElementPlusTemplateNames.set(name, name);
	directElementPlusTemplateNames.set(`el-${elementPlusComponentPath(name)}`, name);
}

type ImportDecision =
	| { kind: 'allow' }
	| { kind: 'wrapped'; ban: CompiledBan }
	| { kind: 'direct'; library: 'reka-ui' | 'element-plus'; name: string };

const decideRekaName = (name: string, filename: string): ImportDecision => {
	for (const entry of rekaPrefixes) {
		if (!name.startsWith(entry.prefix)) continue;
		if (entry.ban.allowedPath.test(filename)) return { kind: 'allow' };
		return { kind: 'wrapped', ban: entry.ban };
	}

	if (isPendingRekaImport(name)) return { kind: 'allow' };
	return { kind: 'direct', library: 'reka-ui', name };
};

const decideElementPlusName = (name: string, filename: string): ImportDecision => {
	const ban = elementPlusByName.get(name);
	if (ban !== undefined) {
		if (ban.allowedPath.test(filename)) return { kind: 'allow' };
		return { kind: 'wrapped', ban };
	}

	if (pendingElementPlusNames.has(name)) return { kind: 'allow' };
	if (elementPlusComponentNames.has(name)) return { kind: 'direct', library: 'element-plus', name };
	return { kind: 'allow' };
};

const decideElementPlusModule = (source: string, filename: string): ImportDecision | undefined => {
	if (!source.startsWith(`${ELEMENT_PLUS}/`)) return undefined;

	let wrapped: { ban: CompiledBan; length: number } | undefined;
	for (const ban of compiledBans) {
		if (ban.library !== 'element-plus') continue;
		for (const segment of ban.componentPaths ?? []) {
			if (!matchesComponentPath(source, segment)) continue;
			if (wrapped !== undefined && segment.length <= wrapped.length) continue;
			wrapped = { ban, length: segment.length };
		}
	}

	let component: { name: string; length: number } | undefined;
	for (const entry of elementPlusNameBySegment) {
		if (!matchesComponentPath(source, entry.segment)) continue;
		component = { name: entry.name, length: entry.segment.length };
		break;
	}

	const wrappedWins =
		wrapped !== undefined && (component === undefined || wrapped.length >= component.length);
	if (wrappedWins && wrapped !== undefined) {
		if (wrapped.ban.allowedPath.test(filename)) return { kind: 'allow' };
		return { kind: 'wrapped', ban: wrapped.ban };
	}

	if (component === undefined) return undefined;
	return decideElementPlusName(component.name, filename);
};

const decideTemplateName = (name: string, filename: string): ImportDecision | undefined => {
	const ban = elementPlusByTemplateName.get(name);
	if (ban !== undefined) {
		if (ban.allowedPath.test(filename)) return { kind: 'allow' };
		return { kind: 'wrapped', ban };
	}

	const component = directElementPlusTemplateNames.get(name);
	if (component === undefined) return undefined;
	return { kind: 'direct', library: 'element-plus', name: component };
};

export const NoDirectComponentImportsRule = ESLintUtils.RuleCreator.withoutDocs({
	meta: {
		type: 'problem',
		docs: {
			description:
				'Disallow a direct Reka UI or Element Plus primitive import. A primitive that is not migrated yet stays on the allowlist.',
		},
		messages: {
			noDirectWrappedComponentImport:
				'Do not use `{{name}}` from `{{library}}`. Use {{replacement}} from `@n8n/design-system` instead.',
			noDirectPrimitiveImport:
				'Do not import `{{name}}` from `{{library}}` directly. Add a reusable component in `@n8n/design-system` and use that component.',
		},
		schema: [],
	},
	defaultOptions: [],
	create(context) {
		const report = (node: TSESTree.Node, decision: ImportDecision, fallbackName: string) => {
			if (decision.kind === 'allow') return;
			if (decision.kind === 'wrapped') {
				context.report({
					node,
					messageId: 'noDirectWrappedComponentImport',
					data: {
						name: fallbackName,
						library: decision.ban.library,
						replacement: formatWrappedComponentReplacement(decision.ban.replacement),
					},
				});
				return;
			}

			context.report({
				node,
				messageId: 'noDirectPrimitiveImport',
				data: { name: decision.name, library: decision.library },
			});
		};

		const reportNamed = (node: TSESTree.Node, source: string, name: string) => {
			const decision =
				source === REKA_UI
					? decideRekaName(name, context.filename)
					: source === ELEMENT_PLUS || source.startsWith(`${ELEMENT_PLUS}/`)
						? decideElementPlusName(name, context.filename)
						: undefined;
			if (decision !== undefined) report(node, decision, name);
		};

		// A deep component path names one primitive, so every import and re-export form is reported.
		// Package-root namespace, star, and default forms do not name one primitive and stay out of scope.
		const scriptVisitor: RuleListener = {
			ImportDeclaration(node) {
				const source = node.source.value;
				const moduleDecision = decideElementPlusModule(source, context.filename);
				if (moduleDecision?.kind === 'wrapped' || moduleDecision?.kind === 'direct') {
					report(node, moduleDecision, source);
					return;
				}

				if (source !== REKA_UI && source !== ELEMENT_PLUS && moduleDecision === undefined) return;

				for (const specifier of node.specifiers) {
					if (specifier.type !== TSESTree.AST_NODE_TYPES.ImportSpecifier) continue;
					reportNamed(specifier, source, getModuleName(specifier.imported));
				}
			},
			ExportNamedDeclaration(node) {
				if (!node.source) return;
				const source = node.source.value;
				const moduleDecision = decideElementPlusModule(source, context.filename);
				if (moduleDecision?.kind === 'wrapped' || moduleDecision?.kind === 'direct') {
					report(node, moduleDecision, source);
					return;
				}

				if (source !== REKA_UI && source !== ELEMENT_PLUS && moduleDecision === undefined) return;

				for (const specifier of node.specifiers) {
					reportNamed(specifier, source, getModuleName(specifier.local));
				}
			},
			ExportAllDeclaration(node) {
				const decision = decideElementPlusModule(node.source.value, context.filename);
				if (decision?.kind === 'wrapped' || decision?.kind === 'direct') {
					report(node, decision, node.source.value);
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
					const decision = decideTemplateName(name, context.filename);
					if (decision !== undefined) report(node, decision, name);
				},
			},
			scriptVisitor,
		);
	},
});
