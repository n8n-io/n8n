import { createTestingPinia } from '@pinia/testing';
import { setActivePinia } from 'pinia';
import { useDynamicCredentials } from './useDynamicCredentials';
import { useSettingsStore } from '@/app/stores/settings.store';
import type { FrontendSettings } from '@n8n/api-types';

describe('useDynamicCredentials', () => {
	let settingsStore: ReturnType<typeof useSettingsStore>;

	const setup = ({
		moduleActive,
		featureFlag,
	}: {
		moduleActive: boolean;
		featureFlag: boolean;
	}) => {
		const pinia = createTestingPinia();
		setActivePinia(pinia);

		settingsStore = useSettingsStore();
		settingsStore.settings = {
			envFeatureFlags: {
				N8N_ENV_FEAT_DYNAMIC_CREDENTIALS: featureFlag,
			},
			activeModules: moduleActive ? ['dynamic-credentials'] : [],
		} as unknown as FrontendSettings;
		vi.spyOn(settingsStore, 'isModuleActive').mockImplementation(
			(name: string) => moduleActive && name === 'dynamic-credentials',
		);

		return useDynamicCredentials();
	};

	it('should be enabled when both module is active and feature flag is on', () => {
		const { isEnabled } = setup({ moduleActive: true, featureFlag: true });
		expect(isEnabled.value).toBe(true);
	});

	it('should be disabled when module is not active', () => {
		const { isEnabled } = setup({ moduleActive: false, featureFlag: true });
		expect(isEnabled.value).toBe(false);
	});

	it('should be disabled when feature flag is off', () => {
		const { isEnabled } = setup({ moduleActive: true, featureFlag: false });
		expect(isEnabled.value).toBe(false);
	});

	it('should be disabled when both module is not active and feature flag is off', () => {
		const { isEnabled } = setup({ moduleActive: false, featureFlag: false });
		expect(isEnabled.value).toBe(false);
	});
});
