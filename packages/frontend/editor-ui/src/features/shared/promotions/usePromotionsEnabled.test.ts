import type { FrontendSettings } from '@n8n/api-types';
import { useSettingsStore } from '@n8n/stores/settings.store';
import { createTestingPinia } from '@pinia/testing';
import { setActivePinia } from 'pinia';

import { usePromotionsEnabled } from './usePromotionsEnabled';

/**
 * `isModuleActive` takes a plain string, so a stale module name would fail
 * silently. Reading the real store from `activeModules` keeps the name honest.
 */
describe('usePromotionsEnabled', () => {
	const setup = ({ activeModules, flag }: { activeModules: string[]; flag: string }) => {
		setActivePinia(createTestingPinia({ stubActions: false }));

		const settingsStore = useSettingsStore();
		settingsStore.settings = {
			activeModules,
			envFeatureFlags: { N8N_ENV_FEAT_PROMOTIONS: flag },
		} as unknown as FrontendSettings;

		return usePromotionsEnabled();
	};

	it('is enabled when the promotions module is active and the flag is on', () => {
		const { isEnabled } = setup({ activeModules: ['promotions'], flag: 'true' });

		expect(isEnabled.value).toBe(true);
	});

	it('is disabled when the promotions module is not active', () => {
		const { isEnabled } = setup({ activeModules: ['source-control'], flag: 'true' });

		expect(isEnabled.value).toBe(false);
	});

	it('is disabled when the flag is off', () => {
		const { isEnabled } = setup({ activeModules: ['promotions'], flag: 'false' });

		expect(isEnabled.value).toBe(false);
	});
});
