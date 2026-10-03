/**
 * Parsing for the ref-annotated accessibility trees that `browser_snapshot`
 * returns, and compaction of those trees into TypeSafe Choice criteria.
 *
 * Two ref spellings exist in the wild: Playwright's `[ref=eN]`
 * (`ariaSnapshot({ mode: 'ai' })`) and agent-browser's `@eN`. Both appear in
 * recorded traces, so both are accepted.
 */

export interface SnapshotElement {
	ref: string;
	role: string;
	/** Accessible name, without quotes. Empty when the element has none. */
	name: string;
	/** Current value, for elements rendered as `role [ref=eN]: value`. */
	value?: string;
	/**
	 * Nearest enclosing named node — the row, dialog or region the element sits
	 * in. Twenty `button "Edit"` entries are indistinguishable without it, and
	 * an indistinguishable option splits its probability with its twins.
	 */
	context?: string;
	/**
	 * Current control state — `expanded=true`, `selected=true`, `checked=false`.
	 * Tells the model a step already took effect, so it does not reopen a
	 * dropdown that is already open or re-tick a box already ticked.
	 */
	state?: string;
	/**
	 * The control exists but cannot be used yet. Shown to the model as page
	 * context and never offered as a target: clicking it does nothing, and a
	 * disabled submit is the plainest evidence that a required field is empty.
	 */
	disabled?: boolean;
	/**
	 * Another ref nests inside this one, so it is a layout wrapper (`generic`,
	 * `main`, `article`, …) rather than something to act on.
	 */
	container?: boolean;
}

const PLAYWRIGHT_REF = /\[ref=(e\d+)\]/;
const AGENT_BROWSER_REF = /@(e\d+)/;

/**
 * Hard cap the API enforces per Choice question: a request with 256 options is
 * rejected with 400 "Too many choices". Real console pages exceed this, so it
 * is a runtime condition to handle, not a theoretical limit.
 */
export const MAX_CHOICE_OPTIONS = 255;

/**
 * Candidates offered in one request, across all pages.
 *
 * Paging keeps every question under the option cap but does nothing about the
 * request budget: 600 refs billed ~42k tokens and passed, 1000 refs was
 * rejected with `max_tokens_exceeded`. A total cap is what actually bounds the
 * request, and 250 leaves room for the rest of the fan-out.
 */
export const MAX_CANDIDATES = 250;

interface ParsedLine {
	depth: number;
	role: string;
	name: string;
	value: string;
	ref?: string;
}

/**
 * A snapshot line looks like `- button "Save" [ref=e12]: some value`, with
 * leading indentation and an optional trailing `: value`. Role is the first
 * token after the list marker; the quoted segment is the accessible name.
 *
 * Lines without a ref are parsed too: an unaddressable `row "Casa Flora"` is
 * still the context that tells its cells apart.
 */
function parseLine(rawLine: string): ParsedLine | undefined {
	const refMatch = PLAYWRIGHT_REF.exec(rawLine) ?? AGENT_BROWSER_REF.exec(rawLine);
	const depth = rawLine.length - rawLine.trimStart().length;
	const withoutRef = (refMatch ? rawLine.replace(refMatch[0], '') : rawLine)
		.trim()
		.replace(/^-\s*/, '');

	const [head, ...valueParts] = splitOnValueSeparator(withoutRef);
	const value = valueParts.join(':').trim();

	const nameMatch = /"([^"]*)"/.exec(head);
	const role = head
		.replace(/"[^"]*"/, '')
		.trim()
		.split(/\s+/)[0]
		.replace(/:$/, '');
	if (!role) return undefined;

	return {
		depth,
		role,
		name: nameMatch?.[1] ?? '',
		value,
		...(refMatch ? { ref: refMatch[1] } : {}),
	};
}

export function parseSnapshot(tree: string): SnapshotElement[] {
	const elements: SnapshotElement[] = [];
	/** Enclosing named nodes, innermost last. */
	const ancestors: Array<{ depth: number; name: string; label: string }> = [];

	for (const rawLine of tree.split('\n')) {
		const line = parseLine(rawLine);
		if (!line) continue;

		while (ancestors.length > 0 && ancestors[ancestors.length - 1].depth >= line.depth) {
			ancestors.pop();
		}

		if (line.ref) {
			const parent = ancestors[ancestors.length - 1];
			// A wrapper that merely repeats its child's name adds no information.
			const context = parent && parent.name !== line.name ? parent.label : undefined;
			elements.push({
				ref: line.ref,
				role: line.role,
				name: line.name,
				...(line.value ? { value: line.value } : {}),
				...(context ? { context } : {}),
			});
		}

		if (line.name) {
			ancestors.push({
				depth: line.depth,
				name: line.name,
				label: `${line.role} "${line.name}"`,
			});
		}
	}

	markContainers(tree, elements);
	return elements;
}

/**
 * A ref that encloses another ref is a wrapper. Recomputed from the tree rather
 * than tracked inline because it depends on the element that comes *after*.
 */
function markContainers(tree: string, elements: SnapshotElement[]): void {
	const depths: number[] = [];
	for (const rawLine of tree.split('\n')) {
		if (!PLAYWRIGHT_REF.test(rawLine) && !AGENT_BROWSER_REF.test(rawLine)) continue;
		const line = parseLine(rawLine);
		if (line?.ref) depths.push(line.depth);
	}
	for (let i = 0; i < elements.length; i++) {
		if (depths[i + 1] !== undefined && depths[i + 1] > depths[i]) elements[i].container = true;
	}
}

/**
 * Splits `role "name": value` on the separator that follows the name, not on
 * colons inside a quoted name (`button "Delete: all"`).
 */
function splitOnValueSeparator(line: string): string[] {
	let inQuotes = false;
	for (let i = 0; i < line.length; i++) {
		const char = line[i];
		if (char === '"') inQuotes = !inQuotes;
		if (char === ':' && !inQuotes) {
			return [line.slice(0, i), line.slice(i + 1)];
		}
	}
	return [line];
}

/**
 * The elements worth offering as action targets.
 *
 * `ariaSnapshot({ mode: 'ai' })` annotates nearly every node, not just the
 * interactive ones — measured 49 refs for 10 real controls on one page — and
 * wrappers make up the bulk of the excess. Dropping them is safe because
 * clicking a `main` or a layout `generic` is not an action anyone wants; a
 * clickable `<div>` is a leaf and survives.
 *
 * Narrowing further to interactive roles is NOT done here: a clickable `<div>`
 * appears as `generic`, so a role allowlist would remove real targets and the
 * model would confidently pick the nearest survivor instead. Telling those
 * apart needs DOM facts (handlers, tabindex, cursor) that the tree does not
 * carry.
 *
 * Whatever is left is capped at `MAX_CANDIDATES` and the overflow is reported,
 * so a caller can say the page was too dense rather than silently acting on a
 * partial list.
 */
export function actionCandidates(elements: SnapshotElement[]): {
	elements: SnapshotElement[];
	omitted: number;
} {
	const candidates = elements.filter((element) => !element.container && !element.disabled);
	return {
		elements: candidates.slice(0, MAX_CANDIDATES),
		omitted: Math.max(0, candidates.length - MAX_CANDIDATES),
	};
}

/**
 * Element refs as Choice criteria: the ref is the option the model picks, and
 * the description is what it picks on. Kept to one short line per element —
 * the whole request shares a ~32k token budget with every other question.
 */
export function toChoiceCriteria(elements: SnapshotElement[]): Record<string, string> {
	const criteria: Record<string, string> = {};
	for (const element of elements) {
		const parts = [element.role];
		if (element.name) parts.push(`"${element.name}"`);
		if (element.value) parts.push(`(current value: ${element.value})`);
		if (element.state) parts.push(`[${element.state}]`);
		if (element.context) parts.push(`in ${element.context}`);
		criteria[element.ref] = parts.join(' ');
	}
	return criteria;
}

/**
 * Option labels of every `<select>` on the page.
 *
 * Options carry no ref of their own, so the element parser skips them, but
 * `browser_select` takes labels rather than refs. Collected page-wide because
 * the fan-out asks for the value before the target select is known; a label
 * that does not belong to the chosen element fails in the adapter with a clear
 * error rather than performing some other action.
 */
export function parseOptionLabels(tree: string): string[] {
	const labels: string[] = [];
	for (const line of tree.split('\n')) {
		if (PLAYWRIGHT_REF.test(line) || AGENT_BROWSER_REF.test(line)) continue;
		const match = /^\s*-\s*option\s+"([^"]*)"/.exec(line);
		if (match?.[1] && !labels.includes(match[1])) labels.push(match[1]);
	}
	return labels;
}

/**
 * Same chars/4 approximation the computer-use eval uses, so token figures from
 * the two harnesses stay comparable.
 */
export function estimateTokens(text: string): number {
	return Math.ceil(text.length / 4);
}
