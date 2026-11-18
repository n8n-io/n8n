import { computed, toValue, type MaybeRefOrGetter } from 'vue';
import { useRouter } from 'vue-router';

import { toPageRoute } from '../pageRoute';

/** Tells if the click asks the browser for a new tab or window. */
export function hasNewTabIntent(event: MouseEvent): boolean {
	return event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0;
}

/**
 * Gives the address of a page and a click handler for a link to it.
 * A plain click opens the page in this tab without a reload.
 * A click with a modifier key keeps the behavior of the browser, which opens a new tab.
 */
export function usePageOpening(pageId: MaybeRefOrGetter<string>) {
	const router = useRouter();
	const route = computed(() => toPageRoute(toValue(pageId)));
	const href = computed(() => router.resolve(route.value).href);

	function openInThisTab(event: MouseEvent): void {
		if (!hasNewTabIntent(event)) {
			event.preventDefault();
			void router.push(route.value);
		}
	}

	/** Like `openInThisTab`. Resolves to `true` when the page is open in this tab. */
	async function openInThisTabAndWait(event: MouseEvent): Promise<boolean> {
		const opensHere = !hasNewTabIntent(event);
		if (opensHere) {
			event.preventDefault();
			await router.push(route.value);
		}
		return opensHere;
	}

	return { href, openInThisTab, openInThisTabAndWait };
}
