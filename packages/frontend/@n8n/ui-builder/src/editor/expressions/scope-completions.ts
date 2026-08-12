import type { Completion, CompletionContext, CompletionResult } from '@codemirror/autocomplete';

import type { UiScope } from '../../core/types';

const ROOT_DOCS: Record<string, string> = {
	$state: 'The app state',
	$item: 'The element the enclosing repeat is rendering',
	$index: 'The position of that element',
	$loading: 'Which actions are in flight, plus $any',
	$route: 'The page on screen',
	$pages: 'Every page this app holds',
	$response: 'What the call before this step answered',
};

const PATH_BEFORE_DOT = /[$A-Za-z_][\w$.[\]'"]*\.[\w$]*$/;
const BARE_WORD = /[$\w]*$/;
const SEGMENT = /([$A-Za-z_][\w$]*)|\[\s*(?:(\d+)|'([^']*)'|"([^"]*)")\s*\]/g;

function segmentsOf(path: string): string[] | undefined {
	const segments: string[] = [];
	let consumed = 0;

	for (const match of path.matchAll(SEGMENT)) {
		// A gap means something we cannot walk — a call, an operator — so give up
		// rather than drill into the wrong value.
		if (match.index !== consumed && path.slice(consumed, match.index) !== '.') return undefined;
		consumed = match.index + match[0].length;
		segments.push(match[1] ?? match[2] ?? match[3] ?? match[4] ?? '');
	}

	return consumed === path.length ? segments : undefined;
}

function walk(scope: UiScope, segments: string[]): unknown {
	let current: unknown = scope;

	for (const segment of segments) {
		if (current === null || current === undefined) return undefined;
		if (typeof current !== 'object') return undefined;
		current = (current as Record<string, unknown>)[segment];
	}

	return current;
}

function describe(value: unknown): string {
	if (value === null) return 'null';
	if (Array.isArray(value)) return `array(${value.length})`;
	if (value instanceof Date) return 'date';
	return typeof value;
}

function optionsFor(value: unknown): Completion[] {
	if (Array.isArray(value)) return [{ label: 'length', type: 'keyword', detail: 'number' }];

	if (value === null || typeof value !== 'object') return [];

	return Object.entries(value).map(([key, entry]) => ({
		label: key,
		type: 'variable',
		detail: describe(entry),
	}));
}

/**
 * Completes against the values the canvas is rendering right now, not a schema:
 * `$state.rows[0].` offers the keys the first row actually has.
 */
export function uiScopeCompletions(
	getScope: () => UiScope,
): (context: CompletionContext) => CompletionResult | null {
	return (context: CompletionContext): CompletionResult | null => {
		const dotted = context.matchBefore(PATH_BEFORE_DOT);

		if (dotted) {
			const lastDot = dotted.text.lastIndexOf('.');
			const segments = segmentsOf(dotted.text.slice(0, lastDot));
			if (!segments?.length) return null;

			const options = optionsFor(walk(getScope(), segments));
			if (options.length === 0) return null;

			return { from: dotted.from + lastDot + 1, options };
		}

		const bare = context.matchBefore(BARE_WORD);
		if (!bare) return null;
		if (!context.explicit && !bare.text.startsWith('$')) return null;

		const scope = getScope();
		const options: Completion[] = Object.keys(ROOT_DOCS)
			.filter((name) => scope[name as keyof UiScope] !== undefined)
			.map((name) => ({
				label: name,
				type: 'variable',
				detail: describe(scope[name as keyof UiScope]),
				info: ROOT_DOCS[name],
			}));

		return { from: bare.from, options };
	};
}
