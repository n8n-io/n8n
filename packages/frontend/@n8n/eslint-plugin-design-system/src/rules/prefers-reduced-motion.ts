import { ESLintUtils } from '@typescript-eslint/utils';

type MotionKind = 'animation' | 'scroll' | 'transition';

interface MotionUse {
	kind: MotionKind;
	property: string;
	selector: string;
}

interface CssState {
	disabledBySelector: Map<string, Set<MotionKind>>;
	motionUses: MotionUse[];
}

const REDUCED_MOTION_QUERY = /^\(\s*prefers-reduced-motion\s*:\s*reduce\s*\)$/i;
const STYLE_BLOCK = /<style\b[^>]*>([\s\S]*?)<\/style\s*>/gi;

function removeComments(source: string): string {
	let result = '';
	let quote: '"' | "'" | undefined;
	for (let index = 0; index < source.length; index++) {
		const character = source[index];
		const next = source[index + 1];
		if (quote) {
			result += character;
			if (character === '\\') result += source[++index] ?? '';
			else if (character === quote) quote = undefined;
			continue;
		}
		if (character === '"' || character === "'") {
			quote = character;
			result += character;
			continue;
		}
		if (character === '/' && next === '*') {
			result += '  ';
			index += 2;
			while (index < source.length && !(source[index] === '*' && source[index + 1] === '/')) {
				result += source[index] === '\n' ? '\n' : ' ';
				index++;
			}
			result += '  ';
			index++;
			continue;
		}
		if (character === '/' && next === '/') {
			result += '  ';
			index += 2;
			while (index < source.length && source[index] !== '\n') {
				result += ' ';
				index++;
			}
			if (index < source.length) result += '\n';
			continue;
		}
		result += character;
	}
	return result;
}

function isReducedMotionQuery(value: string): boolean {
	return REDUCED_MOTION_QUERY.test(value.replace(/^@media\s+/i, '').trim());
}

function splitSelectors(value: string): string[] {
	return value
		.split(',')
		.map(function normalizeSelector(selector) {
			return selector.trim().replace(/\s+/g, ' ');
		})
		.filter(function hasSelector(selector) {
			return selector.length > 0;
		});
}

function combineSelectors(parents: string[], children: string[]): string[] {
	if (parents.length === 0) return children;
	const combined: string[] = [];
	for (const parent of parents) {
		for (const child of children) {
			combined.push(child.includes('&') ? child.replaceAll('&', parent) : `${parent} ${child}`);
		}
	}
	return combined;
}

function findNextDelimiter(source: string, start: number, end: number): number {
	let quote: '"' | "'" | undefined;
	for (let index = start; index < end; index++) {
		const character = source[index];
		if (quote) {
			if (character === '\\') index++;
			else if (character === quote) quote = undefined;
			continue;
		}
		if (character === '"' || character === "'") {
			quote = character;
			continue;
		}
		if (character === ';' || character === '{') return index;
	}
	return end;
}

function findClosingBrace(source: string, openBrace: number, end: number): number {
	let depth = 1;
	let quote: '"' | "'" | undefined;
	for (let index = openBrace + 1; index < end; index++) {
		const character = source[index];
		if (quote) {
			if (character === '\\') index++;
			else if (character === quote) quote = undefined;
			continue;
		}
		if (character === '"' || character === "'") {
			quote = character;
			continue;
		}
		if (character === '{') depth++;
		if (character === '}') depth--;
		if (depth === 0) return index;
	}
	return end;
}

function getMotionKind(property: string, value: string): MotionKind | undefined {
	const standardProperty = property.replace(/^-(?:webkit|moz|o)-/, '');
	const normalizedValue = value
		.trim()
		.toLowerCase()
		.replace(/\s*!important\s*$/, '');
	if (standardProperty === 'animation' || standardProperty === 'animation-name') {
		return normalizedValue === 'none' ? undefined : 'animation';
	}
	if (standardProperty === 'transition' || standardProperty === 'transition-property') {
		return normalizedValue === 'none' ? undefined : 'transition';
	}
	if (standardProperty === 'scroll-behavior' && normalizedValue === 'smooth') return 'scroll';
	return undefined;
}

function getDisabledKind(property: string, value: string): MotionKind | undefined {
	const standardProperty = property.replace(/^-(?:webkit|moz|o)-/, '');
	const normalizedValue = value
		.trim()
		.toLowerCase()
		.replace(/\s*!important\s*$/, '');
	if (standardProperty === 'animation' && normalizedValue === 'none') return 'animation';
	if (standardProperty === 'transition' && normalizedValue === 'none') return 'transition';
	if (standardProperty === 'scroll-behavior' && normalizedValue === 'auto') return 'scroll';
	return undefined;
}

function addDisabledKind(
	state: CssState,
	selectors: string[],
	property: string,
	value: string,
): void {
	const kind = getDisabledKind(property, value);
	if (!kind) return;
	for (const selector of selectors) {
		const disabledKinds = state.disabledBySelector.get(selector) ?? new Set<MotionKind>();
		disabledKinds.add(kind);
		state.disabledBySelector.set(selector, disabledKinds);
	}
}

function inspectDeclaration(
	declaration: string,
	selectors: string[],
	inReducedMotionQuery: boolean,
	state: CssState,
): void {
	const match = /^\s*([\w-]+)\s*:\s*([\s\S]*?)\s*$/.exec(declaration);
	if (!match?.[1] || match[2] === undefined || selectors.length === 0) return;
	const property = match[1].toLowerCase();
	const value = match[2];
	if (inReducedMotionQuery) {
		addDisabledKind(state, selectors, property, value);
		return;
	}
	const kind = getMotionKind(property, value);
	if (!kind) return;
	for (const selector of selectors) {
		state.motionUses.push({ kind, property, selector });
	}
}

function inspectCssRange(
	source: string,
	start: number,
	end: number,
	selectors: string[],
	inReducedMotionQuery: boolean,
	state: CssState,
): void {
	let cursor = start;
	while (cursor < end) {
		const delimiter = findNextDelimiter(source, cursor, end);
		const segment = source.slice(cursor, delimiter).trim();
		if (delimiter === end) {
			inspectDeclaration(segment, selectors, inReducedMotionQuery, state);
			return;
		}
		if (source[delimiter] === ';') {
			inspectDeclaration(segment, selectors, inReducedMotionQuery, state);
			cursor = delimiter + 1;
			continue;
		}

		const closingBrace = findClosingBrace(source, delimiter, end);
		if (segment.startsWith('@media')) {
			inspectCssRange(
				source,
				delimiter + 1,
				closingBrace,
				selectors,
				inReducedMotionQuery || isReducedMotionQuery(segment),
				state,
			);
		} else if (segment.startsWith('@keyframes') || segment.startsWith('@-webkit-keyframes')) {
			cursor = closingBrace + 1;
			continue;
		} else if (segment.startsWith('@')) {
			inspectCssRange(source, delimiter + 1, closingBrace, selectors, inReducedMotionQuery, state);
		} else {
			const nestedSelectors = combineSelectors(selectors, splitSelectors(segment));
			inspectCssRange(
				source,
				delimiter + 1,
				closingBrace,
				nestedSelectors,
				inReducedMotionQuery,
				state,
			);
		}
		cursor = closingBrace + 1;
	}
}

function inspectStyleBlocks(source: string): CssState {
	const state: CssState = { disabledBySelector: new Map(), motionUses: [] };
	for (const match of source.matchAll(STYLE_BLOCK)) {
		const style = removeComments(match[1] ?? '');
		inspectCssRange(style, 0, style.length, [], false, state);
	}
	return state;
}

function hasReducedMotionOverride(use: MotionUse, state: CssState): boolean {
	return (
		state.disabledBySelector.get(use.selector)?.has(use.kind) === true ||
		state.disabledBySelector.get('*')?.has(use.kind) === true
	);
}

export const PrefersReducedMotionRule = ESLintUtils.RuleCreator.withoutDocs({
	meta: {
		type: 'problem',
		docs: {
			description: 'Require CSS motion to respect the reduced motion preference',
		},
		messages: {
			missingReducedMotion:
				'Add a matching `prefers-reduced-motion: reduce` override for `{{property}}` on `{{selector}}`.',
		},
		schema: [],
	},
	defaultOptions: [],
	create(context) {
		return {
			Program(node) {
				const state = inspectStyleBlocks(context.sourceCode.text);
				for (const use of state.motionUses) {
					if (hasReducedMotionOverride(use, state)) continue;
					context.report({
						node,
						messageId: 'missingReducedMotion',
						data: { property: use.property, selector: use.selector },
					});
				}
			},
		};
	},
});
