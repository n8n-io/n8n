import { useRouter } from 'vue-router';

import { usePagePeekStore } from '../pagePeek.store';
import { toPageRoute } from '../pageRoute';
import { hasNewTabIntent } from './usePageOpening';

/**
 * Gives the address of a page and a click handler for a link that shows the page in the side panel.
 * A plain click shows the page in the side panel, so the user stays on the view.
 * A click with a modifier key keeps the behavior of the browser, which opens a new tab.
 */
export function usePagePeekLink() {
	const router = useRouter();
	const peekStore = usePagePeekStore();

	function hrefOf(pageId: string): string {
		return router.resolve(toPageRoute(pageId)).href;
	}

	function peekPageOnPlainClick(event: MouseEvent, pageId: string): void {
		if (!hasNewTabIntent(event)) {
			event.preventDefault();
			peekStore.open(pageId);
		}
	}

	return { hrefOf, peekPageOnPlainClick };
}
