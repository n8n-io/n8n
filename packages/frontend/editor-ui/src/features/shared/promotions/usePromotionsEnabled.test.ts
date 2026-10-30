import type { FrontendSettings } from '@n8n/api-types';
import { useSettingsStore } from '@n8n/stores/settings.store';
import { createTestingPinia } from '@pinia/testing';
import { setActivePinia } from 'pinia';

import { useSourceControlStore } from '@/features/integrations/sourceControl.ee/sourceControl.store';
import { usePromotionsEnabled } from './usePromotionsEnabled';

/**
 * `isModuleActive` takes a plain string, so a stale module name would fail
 * silently. Reading the real store from `activeModules` keeps the name honest.
 */
describe('usePromotionsEnabled', () => {
	const setup = ({
		activeModules = ['promotions'],
		environmentsVersion,
	}: {
		activeModules?: string[];
		environmentsVersion?: 'v1' | 'v2';
	}) => {
		setActivePinia(createTestingPinia({ stubActions: false }));

		const settingsStore = useSettingsStore();
		settingsStore.settings = { activeModules } as unknown as FrontendSettings;
		useSourceControlStore().preferences.environmentsVersion = environmentsVersion;

		return usePromotionsEnabled();
	};

	it('is enabled when the promotions module is active and the instance uses v2', () => {
		const { isAvailable, isEnabled } = setup({ environmentsVersion: 'v2' });

		expect(isAvailable.value).toBe(true);
		expect(isEnabled.value).toBe(true);
	});

	it.each(['v1', undefined] as const)(
		'is available but not enabled while the instance uses %s',
		(environmentsVersion) => {
			const { isAvailable, isEnabled } = setup({ environmentsVersion });

			expect(isAvailable.value).toBe(true);
			expect(isEnabled.value).toBe(false);
		},
	);

	it('is not available when the promotions module is not active', () => {
		const { isAvailable, isEnabled } = setup({
			activeModules: ['source-control'],
			environmentsVersion: 'v2',
		});

		expect(isAvailable.value).toBe(false);
		expect(isEnabled.value).toBe(false);
	});
});
