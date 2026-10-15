import { createPinia, setActivePinia } from 'pinia';
import { createMemoryHistory, createRouter } from 'vue-router';
import {
	assertUniqueRouteNames,
	modalRegistry,
	pushHandlerRegistry,
} from '@n8n/frontend-module-sdk';
import type { FrontendModuleDescription } from '@n8n/frontend-module-sdk';
import { useSettingsStore } from '@n8n/stores/settings.store';
import merge from 'lodash/merge';

import router from '@/app/router';
import { VIEWS } from '@/app/constants';
import { modules } from '@/app/modules.manifest';
import {
	registerModuleModals,
	registerModulePushHandlers,
	registerModuleRoutes,
} from '@/app/moduleInitializer/moduleInitializer';
import { AGENTS_LIST_VIEW, AGENTS_SETTINGS_VIEW } from '@/features/agents/constants';
import {
	ADD_DATA_TABLE_MODAL_KEY,
	DOWNLOAD_DATA_TABLE_MODAL_KEY,
	IMPORT_CSV_MODAL_KEY,
} from '@/features/core/dataTable/constants';
import { defaultSettings } from '@n8n/frontend-test-utils';

it('keeps Agents settings reachable while the Agents routes are disabled', () => {
	setActivePinia(createPinia());
	const settings = useSettingsStore();
	settings.setSettings(merge({}, defaultSettings, { activeModules: ['agents'] }));
	settings.moduleSettings.agents = {
		enabled: false,
		modules: [],
		knowledgeBaseEnabled: false,
		proxyEnabled: false,
	};
	const stub = { render: () => null };
	const testRouter = createRouter({
		history: createMemoryHistory(),
		routes: [
			{ path: '/settings', name: VIEWS.SETTINGS, component: stub },
			{ path: '/projects/:projectId', name: VIEWS.PROJECT_DETAILS, component: stub },
		],
	});
	registerModuleRoutes(testRouter);
	const settingsRoute = testRouter.resolve({ name: AGENTS_SETTINGS_VIEW });
	const agentsRoute = testRouter.resolve({ name: AGENTS_LIST_VIEW });
	const check = settingsRoute.meta.middlewareOptions?.custom;
	expect(settingsRoute.path).toBe('/settings/agents');
	const from = testRouter.currentRoute.value;
	const next = vi.fn();
	expect(check?.({ to: { ...settingsRoute, name: AGENTS_SETTINGS_VIEW }, from, next })).toBe(true);
	expect(check?.({ to: { ...agentsRoute, name: AGENTS_LIST_VIEW }, from, next })).toBe(false);
});

describe('registerModuleModals', () => {
	beforeEach(() => {
		setActivePinia(createPinia());
		modalRegistry.clear();
	});

	it('registers a module-owned modal from its descriptor', () => {
		registerModuleModals();

		expect(modalRegistry.has(ADD_DATA_TABLE_MODAL_KEY)).toBe(true);
	});

	it.each([DOWNLOAD_DATA_TABLE_MODAL_KEY, IMPORT_CSV_MODAL_KEY])(
		'declares %s as an ad-hoc prefix, so per-row keys are not treated as unregistered',
		(prefix) => {
			registerModuleModals();

			expect(modalRegistry.isAdHocKey(`${prefix}-some-table-id`)).toBe(true);
		},
	);

	it('leaves a key that matches no declared prefix unknown', () => {
		registerModuleModals();

		expect(modalRegistry.isAdHocKey('aModalNobodyRegistered')).toBe(false);
	});

	// Post-login registration runs again after a re-login in the same page
	// session, so replaying it must stay silent and lossless.
	it('replays registration without warning and keeps every modal', () => {
		const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

		registerModuleModals();
		const keysAfterFirstRun = modalRegistry.getKeys();

		registerModuleModals();

		expect(consoleSpy).not.toHaveBeenCalled();
		expect(modalRegistry.getKeys()).toEqual(keysAfterFirstRun);

		consoleSpy.mockRestore();
	});
});

/**
 * `registerModuleRoutes` runs this guard against the real router before it adds
 * anything, so these exercise the shipped manifest rather than a stand-in.
 */
describe('module route names against the shell', () => {
	it('does not collide with any route the shell registers', () => {
		expect(() => assertUniqueRouteNames(modules, router)).not.toThrow();
	});

	it('rejects a module that claims a shell route name', () => {
		const squatter: FrontendModuleDescription = {
			id: 'squatter',
			name: 'Squatter',
			description: '',
			icon: 'box',
			routes: [{ path: '/squat', name: VIEWS.WORKFLOWS, component: { render: () => null } }],
		};

		expect(() => assertUniqueRouteNames([squatter], router)).toThrow(
			`Duplicate route name "${VIEWS.WORKFLOWS}" declared by module "squatter" — already taken by the app shell.`,
		);
	});
});

describe('registerModulePushHandlers', () => {
	const setActiveModules = (activeModules: string[]) => {
		useSettingsStore().setSettings(merge({}, defaultSettings, { activeModules }));
	};

	beforeEach(() => {
		setActivePinia(createPinia());
		pushHandlerRegistry.clear();
	});

	it('registers the handlers of an active module', () => {
		setActiveModules(['instance-ai']);

		registerModulePushHandlers();

		expect(pushHandlerRegistry.has('updateInstanceAiCredits')).toBe(true);
	});

	it('registers nothing for an inactive module', () => {
		setActiveModules([]);

		registerModulePushHandlers();

		// A claimed type also suppresses the shell's built-in handler for it.
		expect(pushHandlerRegistry.getTypes()).toEqual([]);
	});

	it('replays registration without warning', () => {
		const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
		setActiveModules(['instance-ai']);

		registerModulePushHandlers();
		registerModulePushHandlers();

		expect(consoleSpy).not.toHaveBeenCalled();
		expect(pushHandlerRegistry.has('updateInstanceAiCredits')).toBe(true);

		consoleSpy.mockRestore();
	});
});
