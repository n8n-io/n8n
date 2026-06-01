import type { Ref, ComputedRef } from 'vue';
import { ref, unref } from 'vue';

export interface MenuNavigationItem {
	disabled?: boolean;
}

export interface UseMenuKeyboardNavigationOptions<T extends MenuNavigationItem> {
	items: Ref<T[]> | ComputedRef<T[]>;
	hasSubMenu?: (item: T) => boolean;
	onSelect?: (index: number, item: T) => void;
	onOpenSubMenu?: (index: number, item: T) => void;
	onCloseSubMenu?: () => void;
	onClose?: () => void;
}

/**
 * Handles keyboard navigation for searchable menus and submenus.
 * Since focus must remain in the search input field, we use virtual
 * highlighting to track which menu item is "selected" for keyboard navigation.
 * Non-searchable menus use reka-ui's built-in roving focus instead.
 */
export function useMenuKeyboardNavigation<T extends MenuNavigationItem>(
	options: UseMenuKeyboardNavigationOptions<T>,
) {
	const highlightedIndex = ref(-1);

	const getItems = () => unref(options.items);

	const getNextValidIndex = (current: number, direction: 1 | -1): number => {
		const items = getItems();
		let next = current + direction;

		while (next >= 0 && next < items.length && items[next].disabled) {
			next += direction;
		}

		if (next >= 0 && next < items.length) {
			return next;
		}

		if (direction === -1) {
			return -1;
		}

		return current;
	};

	const navigate = (direction: 'up' | 'down') => {
		if (direction === 'down') {
			if (highlightedIndex.value === -1) {
				highlightedIndex.value = getNextValidIndex(-1, 1);
			} else {
				highlightedIndex.value = getNextValidIndex(highlightedIndex.value, 1);
			}
		} else {
			if (highlightedIndex.value <= 0) {
				highlightedIndex.value = -1;
			} else {
				highlightedIndex.value = getNextValidIndex(highlightedIndex.value, -1);
			}
		}
	};

	const handleEnter = () => {
		if (highlightedIndex.value >= 0) {
			const items = getItems();
			const item = items[highlightedIndex.value];
			if (item && !item.disabled) {
				if (options.hasSubMenu?.(item)) {
					options.onOpenSubMenu?.(highlightedIndex.value, item);
				} else {
					options.onSelect?.(highlightedIndex.value, item);
				}
			}
		}
	};

	const handleArrowRight = () => {
		if (highlightedIndex.value >= 0) {
			const items = getItems();
			const item = items[highlightedIndex.value];
			if (item && !item.disabled && options.hasSubMenu?.(item)) {
				options.onOpenSubMenu?.(highlightedIndex.value, item);
			}
		}
	};

	const handleArrowLeft = () => {
		options.onCloseSubMenu?.();
	};

	const handleKeydown = (event: KeyboardEvent) => {
		if (event.key === 'Enter' && highlightedIndex.value >= 0) {
			event.preventDefault();
			handleEnter();
		}

		if (event.key === 'ArrowRight' && highlightedIndex.value >= 0) {
			event.preventDefault();
			handleArrowRight();
		}

		if (event.key === 'ArrowLeft') {
			event.preventDefault();
			handleArrowLeft();
		}
	};

	const reset = () => {
		highlightedIndex.value = -1;
	};

	const highlightFirst = () => {
		highlightedIndex.value = getNextValidIndex(-1, 1);
	};

	return {
		highlightedIndex,
		navigate,
		handleEnter,
		handleArrowRight,
		handleArrowLeft,
		handleKeydown,
		reset,
		highlightFirst,
	};
}
