import { MCPModule } from '@n8n/frontend-module-mcp/mcp.module';
import { useRBACStore } from '@n8n/stores/rbac.store';
import { useSettingsStore } from '@n8n/stores/settings.store';
import type { IMenuSettingItem } from '@n8n/frontend-module-sdk';
import { createPinia, setActivePinia } from 'pinia';

import { useUIStore } from '@/app/stores/ui.store';

/**
 * Guards the shell half of the settings-sidebar gate: `settingsSidebarItems` drops
 * the pages of a module the instance has not activated.
 *
 * Driven with a real module descriptor rather than a fixture, because the gate only
 * holds if the descriptor's `id` is the same id `/rest/module-settings` reports.
 * The scope half of the gate lives in the descriptor's `available` getter and is
 * covered by the module package's own tests.
 */
describe('uiStore.settingsSidebarItems', () => {
	const registerMcp = ({ moduleActive }: { moduleActive: boolean }) => {
		const settingsStore = useSettingsStore();
		settingsStore.settings = {
			...settingsStore.settings,
			activeModules: moduleActive ? [MCPModule.id] : [],
		};

		useRBACStore().setGlobalScopes(['mcp:manage']);

		const uiStore = useUIStore();
		uiStore.registerSettingsPages(MCPModule.id, MCPModule.settingsPages ?? []);

		return uiStore;
	};

	const mcpItem = (uiStore: ReturnType<typeof useUIStore>) =>
		uiStore.settingsSidebarItems.find((item) => item.id === 'settings-mcp');

	beforeEach(() => {
		setActivePinia(createPinia());
	});

	it('should list the pages of an active module', () => {
		const uiStore = registerMcp({ moduleActive: true });

		expect(mcpItem(uiStore)?.available).toBe(true);
	});

	it('should drop the pages of an inactive module, even when the user holds the scope', () => {
		const uiStore = registerMcp({ moduleActive: false });

		expect(mcpItem(uiStore)).toBeUndefined();
	});
});

describe('uiStore.settingsSidebarItems with a placeholder page', () => {
	const item: IMenuSettingItem = {
		id: 'settings-with-placeholder',
		label: 'With placeholder',
		icon: 'lock',
	};
	const setLicensed = (licensed: boolean) => {
		const settingsStore = useSettingsStore();
		settingsStore.settings = {
			...settingsStore.settings,
			activeModules: [],
			enterprise: { ...settingsStore.settings.enterprise, logStreaming: licensed },
		};
	};

	const itemIds = () => useUIStore().settingsSidebarItems.map(({ id }) => id);

	beforeEach(() => {
		setActivePinia(createPinia());
	});

	it('should keep the pages of an inactive, unlicensed module that declares a placeholder page', () => {
		setLicensed(false);
		useUIStore().registerSettingsPages('with-placeholder', [item], 'logStreaming');

		expect(itemIds()).toEqual(['settings-with-placeholder']);
	});

	it('should hide the pages of an inactive, licensed module that declares a placeholder page', () => {
		setLicensed(true);
		useUIStore().registerSettingsPages('with-placeholder', [item], 'logStreaming');

		expect(itemIds()).toEqual([]);
	});
});
