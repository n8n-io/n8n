import { VIEWS } from '@n8n/frontend-constants/views';
import { useSettingsStore } from '@n8n/stores/settings.store';
import { createPinia, setActivePinia } from 'pinia';
import type { NavigationGuard, RouteLocationNormalized } from 'vue-router';

import { SCIM_SETTINGS_VIEW } from './scim.constants';
import { ScimModule, isScimUiAvailable } from './scim.module';

type ScimModuleSettings = NonNullable<
	ReturnType<typeof useSettingsStore>['moduleSettings']['scim']
>;

const scimSettings = (overrides: Partial<ScimModuleSettings> = {}): ScimModuleSettings => ({
	scimEnabled: false,
	hasToken: false,
	available: true,
	optInSource: 'config',
	...overrides,
});

function setup(options: { active: boolean; scim?: ScimModuleSettings | undefined }) {
	const settingsStore = useSettingsStore();
	settingsStore.settings.activeModules = options.active ? ['scim'] : [];
	settingsStore.moduleSettings = options.scim ? { scim: options.scim } : {};
	return settingsStore;
}

const route = () => ScimModule.routes?.[0];

describe('ScimModule', () => {
	beforeEach(() => {
		setActivePinia(createPinia());
	});

	describe('route', () => {
		it('mounts the page under the SSO settings path with its own route name', () => {
			expect(SCIM_SETTINGS_VIEW).toBe('ScimSettings');
			expect(route()).toMatchObject({ path: 'sso/scim', name: 'ScimSettings' });
		});

		it('keeps the rbac middleware, which gates direct URL access', () => {
			expect(route()?.meta).toMatchObject({
				layout: 'settings',
				middleware: ['authenticated', 'rbac', 'custom'],
				middlewareOptions: { rbac: { scope: 'scim:manage' } },
			});
		});

		it('registers the page view under the settings category with the feature and opt-in source', () => {
			setup({ active: true, scim: scimSettings({ optInSource: 'flag' }) });
			const telemetry = route()?.meta?.telemetry as {
				pageCategory: string;
				getProperties: () => Record<string, unknown>;
			};

			expect(telemetry.pageCategory).toBe('settings');
			expect(telemetry.getProperties()).toEqual({ feature: 'scim', opt_in_source: 'flag' });
		});

		it('loads the view lazily, so the shell does not pull it in at boot', () => {
			expect(typeof route()?.component).toBe('function');
		});

		it('has no sidebar item: SCIM is a sub-page of SSO', () => {
			expect('settingsPages' in ScimModule).toBe(false);
		});
	});

	describe('guard', () => {
		const runGuard = () => {
			const guard = route()?.beforeEnter as NavigationGuard | undefined;
			if (typeof guard !== 'function') throw new Error('beforeEnter is not a function');
			const location = {} as RouteLocationNormalized;
			return guard(location, location, vi.fn());
		};

		it('redirects to the SSO settings while the module is inactive', () => {
			setup({ active: false, scim: scimSettings() });

			expect(runGuard()).toEqual({ name: VIEWS.SSO_SETTINGS });
			expect(isScimUiAvailable()).toBe(false);
		});

		it('redirects to the SSO settings while the backend opt-in is off', () => {
			setup({ active: true, scim: scimSettings({ available: false, optInSource: null }) });

			expect(runGuard()).toEqual({ name: VIEWS.SSO_SETTINGS });
		});

		it('redirects to the SSO settings before the module settings are loaded', () => {
			setup({ active: true, scim: undefined });

			expect(runGuard()).toEqual({ name: VIEWS.SSO_SETTINGS });
		});

		it('opens the page while the module is active and the opt-in is on', () => {
			setup({ active: true, scim: scimSettings() });

			expect(runGuard()).toBe(true);
			expect(isScimUiAvailable()).toBe(true);
		});
	});
});
