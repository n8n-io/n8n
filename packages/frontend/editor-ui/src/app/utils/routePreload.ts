import { loadRouteLocation, type RouteLocationNormalized } from 'vue-router';

/**
 * Loads the lazy components of the first route while the startup requests run.
 * Without this, the router loads them only after its guards finish.
 */

let preloadedFullPath: string | undefined;
let preload: Promise<boolean> | undefined;
let pending = false;

/** The same check that Vue Router uses to find a lazy component. */
function isLazyComponent(component: unknown): component is () => Promise<unknown> {
	return typeof component === 'function' && !('displayName' in component);
}

async function loadComponents(to: RouteLocationNormalized): Promise<boolean> {
	const loads = to.matched.flatMap((record) =>
		Object.values(record.components ?? {})
			.filter(isLazyComponent)
			// `async` catches a loader that throws synchronously.
			.map(async (load) => await load()),
	);
	// Wait for every loader, not only until the first one fails: a loader that fails later
	// dispatches `vite:preloadError` too, and the handler must still treat it as part of this load.
	const results = await Promise.allSettled(loads);
	if (results.some((result) => result.status === 'rejected')) return false;

	// Store the components on the route records, so that the router does not load them again.
	// The modules are loaded, so the loaders resolve without a request.
	if (loads.length > 0) await loadRouteLocation(to);
	return true;
}

/**
 * Starts to load the lazy components of `to`. Only the first call has an effect.
 * The stored promise never rejects: it resolves `true` when all components loaded, and `false` when one failed.
 * It settles only after every loader has settled.
 */
export function startRoutePreload(to: RouteLocationNormalized): void {
	if (preload) return;

	preloadedFullPath = to.fullPath;
	pending = true;
	preload = loadComponents(to).catch(() => false);
	void preload.then(() => {
		pending = false;
	});
}

export function isRoutePreloadPending(): boolean {
	return pending;
}

/** Tells if `to` is the location that `startRoutePreload` loads. */
export function isPreloadedLocation(to: RouteLocationNormalized): boolean {
	return to.fullPath === preloadedFullPath;
}

/** Resolves `true` when the preload loaded, or when no preload started, and `false` when it failed. */
export async function awaitRoutePreload(): Promise<boolean> {
	return await (preload ?? Promise.resolve(true));
}
