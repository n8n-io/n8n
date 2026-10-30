import { useEventListener } from '@vueuse/core';
import { toValue, type MaybeRefOrGetter } from 'vue';

/** Marks an element that handles Escape itself, such as an open popover, so the dialog leaves it the key. */
export const ESCAPE_OWNER_ATTRIBUTE = 'data-escape-owner';

/**
 * Closes a dialog on Escape without closing the surface it opens on. An Element Plus modal under
 * the dialog closes on a document Escape listener, and only a window capture listener runs first.
 */
export function useCloseOnEscape(isActive: MaybeRefOrGetter<boolean>, close: () => void) {
	useEventListener(
		() => (toValue(isActive) ? window : null),
		'keydown',
		(event: KeyboardEvent) => {
			if (event.key !== 'Escape') return;
			if (event.target instanceof Element && event.target.closest(`[${ESCAPE_OWNER_ATTRIBUTE}]`)) {
				return;
			}
			event.stopPropagation();
			close();
		},
		{ capture: true },
	);
}
