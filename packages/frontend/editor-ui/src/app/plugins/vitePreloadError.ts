import { isModalPrefetchRunning } from '@/app/composables/usePrefetchModals';

const VITE_PRELOAD_RELOAD_TS = 'n8n:vite-preload-reloaded-at';
const RELOAD_THROTTLE_MS = 10_000;

export function registerVitePreloadErrorHandler(): () => void {
	const handler = (event: Event) => {
		// A failed background prefetch must not reload the page. The import rejects, and
		// opening the modal later loads it again.
		if (isModalPrefetchRunning()) return;

		const last = Number(sessionStorage.getItem(VITE_PRELOAD_RELOAD_TS) ?? 0);
		if (Date.now() - last < RELOAD_THROTTLE_MS) return;
		sessionStorage.setItem(VITE_PRELOAD_RELOAD_TS, String(Date.now()));
		event.preventDefault();
		window.location.reload();
	};

	window.addEventListener('vite:preloadError', handler);
	return () => window.removeEventListener('vite:preloadError', handler);
}
