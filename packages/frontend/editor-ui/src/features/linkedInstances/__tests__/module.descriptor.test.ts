import { defaultSettings } from '@n8n/frontend-test-utils';
import { i18nInstance, setLanguage } from '@n8n/i18n';
import type { Scope } from '@n8n/permissions';
import { useRBACStore } from '@n8n/stores/rbac.store';
import { useSettingsStore } from '@n8n/stores/settings.store';
import merge from 'lodash/merge';
import { createPinia, setActivePinia } from 'pinia';
import { createMemoryHistory, createRouter } from 'vue-router';

import { VIEWS } from '@/app/constants';
import { modules } from '@/app/modules.manifest';
import { registerModuleRoutes } from '@/app/moduleInitializer/moduleInitializer';
import { useUIStore } from '@/app/stores/ui.store';

import {
	LINKED_INSTANCES_MODULE_ID,
	LINKED_INSTANCES_SETTINGS_VIEW,
} from '../linkedInstances.constants';
import { LinkedInstancesModule } from '../module.descriptor';

const ITEM_ID = 'settings-linked-instances';

function activateModules(activeModules: string[]) {
	useSettingsStore().setSettings(merge({}, defaultSettings, { activeModules }));
}

describe('LinkedInstancesModule', () => {
	const settingsPage = () =>
		LinkedInstancesModule.settingsPages?.find((item) => item.id === ITEM_ID);

	beforeEach(() => {
		setActivePinia(createPinia());
	});

	it('uses the name of the backend module, so the shell can gate it', () => {
		expect(LinkedInstancesModule.id).toBe('linked-instances');
		expect(modules).toContain(LinkedInstancesModule);
	});

	describe('settings sidebar item', () => {
		const withScopes = (scopes: Scope[]) => {
			useRBACStore().setGlobalScopes(scopes);
			return settingsPage();
		};

		it('hides the item from a user without the scope to message the Assistant', () => {
			expect(withScopes([])?.available).toBe(false);
			expect(withScopes(['instanceAi:manage'])?.available).toBe(false);
		});

		it('shows the item to a user who can message the Assistant', () => {
			expect(withScopes(['instanceAi:message'])?.available).toBe(true);
		});

		it('reads the scope again when it changes after registration', () => {
			const item = withScopes([]);

			useRBACStore().addGlobalScope('instanceAi:message');

			expect(item?.available).toBe(true);
		});

		it('links to the settings page', () => {
			expect(settingsPage()?.route).toEqual({ to: { name: LINKED_INSTANCES_SETTINGS_VIEW } });
		});

		describe('in the settings sidebar', () => {
			const sidebarItem = ({ moduleActive }: { moduleActive: boolean }) => {
				activateModules(moduleActive ? [LINKED_INSTANCES_MODULE_ID] : []);
				useRBACStore().setGlobalScopes(['instanceAi:message']);
				const uiStore = useUIStore();
				uiStore.registerSettingsPages(
					LINKED_INSTANCES_MODULE_ID,
					LinkedInstancesModule.settingsPages ?? [],
				);
				return uiStore.settingsSidebarItems.find((item) => item.id === ITEM_ID);
			};

			it('lists the item while the module is active', () => {
				expect(sidebarItem({ moduleActive: true })?.available).toBe(true);
			});

			it('drops the item while the module is off, even for a user with the scope', () => {
				expect(sidebarItem({ moduleActive: false })).toBeUndefined();
			});
		});
	});

	describe('label', () => {
		afterEach(() => {
			setLanguage('en');
		});

		it('reads the label from i18n', () => {
			expect(settingsPage()?.label).toBe('Linked instances');
		});

		it('reads i18n lazily, not when the descriptor is imported', () => {
			const descriptor = Object.getOwnPropertyDescriptor(settingsPage(), 'label');

			expect(typeof descriptor?.get).toBe('function');
		});

		it('follows a language change after registration', () => {
			const item = settingsPage();
			i18nInstance.global.mergeLocaleMessage(
				'de',
				Object.fromEntries([['settings.linkedInstances', 'Verknüpfte Instanzen']]),
			);

			setLanguage('de');

			expect(item?.label).toBe('Verknüpfte Instanzen');
		});
	});

	describe('route', () => {
		const route = () => LinkedInstancesModule.routes?.[0];

		it('loads the view lazily, so the shell does not pull it in at boot', () => {
			expect(typeof route()?.component).toBe('function');
		});

		it('requires sign-in, the scope and an active module', () => {
			expect(route()?.meta?.middleware).toEqual(['authenticated', 'rbac', 'custom']);
			expect(route()?.meta?.middlewareOptions?.rbac).toEqual({ scope: 'instanceAi:message' });
		});

		describe('when the shell registers it', () => {
			const resolveSettingsRoute = () => {
				const stub = { render: () => null };
				const router = createRouter({
					history: createMemoryHistory(),
					routes: [
						{ path: '/settings', name: VIEWS.SETTINGS, component: stub },
						{ path: '/projects/:projectId', name: VIEWS.PROJECT_DETAILS, component: stub },
					],
				});
				registerModuleRoutes(router);
				return { router, resolved: router.resolve({ name: LINKED_INSTANCES_SETTINGS_VIEW }) };
			};

			const isAllowed = () => {
				const { router, resolved } = resolveSettingsRoute();
				const check = resolved.meta.middlewareOptions?.custom;
				return check?.({
					to: { ...resolved, name: LINKED_INSTANCES_SETTINGS_VIEW },
					from: router.currentRoute.value,
					next: vi.fn(),
				});
			};

			it('puts the page under the settings route and keeps the scope check', () => {
				const { resolved } = resolveSettingsRoute();

				expect(resolved.path).toBe('/settings/linked-instances');
				expect(resolved.meta.middlewareOptions?.rbac).toEqual({ scope: 'instanceAi:message' });
			});

			it('opens the page while the module is active', () => {
				activateModules([LINKED_INSTANCES_MODULE_ID]);

				expect(isAllowed()).toBe(true);
			});

			it('hides the page while the module is off', () => {
				activateModules([]);

				expect(isAllowed()).toBe(false);
			});

			it('hides the page when only other modules are active', () => {
				activateModules(['instance-ai', 'mcp']);

				expect(isAllowed()).toBe(false);
			});
		});
	});
});
