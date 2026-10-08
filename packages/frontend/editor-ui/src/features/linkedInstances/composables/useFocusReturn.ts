import { nextTick } from 'vue';

type FocusTarget = () => HTMLElement | null | undefined;

/**
 * Puts focus back after a dialog closes or a row goes away. The page re-renders first, so the
 * element that had focus can be gone. Then focus goes to the preferred element or the fallback.
 */
export function useFocusReturn(fallback: FocusTarget) {
	let previous: HTMLElement | null = null;

	function remember() {
		previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
	}

	async function restore(preferred?: FocusTarget) {
		await nextTick();
		const candidates = [preferred?.(), previous, fallback()];
		previous = null;
		candidates.find((element) => element?.isConnected)?.focus();
	}

	return { remember, restore };
}
