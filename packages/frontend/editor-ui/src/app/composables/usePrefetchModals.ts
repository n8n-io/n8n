import { onBeforeUnmount, onMounted, watch, type Component, type WatchStopHandle } from 'vue';
import { modalRegistry } from '@n8n/frontend-module-sdk';
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

function isLazyModalKey(key: string): key is LazyModalKey {
	return Object.hasOwn(lazyModalLoaders, key);
}

function isAsyncComponentFactory(
	component: Component | (() => Promise<Component>),
): component is () => Promise<Component> {
	return typeof component === 'function';
}

/**
 * The shell's own loader for the key, else the lazy loader of a modal that a module
 * registered. `undefined` when neither has one.
 */
function loaderFor(key: string): (() => Promise<unknown>) | undefined {
	if (isLazyModalKey(key)) return lazyModalLoaders[key];

	const component = modalRegistry.get(key)?.component;
	return component && isAsyncComponentFactory(component) ? component : undefined;
}

async function prefetch(key: string): Promise<void> {
	const load = loaderFor(key);
	if (!load) return;

	runningPrefetches++;
	try {
		await load();
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
 *
 * `enabled` tells if the page can open the modals now. The prefetch starts when it first
 * returns true, so it can depend on data that loads after mount.
 */
export function usePrefetchModals(
	keys: readonly LazyModalKey[],
	options: { enabled?: () => boolean } = {},
): void {
	useModalPrefetch(keys, options);
}

/**
 * Same as `usePrefetchModals`, for any modal key. A key in `lazyModalLoaders` uses that
 * loader. Another key uses the lazy component of the modal that a module registered in
 * `modalRegistry`. A key with no lazy loader does nothing.
 *
 * The shell gives this to modules as the `modalPrefetch` capability.
 */
export function useModalPrefetch(
	keys: readonly string[],
	options: { enabled?: () => boolean } = {},
): void {
	let cancelPending: (() => void) | undefined;
	let stopWatching: WatchStopHandle | undefined;
	let started = false;
	let unmounted = false;

	function prefetchFrom(index: number) {
		const key = keys[index];
		if (unmounted || key === undefined) return;

		cancelPending = onIdle(() => {
			cancelPending = undefined;
			void prefetch(key).then(() => prefetchFrom(index + 1));
		});
	}

	function start() {
		if (started) return;
		started = true;
		stopWatching?.();
		prefetchFrom(0);
	}

	onMounted(() => {
		if (isSaveDataOn()) return;

		const { enabled } = options;
		if (!enabled) {
			start();
			return;
		}

		stopWatching = watch(enabled, (isEnabled) => isEnabled && start(), { immediate: true });
		// With `immediate`, `start` can run before `stopWatching` exists.
		if (started) stopWatching();
	});

	onBeforeUnmount(() => {
		unmounted = true;
		stopWatching?.();
		cancelPending?.();
	});
}
