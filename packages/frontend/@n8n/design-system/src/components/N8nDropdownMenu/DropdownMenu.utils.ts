import type { DropdownMenuItemProps } from './DropdownMenu.types';

export type NavigationDirection = 'up' | 'down';
export type IndexDirection = 1 | -1;

export function hasSubMenu<T, D>(item: DropdownMenuItemProps<T, D>): boolean {
	return (item.children && item.children.length > 0) || !!item.loading || !!item.searchable;
}

export function getNextValidIndex<T, D>(
	items: Array<DropdownMenuItemProps<T, D>>,
	current: number,
	direction: IndexDirection,
): number {
	let next = current + direction;

	while (next >= 0 && next < items.length && items[next].disabled) {
		next += direction;
	}

	if (next >= 0 && next < items.length) {
		return next;
	}

	return direction === -1 ? -1 : current;
}

export function getItemDomId(instanceId: string, index: number) {
	return `dropdown-menu-searchable-${instanceId}-item-${index}`;
}

export function scrollHighlightedItemIntoView(container: HTMLElement | null) {
	const highlightedItem = container?.querySelector('[data-menu-items] [aria-selected="true"]');

	if (!(container && highlightedItem instanceof HTMLElement)) return;

	// Scroll the known items container directly instead of using scrollIntoView(),
	// which may choose a parent/portal scroll ancestor.
	const containerRect = container.getBoundingClientRect();
	const itemRect = highlightedItem.getBoundingClientRect();

	if (itemRect.top < containerRect.top) {
		container.scrollTop -= containerRect.top - itemRect.top;
	} else if (itemRect.bottom > containerRect.bottom) {
		container.scrollTop += itemRect.bottom - containerRect.bottom;
	}
}

export function isInputCursorAtEnd(event: KeyboardEvent) {
	return (
		event.target instanceof HTMLInputElement &&
		event.target.selectionStart === event.target.value.length
	);
}

export function isInputCursorAtStart(event: KeyboardEvent) {
	return event.target instanceof HTMLInputElement && event.target.selectionStart === 0;
}
