import { OtelModule } from '@n8n/frontend-module-otel';
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
 * The scope half of the old gate lives in the descriptor's `available` getter and is
 * covered by `otel.module.test.ts` in the module package.
 */
describe('uiStore.settingsSidebarItems', () => {
	const registerOtel = ({ moduleActive }: { moduleActive: boolean }) => {
		const settingsStore = useSettingsStore();
		settingsStore.settings = {
			...settingsStore.settings,
			activeModules: moduleActive ? [OtelModule.id] : [],
		};

		useRBACStore().setGlobalScopes(['otel:manage']);

		const uiStore = useUIStore();
		uiStore.registerSettingsPages(OtelModule.id, OtelModule.settingsPages ?? []);

		return uiStore;
	};

	const otelItem = (uiStore: ReturnType<typeof useUIStore>) =>
		uiStore.settingsSidebarItems.find((item) => item.id === 'settings-opentelemetry');

	beforeEach(() => {
		setActivePinia(createPinia());
	});

	it('should list the pages of an active module', () => {
		const uiStore = registerOtel({ moduleActive: true });

		expect(otelItem(uiStore)?.available).toBe(true);
	});

	it('should drop the pages of an inactive module, even when the user holds the scope', () => {
		const uiStore = registerOtel({ moduleActive: false });

		expect(otelItem(uiStore)).toBeUndefined();
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
