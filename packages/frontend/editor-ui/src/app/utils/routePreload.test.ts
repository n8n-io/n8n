import { createMemoryHistory, createRouter, type RouteLocationNormalized } from 'vue-router';

type RoutePreload = typeof import('@/app/utils/routePreload');

const Stub = { template: '<div />' };

function createLocations(loaders: { a: () => unknown; b: () => unknown }) {
	const router = createRouter({
		history: createMemoryHistory(),
		routes: [
			{ path: '/a', component: loaders.a },
			{ path: '/b', component: loaders.b },
		],
	});
	return {
		router,
		a: router.resolve('/a') as unknown as RouteLocationNormalized,
		b: router.resolve('/b') as unknown as RouteLocationNormalized,
	};
}

describe('routePreload', () => {
	let routePreload: RoutePreload;

	beforeEach(async () => {
		// The helper keeps its state at module level, so each test gets a fresh copy.
		vi.resetModules();
		routePreload = await import('@/app/utils/routePreload');
	});

	it('resolves true when no preload started', async () => {
		expect(routePreload.isRoutePreloadPending()).toBe(false);
		await expect(routePreload.awaitRoutePreload()).resolves.toBe(true);
	});

	it('loads the components of the location and stores them on the route record', async () => {
		const loader = vi.fn(async () => Stub);
		const { a, router } = createLocations({ a: loader, b: vi.fn() });

		routePreload.startRoutePreload(a);

		expect(loader).toHaveBeenCalledTimes(1);
		expect(routePreload.isRoutePreloadPending()).toBe(true);
		await expect(routePreload.awaitRoutePreload()).resolves.toBe(true);
		expect(routePreload.isRoutePreloadPending()).toBe(false);
		expect(router.getRoutes().find((r) => r.path === '/a')?.components?.default).toBe(Stub);
	});

	it('loads only the first location', async () => {
		const loaderA = vi.fn(async () => Stub);
		const loaderB = vi.fn(async () => Stub);
		const { a, b } = createLocations({ a: loaderA, b: loaderB });

		routePreload.startRoutePreload(a);
		routePreload.startRoutePreload(b);
		await routePreload.awaitRoutePreload();

		// The early load calls the loader, then once more to store the loaded component.
		expect(loaderA).toHaveBeenCalledTimes(2);
		expect(loaderB).not.toHaveBeenCalled();
		expect(routePreload.isPreloadedLocation(a)).toBe(true);
		expect(routePreload.isPreloadedLocation(b)).toBe(false);
	});

	it('is not the preloaded location before a preload starts', () => {
		const { a } = createLocations({ a: vi.fn(), b: vi.fn() });

		expect(routePreload.isPreloadedLocation(a)).toBe(false);
	});

	it('resolves false and does not reject when a loader rejects', async () => {
		const loader = vi.fn(async () => {
			throw new Error('Failed to fetch dynamically imported module');
		});
		const { a, router } = createLocations({ a: loader, b: vi.fn() });

		routePreload.startRoutePreload(a);

		await expect(routePreload.awaitRoutePreload()).resolves.toBe(false);
		expect(routePreload.isRoutePreloadPending()).toBe(false);
		// The router calls the loader again on its own navigation.
		expect(router.getRoutes().find((r) => r.path === '/a')?.components?.default).toBe(loader);
	});

	it('resolves false when a loader throws synchronously', async () => {
		const loader = vi.fn(() => {
			throw new Error('sync failure');
		});
		const { a } = createLocations({ a: loader, b: vi.fn() });

		expect(() => routePreload.startRoutePreload(a)).not.toThrow();
		await expect(routePreload.awaitRoutePreload()).resolves.toBe(false);
	});

	it('resolves true for a location with no route record', async () => {
		const router = createRouter({ history: createMemoryHistory(), routes: [] });
		const unknown = router.resolve('/unknown') as unknown as RouteLocationNormalized;

		routePreload.startRoutePreload(unknown);

		await expect(routePreload.awaitRoutePreload()).resolves.toBe(true);
	});

	it('does not call components that are not lazy loaders', async () => {
		const functional = Object.assign(vi.fn(), { displayName: 'Functional' });
		const loader = vi.fn(async () => Stub);
		const router = createRouter({
			history: createMemoryHistory(),
			routes: [{ path: '/a', components: { default: Stub, functional, lazy: loader } }],
		});

		routePreload.startRoutePreload(router.resolve('/a') as unknown as RouteLocationNormalized);

		await expect(routePreload.awaitRoutePreload()).resolves.toBe(true);
		expect(functional).not.toHaveBeenCalled();
		expect(loader).toHaveBeenCalled();
	});

	it('resolves true for a route without lazy components', async () => {
		const router = createRouter({
			history: createMemoryHistory(),
			routes: [{ path: '/a', component: Stub }],
		});

		routePreload.startRoutePreload(router.resolve('/a') as unknown as RouteLocationNormalized);

		await expect(routePreload.awaitRoutePreload()).resolves.toBe(true);
	});

	it('resolves false and does not reject when a loader resolves no component', async () => {
		const { a } = createLocations({ a: vi.fn(async () => undefined), b: vi.fn() });

		routePreload.startRoutePreload(a);

		await expect(routePreload.awaitRoutePreload()).resolves.toBe(false);
	});

	it('stays pending while a loader is pending', async () => {
		let resolveLoader: (value: unknown) => void = () => {};
		// Like `import()`, every call returns the same module promise.
		const loaded = new Promise((resolve) => {
			resolveLoader = resolve;
		});
		const loader = vi.fn(async () => await loaded);
		const { a } = createLocations({ a: loader, b: vi.fn() });

		routePreload.startRoutePreload(a);
		await Promise.resolve();
		expect(routePreload.isRoutePreloadPending()).toBe(true);

		resolveLoader(Stub);
		await expect(routePreload.awaitRoutePreload()).resolves.toBe(true);
		expect(routePreload.isRoutePreloadPending()).toBe(false);
	});
});

describe('routePreload with the vite:preloadError handler', () => {
	let routePreload: RoutePreload;
	let reloadSpy: ReturnType<typeof vi.fn>;
	let unregister: () => void;
	let originalLocation: Location;

	/** Fails like Vite's `__vitePreload`: it dispatches the event, then rejects unless a listener prevented it. */
	function viteLikeFailingLoader(delayMs: number) {
		return async () => {
			await new Promise((resolve) => setTimeout(resolve, delayMs));
			const event = new Event('vite:preloadError', { cancelable: true });
			window.dispatchEvent(event);
			if (!event.defaultPrevented) throw new Error('Failed to fetch dynamically imported module');
			return Stub;
		};
	}

	function createLocation(components: Record<string, () => unknown>) {
		const router = createRouter({
			history: createMemoryHistory(),
			routes: [{ path: '/a', components }],
		});
		return router.resolve('/a') as unknown as RouteLocationNormalized;
	}

	beforeEach(async () => {
		vi.resetModules();
		sessionStorage.clear();
		originalLocation = window.location;
		reloadSpy = vi.fn();
		Object.defineProperty(window, 'location', {
			configurable: true,
			value: { ...originalLocation, reload: reloadSpy },
		});
		routePreload = await import('@/app/utils/routePreload');
		const { registerVitePreloadErrorHandler } = await import('@/app/plugins/vitePreloadError');
		unregister = registerVitePreloadErrorHandler();
	}, 30_000);

	afterEach(() => {
		unregister();
		Object.defineProperty(window, 'location', { configurable: true, value: originalLocation });
		sessionStorage.clear();
	});

	it('does not reload when every component of the early load fails one after another', async () => {
		const location = createLocation({
			default: viteLikeFailingLoader(10),
			side: viteLikeFailingLoader(50),
		});

		routePreload.startRoutePreload(location);

		await expect(routePreload.awaitRoutePreload()).resolves.toBe(false);
		// The guard redirects, so nothing else reloads. Wait past the second failure.
		await new Promise((resolve) => setTimeout(resolve, 100));
		expect(reloadSpy).not.toHaveBeenCalled();
	});

	it('stays pending until every component of the early load settles', async () => {
		const location = createLocation({
			default: viteLikeFailingLoader(10),
			side: viteLikeFailingLoader(50),
		});

		routePreload.startRoutePreload(location);
		await new Promise((resolve) => setTimeout(resolve, 30));

		expect(routePreload.isRoutePreloadPending()).toBe(true);
		await routePreload.awaitRoutePreload();
		expect(routePreload.isRoutePreloadPending()).toBe(false);
	});
});
