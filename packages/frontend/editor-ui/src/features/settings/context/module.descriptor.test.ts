import { createTestingPinia } from '@pinia/testing';
import type { FrontendModuleSettings, FrontendSettings } from '@n8n/api-types';
import { createMemoryHistory, createRouter, type RouteRecordRaw } from 'vue-router';

import { VIEWS } from '@/app/constants';
import { useSettingsStore } from '@n8n/stores/settings.store';

import { ContextModule } from './module.descriptor';

const stub = { render: () => null };

const permissions = vi.hoisted(() => ({ managePreferences: false }));

vi.mock('@/app/utils/rbac/permissions', () => ({
	hasPermission: () => permissions.managePreferences,
}));

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

const setup = (
	agentsActive = false,
	moduleSettings: FrontendModuleSettings = {},
	preferencesSwitchOn = true,
) => {
	createTestingPinia({ stubActions: false });
	const settingsStore = useSettingsStore();
	settingsStore.settings = {
		activeModules: agentsActive ? ['skills', 'agents'] : [],
		aiPreferences: { enabled: preferencesSwitchOn, managedByEnv: false },
	} as unknown as FrontendSettings;
	settingsStore.moduleSettings = moduleSettings;
	permissions.managePreferences = false;
};

const allConsumersOff = {
	agents: { enabled: false },
	'instance-ai': { enabled: false },
	mcp: { mcpAccessEnabled: false },
} as FrontendModuleSettings;

describe('ContextModule routes', () => {
	test('opens the context page without a flag or an active module', async () => {
		setup();
		const router = createTestRouter();

		await router.push('/settings/context');

		expect(router.currentRoute.value.name).toBe(VIEWS.SETTINGS_CONTEXT);
	});

	describe('preferences', () => {
		test.each([
			{ 'instance-ai': { enabled: true } },
			{ mcp: { mcpAccessEnabled: true } },
		] as FrontendModuleSettings[])(
			'opens the preferences page while one consumer is on: %o',
			async (consumerOn) => {
				setup(false, { ...allConsumersOff, ...consumerOn });
				const router = createTestRouter();

				await router.push('/settings/context/preferences');

				expect(router.currentRoute.value.name).toBe(VIEWS.SETTINGS_CONTEXT_PREFERENCES);
			},
		);

		test.each([
			{ name: 'the switch is off', moduleSettings: { mcp: { mcpAccessEnabled: true } }, on: false },
			{ name: 'every consumer is off', moduleSettings: allConsumersOff, on: true },
		])('sends a member to the homepage when $name', async ({ moduleSettings, on }) => {
			setup(false, moduleSettings as FrontendModuleSettings, on);
			const router = createTestRouter();

			await router.push('/settings/context/preferences');

			expect(router.currentRoute.value.name).toBe(VIEWS.HOMEPAGE);
		});

		test('opens the preferences page for an admin while preferences are off', async () => {
			setup(false, allConsumersOff, false);
			permissions.managePreferences = true;
			const router = createTestRouter();

			await router.push('/settings/context/preferences');

			expect(router.currentRoute.value.name).toBe(VIEWS.SETTINGS_CONTEXT_PREFERENCES);
		});
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

		test.each<{ agentsActive: boolean; moduleSettings: FrontendModuleSettings }>([
			{ agentsActive: true, moduleSettings: allConsumersOff },
			{ agentsActive: true, moduleSettings: {} },
			{
				agentsActive: false,
				moduleSettings: { ...allConsumersOff, agents: { enabled: true } } as FrontendModuleSettings,
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
