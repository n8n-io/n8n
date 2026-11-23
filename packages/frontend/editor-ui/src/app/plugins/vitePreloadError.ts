import { isModalPrefetchRunning } from '@/app/composables/usePrefetchModals';
import { awaitRoutePreload, isRoutePreloadPending } from '@/app/utils/routePreload';

const VITE_PRELOAD_RELOAD_TS = 'n8n:vite-preload-reloaded-at';
const RELOAD_THROTTLE_MS = 10_000;

/**
 * Reloads the page to get the chunks of a new deploy, at most once in 10 seconds.
 * Returns `true` when it reloads.
 */
export function reloadAfterPreloadError(): boolean {
	const last = Number(sessionStorage.getItem(VITE_PRELOAD_RELOAD_TS) ?? 0);
	if (Date.now() - last < RELOAD_THROTTLE_MS) return false;
	sessionStorage.setItem(VITE_PRELOAD_RELOAD_TS, String(Date.now()));
	window.location.reload();
	return true;
}

export function registerVitePreloadErrorHandler(): () => void {
	const handler = (event: Event) => {
		// A failed background prefetch must not reload the page. The import rejects, and
		// opening the modal later loads it again.
		if (isModalPrefetchRunning()) return;

		// The event can come from the early load of the first route. The router guard reloads
		// if that route still needs its chunks, so wait for the result. If the early load
		// succeeded, another chunk failed, so reload as without the early load.
		if (isRoutePreloadPending()) {
			void awaitRoutePreload().then((loaded) => {
				if (loaded) reloadAfterPreloadError();
			});
			return;
		}

		if (reloadAfterPreloadError()) {
			event.preventDefault();
		}
	};

	window.addEventListener('vite:preloadError', handler);
	return () => window.removeEventListener('vite:preloadError', handler);
}
