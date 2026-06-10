/*
 * Roving-focus helper for menu/listbox overlays rendered inside `N8nPopover`.
 *
 * `N8nPopover` (reka-ui) already gives us Escape-to-close, click-outside and
 * return-focus-to-trigger. What it does not add for a hand-rolled list of
 * buttons is in-menu keyboard navigation, so this composable layers on:
 *  - moving focus to the first (or selected) item when the menu opens,
 *  - Up/Down arrow + Home/End roving focus across the items,
 *  - typeahead-free, single-keystroke navigation that matches native menus.
 *
 * It is deliberately tiny: the caller owns the markup and styling (so prototype
 * fidelity is untouched) and just wires the returned ref + handler in.
 */
import { nextTick, ref, watch, type Ref } from 'vue';

interface UseMenuRovingFocusOptions {
	/** Reactive open state of the popover. */
	open: Ref<boolean>;
	/** Index of the currently-selected item, focused first when the menu opens. */
	selectedIndex?: Ref<number>;
}

export function useMenuRovingFocus({ open, selectedIndex }: UseMenuRovingFocusOptions) {
	// The element wrapping the menu items (gets `role="menu"`/`role="listbox"`).
	const menuRef = ref<HTMLElement | null>(null);

	function items(): HTMLElement[] {
		const el = menuRef.value;
		if (!el) return [];
		return Array.from(el.querySelectorAll<HTMLElement>('[data-menu-item]'));
	}

	function focusAt(index: number) {
		const all = items();
		if (all.length === 0) return;
		const clamped = ((index % all.length) + all.length) % all.length;
		all[clamped]?.focus();
	}

	// When the menu opens, move focus inside it (to the selected item if any).
	watch(open, async (isOpen) => {
		if (!isOpen) return;
		await nextTick();
		focusAt(selectedIndex?.value ?? 0);
	});

	function onKeydown(event: KeyboardEvent) {
		const all = items();
		if (all.length === 0) return;
		const current = all.indexOf(document.activeElement as HTMLElement);

		switch (event.key) {
			case 'ArrowDown':
				event.preventDefault();
				focusAt(current + 1);
				break;
			case 'ArrowUp':
				event.preventDefault();
				focusAt(current - 1);
				break;
			case 'Home':
				event.preventDefault();
				focusAt(0);
				break;
			case 'End':
				event.preventDefault();
				focusAt(all.length - 1);
				break;
			default:
				break;
		}
	}

	return { menuRef, onKeydown };
}
