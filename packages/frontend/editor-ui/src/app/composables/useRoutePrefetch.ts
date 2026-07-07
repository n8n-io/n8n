import { useRouter } from 'vue-router';
import type { RouteLocationRaw } from 'vue-router';

// Fallback when requestIdleCallback is unavailable (Safari).
const IDLE_FALLBACK_MS = 200;

// Keyed by resolved path; import() dedupes per module anyway, this just skips
// re-resolving targets every time a tab bar recomputes its options.
const prefetchedPaths = new Set<string>();

function isLazyLoader(value: unknown): value is () => unknown {
	return typeof value === 'function';
}

/**
 * Warm the lazy-loaded view chunks behind navigation targets (tabs, menus) so
 * the user's first click doesn't pay the chunk download with a content flash.
 * Prefetching runs at browser idle and failures are ignored — a failed
 * prefetch just means the click loads the chunk as it does today.
 */
export function useRoutePrefetch() {
	const router = useRouter();

	function prefetchRouteComponents(target: RouteLocationRaw): void {
		try {
			const resolved = router.resolve(target);
			if (prefetchedPaths.has(resolved.fullPath)) return;
			prefetchedPaths.add(resolved.fullPath);
			for (const record of resolved.matched) {
				for (const rawComponent of Object.values(record.components ?? {})) {
					if (!isLazyLoader(rawComponent)) continue;
					try {
						const result = rawComponent();
						if (result instanceof Promise) {
							result.catch(() => {});
						}
					} catch {}
				}
			}
		} catch {}
	}

	function prefetchOnIdle(targets: RouteLocationRaw[]): void {
		if (targets.length === 0) return;
		const run = () => targets.forEach(prefetchRouteComponents);
		if (typeof window.requestIdleCallback === 'function') {
			window.requestIdleCallback(run);
		} else {
			window.setTimeout(run, IDLE_FALLBACK_MS);
		}
	}

	return { prefetchOnIdle };
}
