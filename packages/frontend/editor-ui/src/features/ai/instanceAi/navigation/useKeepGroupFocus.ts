import type { Ref } from 'vue';
import { useRestoreFocus } from './useKeepListFocus';

/** The attribute that names the group of an element in the grouped chat list. */
export const CHAT_GROUP_ATTRIBUTE = 'data-chat-group';

/** Where the focus was before an update. */
export interface FocusAnchor {
	/** The ID of the focused chat row, when a row had the focus. */
	rowId?: string;
	/** The group that held the focused element. */
	group?: string;
}

function chatRows(container: ParentNode): HTMLElement[] {
	return Array.from(container.querySelectorAll<HTMLElement>('[role="menuitem"]'));
}

function groupElement(root: HTMLElement, group: string | undefined): HTMLElement | undefined {
	if (group === undefined) return undefined;
	return Array.from(root.querySelectorAll<HTMLElement>(`[${CHAT_GROUP_ATTRIBUTE}]`)).find(
		(element) => element.getAttribute(CHAT_GROUP_ATTRIBUTE) === group,
	);
}

/** Returns `undefined` when the focus is outside `root`. */
export function focusAnchor(root: HTMLElement): FocusAnchor | undefined {
	const active = document.activeElement;
	if (!(active instanceof HTMLElement) || !root.contains(active)) return undefined;
	const isRow = active.getAttribute('role') === 'menuitem' && active.id !== '';
	const group = active.closest(`[${CHAT_GROUP_ATTRIBUTE}]`)?.getAttribute(CHAT_GROUP_ATTRIBUTE);
	return { rowId: isRow ? active.id : undefined, group: group ?? undefined };
}

/**
 * The element that gets the focus back: the same chat in its new group, else the last row of
 * the group that had the focus, else the first row of the list.
 */
export function focusTarget(root: HTMLElement, anchor: FocusAnchor): HTMLElement | undefined {
	const rows = chatRows(root);
	const sameRow = anchor.rowId === undefined ? undefined : rows.find((r) => r.id === anchor.rowId);
	if (sameRow) return sameRow;
	const group = groupElement(root, anchor.group);
	return (group ? chatRows(group).at(-1) : undefined) ?? rows[0];
}

/**
 * Keeps the keyboard focus in the grouped chat list when an update removes the focused element.
 * When the state of a chat changes, Vue removes its row from one group and adds a new row to
 * another group. The "Show all" button goes when its group gets small enough.
 */
export function useKeepGroupFocus(root: Readonly<Ref<HTMLElement | null>>) {
	useRestoreFocus(root, focusAnchor, (element, anchor) => focusTarget(element, anchor)?.focus());
}
