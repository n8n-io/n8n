import { createTestingPinia } from '@pinia/testing';
import type { FrontendModuleSettings, FrontendSettings } from '@n8n/api-types';
import { createMemoryHistory, createRouter, type RouteRecordRaw } from 'vue-router';

import { VIEWS } from '@/app/constants';
import { useSettingsStore } from '@n8n/stores/settings.store';

import { ContextModule } from './module.descriptor';

const stub = { render: () => null };

// Avoid loading the views during route tests.
const moduleRoutes = (ContextModule.routes ?? []).map(
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

const setup = (agentsActive = false, moduleSettings: FrontendModuleSettings = {}) => {
	createTestingPinia({ stubActions: false });
	const settingsStore = useSettingsStore();
	settingsStore.settings = {
		activeModules: agentsActive ? ['skills', 'agents'] : [],
	} as unknown as FrontendSettings;
	settingsStore.moduleSettings = moduleSettings;
};

const allConsumersOff = {
	agents: { enabled: false },
	'instance-ai': { enabled: false },
	mcp: { mcpAccessEnabled: false },
} as FrontendModuleSettings;

describe('ContextModule routes', () => {
	test.each([
		['/settings/context', VIEWS.SETTINGS_CONTEXT],
		['/settings/context/preferences', VIEWS.SETTINGS_CONTEXT_PREFERENCES],
	])('opens %s without a flag or an active module', async (path, name) => {
		setup();
		const router = createTestRouter();

		await router.push(path);

		expect(router.currentRoute.value.name).toBe(name);
	});

	describe('skills', () => {
		test.each([
			{ agents: { enabled: true } },
			{ 'instance-ai': { enabled: true } },
			{ mcp: { mcpAccessEnabled: true } },
		] as FrontendModuleSettings[])(
			'opens the skills page while one consumer is on: %o',
			async (consumerOn) => {
				setup(true, { ...allConsumersOff, ...consumerOn });
				const router = createTestRouter();

				await router.push('/settings/context/skills');

				expect(router.currentRoute.value.name).toBe(VIEWS.SETTINGS_CONTEXT_SKILLS);
			},
		);

		test.each([
			{ agentsActive: true, moduleSettings: allConsumersOff },
			{ agentsActive: true, moduleSettings: {} },
			{
				agentsActive: false,
				moduleSettings: { ...allConsumersOff, agents: { enabled: true } },
			},
		])(
			'redirects to the homepage (agents module active: $agentsActive, settings: $moduleSettings)',
			async ({ agentsActive, moduleSettings }) => {
				setup(agentsActive, moduleSettings);
				const router = createTestRouter();

				await router.push('/settings/context/skills');

				expect(router.currentRoute.value.name).toBe(VIEWS.HOMEPAGE);
			},
		);
	});

	it('lists no custom middleware, so the initializer does not gate it on a backend module', () => {
		for (const route of ContextModule.routes ?? []) {
			expect(route.meta?.middleware).toEqual(['authenticated']);
			expect(route.meta?.telemetry?.pageCategory).toBe('settings');
		}
	});
});
