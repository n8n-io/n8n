import type { Scope } from '@n8n/permissions';
import { useRBACStore } from '@n8n/stores/rbac.store';
import { useSettingsStore } from '@n8n/stores/settings.store';
import { createTestingPinia } from '@pinia/testing';
import { createMemoryHistory, createRouter, type RouteRecordRaw } from 'vue-router';

import { VIEWS } from '@/app/constants';
import { PromotionsModule } from '../module.descriptor';
import { PROMOTION_PREVIEW_VIEWS, PROMOTIONS_SETTINGS_VIEW } from '../promotions.constants';

const stub = { render: () => null };

// Avoid loading the views during route tests.
const moduleRoutes = (PromotionsModule.routes ?? []).map(
	(route) =>
		({
			...route,
			component: stub,
			children: route.children?.map((child) => ({ ...child, component: stub })),
		}) as RouteRecordRaw,
);
const settingsRoutes = moduleRoutes.filter((route) => !route.meta?.projectRoute);
const projectRoutes = moduleRoutes.filter((route) => route.meta?.projectRoute);

const createTestRouter = () =>
	createRouter({
		history: createMemoryHistory(),
		routes: [
			{ path: '/home', name: VIEWS.HOMEPAGE, component: stub },
			{ path: '/settings', component: stub, children: settingsRoutes },
			{ path: '/projects/:projectId', component: stub, children: projectRoutes },
		],
	});

const setup = ({
	flag = 'true',
	scopes = ['gitConnection:read', 'gitConnection:push', 'gitConnection:pull'] as Scope[],
} = {}) => {
	createTestingPinia({ stubActions: false });

	const settingsStore = useSettingsStore();
	settingsStore.settings.activeModules = ['promotions'];
	settingsStore.settings.envFeatureFlags = { N8N_ENV_FEAT_PROMOTIONS: flag };
	// Project scopes stay empty, as in the app, where the frontend does not load them.
	useRBACStore().setGlobalScopes(scopes);
};

describe('PromotionsModule settings route', () => {
	it('opens settings when promotions are enabled', async () => {
		setup();
		const router = createTestRouter();

		await router.push('/settings/promotions');

		expect(router.currentRoute.value.name).toBe(PROMOTIONS_SETTINGS_VIEW);
	});

	it('redirects to home when the feature flag is off', async () => {
		setup({ flag: 'false' });
		const router = createTestRouter();

		await router.push('/settings/promotions');

		expect(router.currentRoute.value.name).toBe(VIEWS.HOMEPAGE);
	});
});

describe('PromotionsModule preview routes', () => {
	it('opens the apply preview of a project with the direction from the route', async () => {
		setup();
		const router = createTestRouter();

		await router.push('/projects/p1/promotions/apply');

		const route = router.currentRoute.value;
		expect(route.name).toBe(PROMOTION_PREVIEW_VIEWS.apply);
		const props = route.matched.at(-1)?.props.default;
		expect(typeof props === 'function' ? props(route) : props).toEqual({
			projectId: 'p1',
			direction: 'apply',
		});
	});

	it('leads users who cannot apply changes home', async () => {
		setup({ scopes: ['gitConnection:read', 'gitConnection:push'] });
		const router = createTestRouter();

		await router.push('/projects/p1/promotions/apply');

		expect(router.currentRoute.value.name).toBe(VIEWS.HOMEPAGE);
	});

	it('redirects to home when the feature flag is off', async () => {
		setup({ flag: 'false' });
		const router = createTestRouter();

		await router.push('/projects/p1/promotions/promote');

		expect(router.currentRoute.value.name).toBe(VIEWS.HOMEPAGE);
	});
});
