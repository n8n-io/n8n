import { useSettingsStore } from '@n8n/stores/settings.store';
import { createTestingPinia } from '@pinia/testing';
import { createMemoryHistory, createRouter, type RouteRecordRaw } from 'vue-router';

import { VIEWS } from '@/app/constants';
import { PromotionsModule } from '../module.descriptor';
import { PROMOTIONS_SETTINGS_VIEW } from '../promotions.constants';

const stub = { render: () => null };

// Avoid loading the view during route tests.
const moduleRoutes = (PromotionsModule.routes ?? []).map(
	(route) => ({ ...route, component: stub }) as RouteRecordRaw,
);

const createTestRouter = () =>
	createRouter({
		history: createMemoryHistory(),
		routes: [
			{ path: '/home', name: VIEWS.HOMEPAGE, component: stub },
			{ path: '/settings', component: stub, children: moduleRoutes },
		],
	});

const setup = ({ flag = 'true' } = {}) => {
	createTestingPinia({ stubActions: false });

	const settingsStore = useSettingsStore();
	settingsStore.settings.activeModules = ['promotions'];
	settingsStore.settings.envFeatureFlags = { N8N_ENV_FEAT_PROMOTIONS: flag };
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
