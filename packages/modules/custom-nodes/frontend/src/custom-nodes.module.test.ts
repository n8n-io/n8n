import { i18nInstance, setLanguage } from '@n8n/i18n';
import type { Scope } from '@n8n/permissions';
import { useRBACStore } from '@n8n/stores/rbac.store';
import { useSettingsStore } from '@n8n/stores/settings.store';
import { createPinia, setActivePinia } from 'pinia';

import { CUSTOM_NODES_SETTINGS_VIEW } from './custom-nodes.constants';
import { CustomNodesModule } from './custom-nodes.module';

describe('CustomNodesModule', () => {
	const settingsPage = () =>
		CustomNodesModule.settingsPages?.find((item) => item.id === 'settings-custom-nodes');

	const setup = ({ scopes, active }: { scopes: Scope[]; active: boolean }) => {
		useRBACStore().setGlobalScopes(scopes);
		useSettingsStore().settings.activeModules = active ? ['custom-nodes'] : [];
		return settingsPage();
	};

	beforeEach(() => {
		setActivePinia(createPinia());
	});

	afterEach(() => {
		setLanguage('en');
	});

	it('uses the backend module id', () => {
		expect(CustomNodesModule.id).toBe('custom-nodes');
	});

	describe('settings sidebar item', () => {
		it('sits in the integrations section at order 30', () => {
			expect(settingsPage()).toMatchObject({ section: 'integrations', order: 30, icon: 'blocks' });
		});

		it('shows to a user with customNode:create when the module is active', () => {
			expect(setup({ scopes: ['customNode:create'], active: true })?.available).toBe(true);
		});

		it('hides from a user without customNode:create', () => {
			expect(setup({ scopes: ['customNode:list'], active: true })?.available).toBe(false);
		});

		it('hides when the module is not active', () => {
			expect(setup({ scopes: ['customNode:create'], active: false })?.available).toBe(false);
		});

		it('reads the label from i18n lazily', () => {
			const descriptor = Object.getOwnPropertyDescriptor(settingsPage(), 'label');

			expect(typeof descriptor?.get).toBe('function');
			expect(settingsPage()?.label).toBe('Custom nodes');
		});

		it('follows a language change', () => {
			const item = settingsPage();
			i18nInstance.global.mergeLocaleMessage(
				'de',
				Object.fromEntries([['customNodes.settings.title', 'Eigene Nodes']]),
			);
			setLanguage('de');

			expect(item?.label).toBe('Eigene Nodes');
		});
	});

	describe('route', () => {
		const route = CustomNodesModule.routes?.[0];
		const meta = route?.meta as unknown as {
			middleware: string[];
			middlewareOptions: { rbac: { scope: string }; custom: () => boolean };
		};

		it('has the settings path and name', () => {
			expect(route).toMatchObject({ path: 'custom-nodes', name: CUSTOM_NODES_SETTINGS_VIEW });
		});

		it('loads the view lazily', () => {
			expect(typeof route?.component).toBe('function');
		});

		it('needs a session, the customNode:create scope and the module gate', () => {
			expect(meta.middleware).toEqual(['authenticated', 'rbac', 'custom']);
			expect(meta.middlewareOptions.rbac.scope).toBe('customNode:create');
		});

		it('passes the custom check only when the module is active', () => {
			setActivePinia(createPinia());
			const settingsStore = useSettingsStore();

			settingsStore.settings.activeModules = [];
			expect(meta.middlewareOptions.custom()).toBe(false);

			settingsStore.settings.activeModules = ['custom-nodes'];
			expect(meta.middlewareOptions.custom()).toBe(true);
		});
	});
});
