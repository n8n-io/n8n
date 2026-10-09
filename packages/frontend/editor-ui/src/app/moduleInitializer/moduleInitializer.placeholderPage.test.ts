import type { FrontendModuleDescription } from '@n8n/frontend-module-sdk';
import { useSettingsStore } from '@n8n/stores/settings.store';
import { createPinia, setActivePinia } from 'pinia';
import { h } from 'vue';
import { createMemoryHistory, createRouter, type Router, type RouteRecordRaw } from 'vue-router';

import { VIEWS } from '@/app/constants';
import type { RouterMiddlewareType } from '@/app/types/router';
import { registerModuleRoutes } from '@/app/moduleInitializer/moduleInitializer';

const { fixtures } = vi.hoisted(() => {
	const view = (text: string) => ({ name: text, render: () => h('div', text) });
	const route = (
		name: string,
		middleware: RouterMiddlewareType[] = ['custom'],
	): RouteRecordRaw => ({
		path: `/${name}`,
		name,
		component: async () => await Promise.resolve(view(`${name}-view`)),
		meta: { middleware },
	});

	const modules: FrontendModuleDescription[] = [
		{
			id: 'with-placeholder',
			name: 'With placeholder',
			description: '',
			icon: 'box',
			routes: [route('with-placeholder'), route('with-placeholder-unguarded', ['authenticated'])],
			placeholderPage: {
				licenseFlag: 'logStreaming',
				component: async () => await Promise.resolve(view('paywall')),
			},
		},
		{
			id: 'without-placeholder',
			name: 'Without placeholder',
			description: '',
			icon: 'box',
			routes: [route('without-placeholder')],
		},
	];

	return { fixtures: modules };
});

vi.mock('@/app/modules.manifest', () => ({ modules: fixtures }));

const setInstance = ({
	activeModules = [],
	licensed = false,
}: { activeModules?: string[]; licensed?: boolean } = {}) => {
	const settingsStore = useSettingsStore();
	settingsStore.settings = {
		...settingsStore.settings,
		activeModules,
		enterprise: { ...settingsStore.settings.enterprise, logStreaming: licensed },
	};
};

const createTestRouter = () => {
	const stub = { render: () => null };
	const router = createRouter({
		history: createMemoryHistory(),
		routes: [
			{ path: '/settings', name: VIEWS.SETTINGS, component: stub },
			{ path: '/projects/:projectId', name: VIEWS.PROJECT_DETAILS, component: stub },
		],
	});
	registerModuleRoutes(router);
	return router;
};

// Like the router, runs the guard only when the route lists 'custom'
const checkRoute = (router: Router, name: string) => {
	const to = router.resolve({ name });
	const check = to.meta.middleware?.includes('custom')
		? to.meta.middlewareOptions?.custom
		: undefined;
	return check?.({ to: { ...to, name }, from: router.currentRoute.value, next: vi.fn() });
};

const loadRouteView = async (router: Router, name: string) => {
	const load = router.getRoutes().find((route) => route.name === name)?.components?.default as
		| (() => Promise<{ name: string }>)
		| undefined;
	return (await load?.())?.name;
};

beforeEach(() => {
	setActivePinia(createPinia());
});

describe('route guard', () => {
	it('should allow an inactive, unlicensed module route when the module declares a placeholder page', () => {
		setInstance();

		expect(checkRoute(createTestRouter(), 'with-placeholder')).toBe(true);
	});

	it('should block an inactive, licensed module route with a placeholder page', () => {
		setInstance({ licensed: true });

		expect(checkRoute(createTestRouter(), 'with-placeholder')).toBe(false);
	});

	it('should block an inactive, licensed module route that does not list the guard', () => {
		setInstance({ licensed: true });

		expect(checkRoute(createTestRouter(), 'with-placeholder-unguarded')).toBe(false);
	});

	it('should block an inactive module route without a placeholder page', () => {
		setInstance();

		expect(checkRoute(createTestRouter(), 'without-placeholder')).toBe(false);
	});
});

describe('route component', () => {
	it('should load the placeholder page while the module is inactive', async () => {
		setInstance();

		expect(await loadRouteView(createTestRouter(), 'with-placeholder')).toBe('paywall');
	});

	it('should load the real view while the module is active', async () => {
		setInstance({ activeModules: ['with-placeholder'] });

		expect(await loadRouteView(createTestRouter(), 'with-placeholder')).toBe(
			'with-placeholder-view',
		);
	});

	it('should register routes before Pinia is installed', () => {
		setActivePinia(undefined);

		expect(() => createTestRouter()).not.toThrow();
	});
});
