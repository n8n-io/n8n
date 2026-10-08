import { onBeforeUpdate, onUpdated, type Ref } from 'vue';

/** The attribute that gives a row of a flat list its key, for example the workflow ID. */
export const FOCUS_ROW_ATTRIBUTE = 'data-focus-row';

/** Where the focus was in a flat list before an update. */
export interface RowFocusAnchor {
	/** The key of the row that held the focus. */
	key: string;
	/** The position of that row in the list. */
	index: number;
}

function listRows(root: ParentNode): HTMLElement[] {
	return Array.from(root.querySelectorAll<HTMLElement>(`[${FOCUS_ROW_ATTRIBUTE}]`));
}

function isFocusLost(): boolean {
	const active = document.activeElement;
	return active === null || active === document.body;
}

/**
 * Gives the focus back when an update of the calling component removes the focused element.
 * `capture` notes where the focus was in `root` before the update. `restore` moves the focus
 * after the update.
 */
export function useRestoreFocus<T>(
	root: Readonly<Ref<HTMLElement | null>>,
	capture: (root: HTMLElement) => T | undefined,
	restore: (root: HTMLElement, anchor: T) => void,
) {
	let anchor: T | undefined;

	onBeforeUpdate(() => {
		anchor = root.value ? capture(root.value) : undefined;
	});

	onUpdated(() => {
		const before = anchor;
		anchor = undefined;
		// Only an element that this update removed lost the focus. Do not take it from elsewhere.
		if (before === undefined || !root.value || !isFocusLost()) return;
		restore(root.value, before);
	});
}

/** Returns `undefined` when no row of `root` holds the focus. */
export function rowFocusAnchor(root: HTMLElement): RowFocusAnchor | undefined {
	const active = document.activeElement;
	if (!(active instanceof HTMLElement) || !root.contains(active)) return undefined;
	const row = active.closest<HTMLElement>(`[${FOCUS_ROW_ATTRIBUTE}]`);
	const key = row?.getAttribute(FOCUS_ROW_ATTRIBUTE);
	if (!row || typeof key !== 'string' || !root.contains(row)) return undefined;
	return { key, index: listRows(root).indexOf(row) };
}

/**
 * The row link that gets the focus back: the link of the same row (its button can be gone),
 * else the link of the row that now has the same position, else the link of the last row.
 */
export function rowFocusTarget(root: HTMLElement, anchor: RowFocusAnchor): HTMLElement | undefined {
	const rows = listRows(root);
	const row =
		rows.find((element) => element.getAttribute(FOCUS_ROW_ATTRIBUTE) === anchor.key) ??
		rows[Math.min(anchor.index, rows.length - 1)];
	return row?.querySelector<HTMLElement>('[role="menuitem"]') ?? undefined;
}

/**
 * Keeps the keyboard focus in a flat list when a reload removes the focused row, or a button
 * of that row. Give each row `FOCUS_ROW_ATTRIBUTE` and an N8nMenuItem. `fallback` moves the
 * focus when no row is left, for example to the toggle of the section.
 */
export function useKeepRowFocus(root: Readonly<Ref<HTMLElement | null>>, fallback?: () => void) {
	useRestoreFocus(root, rowFocusAnchor, (element, anchor) => {
		const target = rowFocusTarget(element, anchor);
		if (target) target.focus();
		else fallback?.();
	});
}
