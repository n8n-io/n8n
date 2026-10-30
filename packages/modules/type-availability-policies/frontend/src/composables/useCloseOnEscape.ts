import { useEventListener } from '@vueuse/core';
import { toValue, type MaybeRefOrGetter } from 'vue';

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
			event.stopPropagation();
			close();
		},
		{ capture: true },
	);
}
