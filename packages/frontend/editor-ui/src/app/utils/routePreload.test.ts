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

		expect(loaderA).toHaveBeenCalledTimes(1);
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

	it('stays pending while a loader is pending', async () => {
		let resolveLoader: (value: unknown) => void = () => {};
		const loader = vi.fn(
			async () =>
				await new Promise((resolve) => {
					resolveLoader = resolve;
				}),
		);
		const { a } = createLocations({ a: loader, b: vi.fn() });

		routePreload.startRoutePreload(a);
		await Promise.resolve();
		expect(routePreload.isRoutePreloadPending()).toBe(true);

		resolveLoader(Stub);
		await expect(routePreload.awaitRoutePreload()).resolves.toBe(true);
		expect(routePreload.isRoutePreloadPending()).toBe(false);
	});
});
