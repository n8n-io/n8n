import { createPinia, setActivePinia } from 'pinia';
import { parameterInputRegistry } from '@n8n/frontend-module-sdk';
import type { FrontendModuleDescription } from '@n8n/frontend-module-sdk';
import { useSettingsStore } from '@n8n/stores/settings.store';
import merge from 'lodash/merge';

import { defaultSettings } from '@n8n/frontend-test-utils';

// A stand-in manifest: no shipped module contributes a parameter input yet, and
// the point of these tests is the registration rule, not the current manifest.
const contributingModule: FrontendModuleDescription = {
	id: 'inputs',
	name: 'Inputs',
	description: '',
	icon: 'box',
	parameterInputs: [
		{
			type: 'resourceLocator',
			component: { render: () => null },
			capabilities: { ownsExpressionRendering: true },
		},
	],
};

vi.mock('@/app/modules.manifest', () => ({
	modules: [contributingModule],
}));

const { registerModuleParameterInputs } = await import('@/app/moduleInitializer/moduleInitializer');

describe('registerModuleParameterInputs', () => {
	const setActiveModules = (activeModules: string[]) => {
		useSettingsStore().setSettings(merge({}, defaultSettings, { activeModules }));
	};

	beforeEach(() => {
		setActivePinia(createPinia());
		parameterInputRegistry.clear();
	});

	it('registers a contribution under the type its descriptor claims', () => {
		setActiveModules(['inputs']);

		registerModuleParameterInputs();

		expect(parameterInputRegistry.get('resourceLocator')?.capabilities).toEqual({
			ownsExpressionRendering: true,
		});
	});

	// A parameter input is a render primitive, not a feature: gating it would
	// leave the parameter with nothing to render it.
	it('registers even when the module is not active', () => {
		setActiveModules([]);

		registerModuleParameterInputs();

		expect(parameterInputRegistry.has('resourceLocator')).toBe(true);
	});

	it('replays registration without warning', () => {
		const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
		setActiveModules(['inputs']);

		registerModuleParameterInputs();
		registerModuleParameterInputs();

		expect(consoleSpy).not.toHaveBeenCalled();
		expect(parameterInputRegistry.getAll().size).toBe(1);

		consoleSpy.mockRestore();
	});
});
