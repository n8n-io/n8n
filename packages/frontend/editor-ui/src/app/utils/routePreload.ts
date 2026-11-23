import { loadRouteLocation, type RouteLocationNormalized } from 'vue-router';

/**
 * Loads the lazy components of the first route while the startup requests run.
 * Without this, the router loads them only after its guards finish.
 */

let preloadedFullPath: string | undefined;
let preload: Promise<boolean> | undefined;
let pending = false;

/**
 * Starts to load the lazy components of `to`. Only the first call has an effect.
 * The stored promise never rejects: it resolves `true` when all components loaded, and `false` when one failed.
 */
export function startRoutePreload(to: RouteLocationNormalized): void {
	if (preload) return;

	preloadedFullPath = to.fullPath;
	pending = true;
	// The executor catches a loader that throws synchronously. `loadRouteLocation` rejects
	// a location with no route record, but such a location has nothing to load.
	preload = new Promise((resolve) =>
		resolve(to.matched.length > 0 ? loadRouteLocation(to) : undefined),
	).then(
		() => true,
		() => false,
	);
	void preload.then(() => {
		pending = false;
	});
}

export function isRoutePreloadPending(): boolean {
	return pending;
}

/** Tells if `to` is the location that `startRoutePreload` loads. */
export function isPreloadedLocation(to: RouteLocationNormalized): boolean {
	return preloadedFullPath !== undefined && to.fullPath === preloadedFullPath;
}

/** Resolves `true` when the preload loaded, or when no preload started, and `false` when it failed. */
export async function awaitRoutePreload(): Promise<boolean> {
	return await (preload ?? Promise.resolve(true));
}
