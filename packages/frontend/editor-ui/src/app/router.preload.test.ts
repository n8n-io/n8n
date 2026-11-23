import type { Mock } from 'vitest';

vi.mock('@/app/init', () => ({
	initializeCore: vi.fn(async () => {}),
	initializeAuthenticatedFeatures: vi.fn(async () => {}),
}));

vi.mock('@/app/plugins/vitePreloadError', () => ({
	reloadAfterPreloadError: vi.fn(() => false),
}));

vi.mock('vue-router', async (importOriginal) => {
	const actual = await importOriginal<typeof import('vue-router')>();
	return { ...actual, loadRouteLocation: vi.fn(actual.loadRouteLocation) };
});

const Stub = { template: '<div />' };

type Router = typeof import('@/app/router')['default'];

describe('router: early load of the first route', () => {
	let router: Router;
	let VIEWS: typeof import('@/app/constants').VIEWS;
	let initializeAuthenticatedFeatures: Mock;
	let reloadAfterPreloadError: Mock;
	let loadRouteLocation: Mock;
	let signIn: () => void;
	let resolveInitialization: () => void;

	/**
	 * Replaces the loader of each lazy component of the route of `path` with `loader`.
	 * Returns how many loaders it replaced.
	 */
	function setLoader(path: string, loader: () => unknown) {
		let replaced = 0;
		for (const record of router.resolve(path).matched) {
			for (const name of Object.keys(record.components ?? {})) {
				const component = record.components?.[name];
				if (typeof component === 'function' && record.components) {
					record.components[name] = loader as never;
					replaced++;
				}
			}
		}
		return replaced;
	}

	// The first import of the router's module graph is slow, mostly in CI with coverage.
	// Do it once here, so that each `beforeEach` only evaluates the transformed modules again.
	beforeAll(async () => {
		await import('@/app/router');
	}, 60_000);

	beforeEach(async () => {
		// `router.ts` creates one router at module level, and the early load starts only once.
		// Fresh modules give each test its own first navigation.
		vi.resetModules();

		const { createPinia, setActivePinia } = await import('pinia');
		setActivePinia(createPinia());

		router = (await import('@/app/router')).default;
		({ VIEWS } = await import('@/app/constants'));

		const init = await import('@/app/init');
		initializeAuthenticatedFeatures = vi.mocked(init.initializeAuthenticatedFeatures);
		// Hold the startup until the test releases it, to see what starts before it ends.
		// One gate for all guard runs, so that a redirect does not wait for a new one.
		const startup = new Promise<void>((resolve) => {
			resolveInitialization = resolve;
		});
		initializeAuthenticatedFeatures.mockImplementation(async () => await startup);

		reloadAfterPreloadError = vi.mocked(
			(await import('@/app/plugins/vitePreloadError')).reloadAfterPreloadError,
		);
		loadRouteLocation = vi.mocked((await import('vue-router')).loadRouteLocation);

		const { useUsersStore } = await import('@n8n/stores/users.store');
		const { createUser } = await import('@/__tests__/data/users');
		signIn = () => {
			const usersStore = useUsersStore();
			const user = createUser();
			usersStore.addUsers([user]);
			usersStore.currentUserId = user.id;
		};

		setLoader('/signin', async () => Stub);
	}, 30_000);

	/** Waits until the guard waits for the startup, then checks that the early load started. */
	async function expectEarlyLoadStarted(loader: Mock) {
		await vi.waitFor(() => expect(initializeAuthenticatedFeatures).toHaveBeenCalled());
		expect(loader).toHaveBeenCalled();
	}

	it('calls the loader of the first route before the startup ends', async () => {
		signIn();
		const loader = vi.fn(async () => Stub);
		setLoader('/workflow/abc', loader);

		const navigation = router.push('/workflow/abc');
		await expectEarlyLoadStarted(loader);

		resolveInitialization();
		await navigation;

		expect(router.currentRoute.value.name).toBe(VIEWS.WORKFLOW);
		// The early load calls it, then once more to store the loaded component.
		// The router uses the stored component and does not call it.
		expect(loader).toHaveBeenCalledTimes(2);
		expect(reloadAfterPreloadError).not.toHaveBeenCalled();
	});

	it('loads the route as before when the early load fails and no reload happens', async () => {
		signIn();
		reloadAfterPreloadError.mockReturnValue(false);
		const loader = vi
			.fn()
			.mockRejectedValueOnce(new Error('Failed to fetch dynamically imported module'))
			.mockResolvedValue(Stub);
		setLoader('/workflow/abc', loader);

		const navigation = router.push('/workflow/abc');
		await expectEarlyLoadStarted(loader);

		resolveInitialization();
		await navigation;

		expect(router.currentRoute.value.name).toBe(VIEWS.WORKFLOW);
		// The early load, then the router's own call.
		expect(loader).toHaveBeenCalledTimes(2);
		expect(reloadAfterPreloadError).toHaveBeenCalledTimes(1);
	});

	it('does not reload when the early load fails and the guard redirects', async () => {
		const loader = vi.fn().mockRejectedValue(new Error('Failed to fetch'));
		setLoader('/workflow/abc', loader);

		const navigation = router.push('/workflow/abc');
		await expectEarlyLoadStarted(loader);

		resolveInitialization();
		await navigation;

		expect(router.currentRoute.value.name).toBe(VIEWS.SIGNIN);
		expect(loader).toHaveBeenCalledTimes(1);
		expect(reloadAfterPreloadError).not.toHaveBeenCalled();
	});

	it('reloads once when the early load fails and the guard allows the route', async () => {
		signIn();
		reloadAfterPreloadError.mockReturnValue(true);
		const loader = vi
			.fn()
			.mockRejectedValueOnce(new Error('Failed to fetch'))
			.mockResolvedValue(Stub);
		setLoader('/workflow/abc', loader);

		const navigation = router.push('/workflow/abc');
		await expectEarlyLoadStarted(loader);

		resolveInitialization();
		await navigation;

		expect(reloadAfterPreloadError).toHaveBeenCalledTimes(1);
	});

	it('does not make a redirect target wait for a pending early load', async () => {
		const loader = vi.fn(async () => await new Promise(() => {}));
		setLoader('/workflow/abc', loader);

		const navigation = router.push('/workflow/abc');
		await expectEarlyLoadStarted(loader);

		resolveInitialization();
		await navigation;

		expect(router.currentRoute.value.name).toBe(VIEWS.SIGNIN);
		expect(reloadAfterPreloadError).not.toHaveBeenCalled();
	});

	it('does not reload when the user opens the preloaded route after sign-in', async () => {
		const loader = vi
			.fn()
			.mockRejectedValueOnce(new Error('Failed to fetch'))
			.mockResolvedValue(Stub);
		setLoader('/workflow/abc', loader);

		const firstNavigation = router.push('/workflow/abc');
		await expectEarlyLoadStarted(loader);
		resolveInitialization();
		await firstNavigation;
		expect(router.currentRoute.value.name).toBe(VIEWS.SIGNIN);

		signIn();
		await router.push('/workflow/abc');

		expect(router.currentRoute.value.name).toBe(VIEWS.WORKFLOW);
		// The early load, then the router's own call on the second navigation.
		expect(loader).toHaveBeenCalledTimes(2);
		expect(reloadAfterPreloadError).not.toHaveBeenCalled();
	});

	it('loads later routes only through the router', async () => {
		signIn();
		const firstLoader = vi.fn(async () => Stub);
		const secondLoader = vi.fn(async () => Stub);
		setLoader('/workflow/abc', firstLoader);
		const secondLoaderSlots = setLoader('/settings/personal', secondLoader);

		const firstNavigation = router.push('/workflow/abc');
		await expectEarlyLoadStarted(firstLoader);
		resolveInitialization();
		await firstNavigation;

		await router.push('/settings/personal');

		expect(router.currentRoute.value.name).toBe(VIEWS.PERSONAL_SETTINGS);
		expect(loadRouteLocation).toHaveBeenCalledTimes(1);
		expect(loadRouteLocation).toHaveBeenCalledWith(
			expect.objectContaining({ fullPath: '/workflow/abc' }),
		);
		// The early load only: it calls the loader, then once more to store the loaded component.
		expect(firstLoader).toHaveBeenCalledTimes(2);
		// The router calls each loader of the second route once.
		expect(secondLoaderSlots).toBeGreaterThan(0);
		expect(secondLoader).toHaveBeenCalledTimes(secondLoaderSlots);
	});
});
