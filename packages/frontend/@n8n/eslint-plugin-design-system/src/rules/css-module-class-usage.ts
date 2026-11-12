import { ESLintUtils } from '@typescript-eslint/utils';
import type { TSESTree } from '@typescript-eslint/utils';
import type { RuleListener } from '@typescript-eslint/utils/ts-eslint';

const DEFAULT_MODULE = '$style';
const CLASS_SELECTOR = /(?<![\w-])\.(-?[_a-zA-Z][\w-]*)/g;

type WalkNode = {
	type: string;
	[key: string]: unknown;
};

type StyleChild = {
	type: string;
	value?: string;
	range?: [number, number];
};

type StyleElement = {
	type: 'VElement';
	name: string;
	startTag: {
		attributes: Array<{
			directive: boolean;
			key: { name: string };
			value: { value: string } | null;
		}>;
	};
	children: StyleChild[];
};

type ExpressionContainer = {
	expression: WalkNode | null;
};

type VueParserServices = {
	defineTemplateBodyVisitor: (
		templateBodyVisitor: { VExpressionContainer(node: ExpressionContainer): void },
		scriptVisitor: RuleListener,
		options?: { templateBodyTriggerSelector?: 'Program' | 'Program:exit' },
	) => RuleListener;
	getDocumentFragment?: () => { children: StyleElement[] } | null;
};

type ClassReference = {
	moduleName: string;
	name: string | null;
	node: TSESTree.Node;
	resolved?: boolean;
};

const SKIPPED_KEYS = new Set(['parent', 'tokens', 'comments', 'loc', 'range', 'start', 'end']);

/**
 * Replace comments, strings, and :global blocks with spaces.
 * Indexes stay aligned with the original style text.
 */
function blankIgnoredRegions(css: string): string {
	const out = css.split('');
	const fill = (start: number, end: number) => {
		for (let index = start; index < end; index++) {
			if (out[index] !== '\n') out[index] = ' ';
		}
	};

	let index = 0;
	while (index < css.length) {
		if (css.startsWith('/*', index)) {
			const end = css.indexOf('*/', index + 2);
			const stop = end === -1 ? css.length : end + 2;
			fill(index, stop);
			index = stop;
			continue;
		}

		if (css[index] === '/' && css[index + 1] === '/') {
			let stop = index;
			while (stop < css.length && css[stop] !== '\n') stop++;
			fill(index, stop);
			index = stop;
			continue;
		}

		const quote = css[index];
		if (quote === '"' || quote === "'") {
			let stop = index + 1;
			while (stop < css.length && css[stop] !== quote) {
				stop += css[stop] === '\\' ? 2 : 1;
			}
			if (stop < css.length) stop++;
			fill(index, stop);
			index = stop;
			continue;
		}

		index++;
	}

	const blanked = out.join('');
	index = 0;
	while (index < blanked.length) {
		if (!blanked.startsWith(':global', index)) {
			index++;
			continue;
		}

		let cursor = index + ':global'.length;
		while (cursor < blanked.length && /\s/.test(blanked[cursor] ?? '')) cursor++;
		const open = blanked[cursor];
		if (open !== '(' && open !== '{') {
			index = cursor;
			continue;
		}

		const close = open === '(' ? ')' : '}';
		let depth = 0;
		const start = index;
		do {
			if (blanked[cursor] === open) depth++;
			else if (blanked[cursor] === close) depth--;
			cursor++;
		} while (cursor <= blanked.length && depth > 0);
		fill(start, cursor);
		index = cursor;
	}

	return out.join('');
}

function moduleNameFromStyle(element: StyleElement): string | null {
	if (element.name !== 'style') return null;

	const attribute = element.startTag.attributes.find(
		(candidate) => !candidate.directive && candidate.key.name === 'module',
	);
	if (!attribute) return null;
	if (!attribute.value?.value) return DEFAULT_MODULE;
	return attribute.value.value;
}

function collectDefinedClasses(element: StyleElement): Map<string, number> {
	const classes = new Map<string, number>();

	for (const child of element.children) {
		if (child.type !== 'VText' || child.value === undefined || !child.range) continue;

		const visible = blankIgnoredRegions(child.value);
		for (const match of visible.matchAll(CLASS_SELECTOR)) {
			const name = match[1];
			if (!name || classes.has(name)) continue;
			classes.set(name, child.range[0] + (match.index ?? 0));
		}
	}

	return classes;
}

function walk(node: unknown, visit: (node: WalkNode) => void): void {
	if (!node || typeof node !== 'object') return;

	const record = node as WalkNode;
	if (typeof record.type !== 'string') return;
	visit(record);

	for (const [key, value] of Object.entries(record)) {
		if (SKIPPED_KEYS.has(key)) continue;
		if (Array.isArray(value)) {
			for (const item of value) walk(item, visit);
			continue;
		}
		walk(value, visit);
	}
}

function moduleNameFromUseCssModule(init: TSESTree.Node | null): string | null {
	if (!init || init.type !== 'CallExpression') return null;
	if (init.callee.type !== 'Identifier' || init.callee.name !== 'useCssModule') return null;

	const argument = init.arguments[0];
	if (!argument) return DEFAULT_MODULE;
	if (
		argument.type === 'Literal' &&
		typeof argument.value === 'string' &&
		argument.value.length > 0
	) {
		return argument.value;
	}
	return null;
}

function staticMemberName(node: WalkNode): string | null {
	if (node.type !== 'MemberExpression') return null;

	const object = node.object as WalkNode | undefined;
	const property = node.property as WalkNode | undefined;
	if (object?.type !== 'Identifier' || typeof object.name !== 'string') return null;
	if (!property) return null;

	if (!node.computed && property.type === 'Identifier' && typeof property.name === 'string') {
		return property.name;
	}

	if (
		node.computed &&
		property.type === 'Literal' &&
		typeof property.value === 'string' &&
		property.value.length > 0
	) {
		return property.value;
	}

	return null;
}

export const CssModuleClassUsageRule = ESLintUtils.RuleCreator.withoutDocs({
	meta: {
		type: 'problem',
		docs: {
			description:
				'Report a CSS module class that the template does not use, and a $style binding that has no class.',
		},
		messages: {
			unusedClass: 'CSS module class "{{name}}" is not used.',
			missingClass: 'CSS module class "{{name}}" has no style in <style module>.',
		},
		schema: [],
	},
	defaultOptions: [],
	create(context) {
		const parserServices = context.sourceCode.parserServices as unknown as VueParserServices;
		if (!parserServices.defineTemplateBodyVisitor || !parserServices.getDocumentFragment) return {};

		const defined = new Map<string, Map<string, number>>();
		const bindings = new Map<string, string>();
		const references: ClassReference[] = [];

		collectStyles();

		const rememberMember = (node: WalkNode) => {
			if (node.type !== 'MemberExpression') return;

			const object = node.object as WalkNode | undefined;
			if (object?.type !== 'Identifier' || typeof object.name !== 'string') return;

			references.push({
				moduleName: object.name,
				name: staticMemberName(node),
				node: node as unknown as TSESTree.Node,
			});
		};

		return parserServices.defineTemplateBodyVisitor(
			{
				VExpressionContainer(container) {
					if (!container.expression) return;
					walk(container.expression, rememberMember);
				},
			},
			{
				VariableDeclarator(node) {
					const moduleName = moduleNameFromUseCssModule(node.init);
					if (!moduleName) return;

					if (node.id.type === 'Identifier') {
						bindings.set(node.id.name, moduleName);
						return;
					}

					if (node.id.type !== 'ObjectPattern') return;
					for (const property of node.id.properties) {
						if (property.type !== 'Property' || property.computed) continue;
						if (property.key.type !== 'Identifier') continue;
						references.push({
							moduleName,
							name: property.key.name,
							node: property.key,
							resolved: true,
						});
					}
				},
				MemberExpression(node) {
					rememberMember(node as unknown as WalkNode);
				},
				'Program:exit'() {
					const used = new Map<string, Set<string>>();
					const dynamicModules = new Set<string>();

					const resolveModule = (objectName: string, resolved: boolean) => {
						if (resolved) return objectName;
						if (bindings.has(objectName)) return bindings.get(objectName) ?? null;
						return defined.has(objectName) ? objectName : null;
					};

					for (const reference of references) {
						const moduleName = resolveModule(reference.moduleName, reference.resolved === true);
						if (!moduleName) continue;

						if (!reference.name) {
							dynamicModules.add(moduleName);
							continue;
						}

						const names = used.get(moduleName) ?? new Set<string>();
						names.add(reference.name);
						used.set(moduleName, names);

						if (defined.get(moduleName)?.has(reference.name)) continue;
						context.report({
							node: reference.node,
							messageId: 'missingClass',
							data: { name: reference.name },
						});
					}

					for (const [moduleName, classes] of defined) {
						if (dynamicModules.has(moduleName)) continue;
						const referenced = used.get(moduleName) ?? new Set<string>();
						for (const [name, start] of classes) {
							if (referenced.has(name)) continue;
							context.report({
								loc: {
									start: context.sourceCode.getLocFromIndex(start),
									end: context.sourceCode.getLocFromIndex(start + name.length + 1),
								},
								messageId: 'unusedClass',
								data: { name },
							});
						}
					}
				},
			},
			// The template walk is registered on Program. Reporting on Program:exit
			// then sees both the template references and the script bindings.
			{ templateBodyTriggerSelector: 'Program' },
		);

		function collectStyles() {
			const fragment = parserServices.getDocumentFragment?.();
			if (!fragment) return;

			for (const child of fragment.children) {
				const moduleName = moduleNameFromStyle(child);
				if (!moduleName) continue;
				const classes = defined.get(moduleName) ?? new Map<string, number>();
				for (const [name, start] of collectDefinedClasses(child)) {
					if (!classes.has(name)) classes.set(name, start);
				}
				defined.set(moduleName, classes);
			}
		}
	},
});
