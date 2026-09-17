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
}

const PLAYWRIGHT_REF = /\[ref=(e\d+)\]/;
const AGENT_BROWSER_REF = /@(e\d+)/;

/**
 * A snapshot line looks like `- button "Save" [ref=e12]: some value`, with
 * leading indentation and an optional trailing `: value`. Role is the first
 * token after the list marker; the quoted segment is the accessible name.
 */
export function parseSnapshot(tree: string): SnapshotElement[] {
	const elements: SnapshotElement[] = [];

	for (const rawLine of tree.split('\n')) {
		const refMatch = PLAYWRIGHT_REF.exec(rawLine) ?? AGENT_BROWSER_REF.exec(rawLine);
		if (!refMatch) continue;
		const ref = refMatch[1];

		// Strip indentation, the list marker, and the ref annotation itself so
		// what remains is `role "name"` plus an optional `: value` tail.
		const withoutRef = rawLine.replace(refMatch[0], '').trim().replace(/^-\s*/, '');

		const [head, ...valueParts] = splitOnValueSeparator(withoutRef);
		const value = valueParts.join(':').trim();

		const nameMatch = /"([^"]*)"/.exec(head);
		const name = nameMatch?.[1] ?? '';
		const role =
			head
				.replace(/"[^"]*"/, '')
				.trim()
				.split(/\s+/)[0] ?? '';

		if (!role) continue;

		elements.push({ ref, role, name, ...(value ? { value } : {}) });
	}

	return elements;
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
		criteria[element.ref] = parts.join(' ');
	}
	return criteria;
}

/**
 * Hard cap the API enforces per Choice question: a request with 256 options is
 * rejected with 400 "Too many choices". Real console pages exceed this, so it
 * is a runtime condition to handle, not a theoretical limit.
 */
export const MAX_CHOICE_OPTIONS = 255;

/**
 * Roles that can be the target of an action the fast loop performs. Used only
 * to thin an over-long ref list — never to filter a list that already fits,
 * because dropping a candidate risks the model confidently picking the nearest
 * survivor instead.
 */
const ACTIONABLE_ROLES = new Set([
	'button',
	'checkbox',
	'combobox',
	'link',
	'listbox',
	'menuitem',
	'menuitemcheckbox',
	'menuitemradio',
	'option',
	'radio',
	'searchbox',
	'slider',
	'spinbutton',
	'switch',
	'tab',
	'textbox',
]);

/**
 * The refs to offer as Choice options.
 *
 * Under the cap, every ref is offered unchanged — a hover target is sometimes a
 * plain container, so nothing is filtered while there is room. Over the cap,
 * non-actionable refs (headings, paragraphs, regions) are dropped first, since
 * a click or select target is always actionable. Still over the cap means the
 * page cannot be represented and the caller must hand back: silently truncating
 * would leave the real target missing while the model answers confidently
 * anyway.
 */
export function selectChoosableElements(elements: SnapshotElement[]): {
	elements: SnapshotElement[];
	tooMany: boolean;
} {
	if (elements.length <= MAX_CHOICE_OPTIONS) return { elements, tooMany: false };

	const actionable = elements.filter((element) => ACTIONABLE_ROLES.has(element.role));
	if (actionable.length <= MAX_CHOICE_OPTIONS) return { elements: actionable, tooMany: false };

	return { elements: actionable, tooMany: true };
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
