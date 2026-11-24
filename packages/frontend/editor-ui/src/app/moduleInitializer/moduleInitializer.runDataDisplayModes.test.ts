import { createPinia, setActivePinia } from 'pinia';
import { runDataDisplayModeRegistry } from '@n8n/frontend-module-sdk';
import type { FrontendModuleDescription } from '@n8n/frontend-module-sdk';
import { useSettingsStore } from '@n8n/stores/settings.store';
import merge from 'lodash/merge';

import { defaultSettings } from '@n8n/frontend-test-utils';

// A stand-in manifest: no shipped module contributes a display mode yet, and
// the point of these tests is the registration rule, not the current manifest.
const contributingModule: FrontendModuleDescription = {
	id: 'charts',
	name: 'Charts',
	description: '',
	icon: 'box',
	runDataDisplayModes: [
		{
			id: 'chart',
			label: () => 'Chart',
			icon: 'chart-column-decreasing',
			component: { render: () => null },
			canRender: () => true,
		},
	],
};

vi.mock('@/app/modules.manifest', () => ({
	modules: [contributingModule],
}));

const { registerModuleRunDataDisplayModes } = await import(
	'@/app/moduleInitializer/moduleInitializer'
);

describe('registerModuleRunDataDisplayModes', () => {
	const setActiveModules = (activeModules: string[]) => {
		useSettingsStore().setSettings(merge({}, defaultSettings, { activeModules }));
	};

	beforeEach(() => {
		setActivePinia(createPinia());
		runDataDisplayModeRegistry.clear();
	});

	it('registers a display mode under its id', () => {
		setActiveModules(['charts']);

		registerModuleRunDataDisplayModes();

		expect(runDataDisplayModeRegistry.get('chart')?.label()).toBe('Chart');
	});

	// A frontend-only module has no backend twin, so it is never active.
	it('registers even when the module is not active', () => {
		setActiveModules([]);

		registerModuleRunDataDisplayModes();

		expect(runDataDisplayModeRegistry.has('chart')).toBe(true);
	});

	it('replays registration without warning', () => {
		const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

		registerModuleRunDataDisplayModes();
		registerModuleRunDataDisplayModes();

		expect(consoleSpy).not.toHaveBeenCalled();
		expect(runDataDisplayModeRegistry.getAll()).toHaveLength(1);

		consoleSpy.mockRestore();
	});
});
