const FENCED_BLOCK = /```(?:json)?\s*\n?([\s\S]*?)```/i;
const JSON_CONTAINER_START = /^[[{]/;

export function extractFencedJson(text: string): string | undefined {
	return FENCED_BLOCK.exec(text)?.[1].trim();
}

/** Index of the bracket closing the one at `start`, or -1 when the text ends
 *  first. String literals are skipped so brackets inside values don't count. */
function findBalancedEnd(text: string, start: number): number {
	let depth = 0;
	let inString = false;
	for (let i = start; i < text.length; i++) {
		const ch = text[i];
		if (inString) {
			if (ch === '\\') i++;
			else if (ch === '"') inString = false;
		} else if (ch === '"') {
			inString = true;
		} else if (ch === '{' || ch === '[') {
			depth++;
		} else if (ch === '}' || ch === ']') {
			depth--;
			if (depth === 0) return i;
		}
	}
	return -1;
}

function parsesAsJson(text: string): boolean {
	try {
		JSON.parse(text);
		return true;
	} catch {
		return false;
	}
}

/** Longest balanced `{...}` or `[...]` span that parses as JSON. Bracketed
 *  prose (`[docs]`, `[link](url)`) and example snippets before the payload are
 *  skipped instead of being glued onto it or shadowing it. */
function extractJsonContainer(text: string): string | undefined {
	let best: string | undefined;
	// Every opener starts its own scan, so a response full of unmatched brackets
	// would rescan the same suffix from each one (quadratic). Cap the total
	// scanned characters: a payload is found within a few scans, one per level
	// of prose or truncated wrapper around it.
	let budget = text.length * 32;
	for (let start = 0; start < text.length && budget > 0; start++) {
		if (best !== undefined && text.length - start <= best.length) break;
		if (text[start] !== '{' && text[start] !== '[') continue;
		const end = findBalancedEnd(text, start);
		budget -= (end === -1 ? text.length : end + 1) - start;
		if (end === -1) continue;
		const candidate = text.slice(start, end + 1);
		if ((best === undefined || candidate.length > best.length) && parsesAsJson(candidate)) {
			best = candidate;
			start = end;
		}
	}
	return best;
}

export function extractJsonCandidate(text: string): string {
	const trimmed = text.trim();
	// A response that already starts with a JSON container is the payload itself;
	// backtick pairs inside one of its string values must not shadow it. Elsewhere,
	// trust a fenced block only when it is JSON-shaped and parses as JSON.
	// An inner ``` can cut the fence short, but that fence must not shadow the payload.
	const fenced = JSON_CONTAINER_START.test(trimmed) ? undefined : extractFencedJson(trimmed);
	if (fenced !== undefined && JSON_CONTAINER_START.test(fenced) && parsesAsJson(fenced))
		return fenced;

	return extractJsonContainer(trimmed) ?? fenced ?? trimmed;
}
