import { inject } from 'vue';

/**
 * PROTOTYPE (cloud browser): Live View links open the browser tab in the preview panel
 * when the thread view provides it. A plain click without the tab, or with a modifier key,
 * keeps the link's normal new-window behaviour.
 */
export function useCloudBrowserLinkHandler() {
	const openCloudBrowserTab = inject<(() => boolean) | undefined>('openCloudBrowserTab', undefined);
	return (event: MouseEvent) => {
		if (event.metaKey || event.ctrlKey || event.shiftKey) return;
		if (openCloudBrowserTab?.()) event.preventDefault();
	};
}

/** Whether a link points at a Browserbase Live View. */
export function isLiveViewUrl(href: string): boolean {
	try {
		const url = new URL(href);
		return url.hostname.endsWith('browserbase.com') && url.pathname.startsWith('/devtools');
	} catch {
		return false;
	}
}

/**
 * The Live View for embedding: without Browserbase's own browser bar, since the preview
 * draws its own. A new window keeps the original link, bar included.
 */
export function embeddedLiveViewUrl(href: string): string {
	try {
		const url = new URL(href);
		url.searchParams.set('navbar', 'false');
		return url.toString();
	} catch {
		return href;
	}
}

/**
 * A Live View link without its signing token. Browserbase signs each link afresh, so two
 * links to the same page differ only by token. Keying the frame on this avoids a reload.
 */
export function liveViewKey(href: string): string {
	return href.replace(/([?&])t=[^&]*&?/, '$1').replace(/[?&]$/, '');
}

/** The browser window's shape as a CSS aspect ratio, from a "1024x768" viewport. */
export function viewportAspectRatio(viewport: string | undefined): string {
	const match = /^(\d+)x(\d+)$/.exec(viewport ?? '');
	return match ? `${match[1]} / ${match[2]}` : '16 / 10';
}
