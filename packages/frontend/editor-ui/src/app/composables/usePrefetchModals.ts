import { onBeforeUnmount, onMounted } from 'vue';
import { isRecord } from '@n8n/utils/is-record';
import { MODAL_PREFETCH_FALLBACK_DELAY, MODAL_PREFETCH_IDLE_TIMEOUT } from '@/app/constants';
import { lazyModalLoaders, type LazyModalKey } from '@/app/modals/lazyModals';

let runningPrefetches = 0;

/**
 * Tells if a modal prefetch is loading now. The `vite:preloadError` handler uses this to
 * not reload the page when a background prefetch fails.
 */
export function isModalPrefetchRunning(): boolean {
	return runningPrefetches > 0;
}

function isSaveDataOn(): boolean {
	const connection = 'connection' in navigator ? navigator.connection : undefined;
	return isRecord(connection) && connection.saveData === true;
}

/** Runs the callback when the browser is idle. Returns a function that cancels it. */
function onIdle(callback: () => void): () => void {
	if (typeof window.requestIdleCallback === 'function') {
		const handle = window.requestIdleCallback(callback, { timeout: MODAL_PREFETCH_IDLE_TIMEOUT });
		return () => window.cancelIdleCallback(handle);
	}

	// Safari has no `requestIdleCallback`.
	const handle = window.setTimeout(callback, MODAL_PREFETCH_FALLBACK_DELAY);
	return () => window.clearTimeout(handle);
}

async function prefetch(key: LazyModalKey): Promise<void> {
	runningPrefetches++;
	try {
		await lazyModalLoaders[key]();
	} catch {
		// A failed prefetch changes nothing. Opening the modal loads it again.
	} finally {
		runningPrefetches--;
	}
}

/**
 * Loads the code of the given modals after the page mounts, one modal for each idle period,
 * in list order. The first open of these modals then makes no network request.
 * Does nothing when the user turned on data saving.
 */
export function usePrefetchModals(
	keys: readonly LazyModalKey[],
	options: { enabled?: () => boolean } = {},
): void {
	let cancelPending: (() => void) | undefined;
	let unmounted = false;

	function prefetchFrom(index: number) {
		const key = keys[index];
		if (unmounted || key === undefined) return;

		cancelPending = onIdle(() => {
			cancelPending = undefined;
			void prefetch(key).then(() => prefetchFrom(index + 1));
		});
	}

	onMounted(() => {
		if (options.enabled?.() === false || isSaveDataOn()) return;
		prefetchFrom(0);
	});

	onBeforeUnmount(() => {
		unmounted = true;
		cancelPending?.();
	});
}
