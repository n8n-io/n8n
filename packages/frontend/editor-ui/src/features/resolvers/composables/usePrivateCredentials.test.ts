import { createTestingPinia } from '@pinia/testing';
import { setActivePinia } from 'pinia';
import { usePrivateCredentials } from './usePrivateCredentials';
import { useSettingsStore } from '@/app/stores/settings.store';
import type { FrontendSettings } from '@n8n/api-types';

describe('usePrivateCredentials', () => {
	let settingsStore: ReturnType<typeof useSettingsStore>;

	const setup = ({
		moduleActive,
		privateFlag,
		dynamicFlag,
	}: {
		moduleActive: boolean;
		privateFlag: boolean;
		dynamicFlag: boolean;
	}) => {
		const pinia = createTestingPinia();
		setActivePinia(pinia);

		settingsStore = useSettingsStore();
		settingsStore.settings = {
			envFeatureFlags: {
				N8N_ENV_FEAT_PRIVATE_CREDENTIALS: privateFlag,
				N8N_ENV_FEAT_DYNAMIC_CREDENTIALS: dynamicFlag,
			},
			activeModules: moduleActive ? ['dynamic-credentials'] : [],
		} as unknown as FrontendSettings;
		vi.spyOn(settingsStore, 'isModuleActive').mockImplementation(
			(name: string) => moduleActive && name === 'dynamic-credentials',
		);

		return usePrivateCredentials();
	};

	it('should be enabled when module is active and the private flag is on', () => {
		const { isEnabled } = setup({ moduleActive: true, privateFlag: true, dynamicFlag: false });
		expect(isEnabled.value).toBe(true);
	});

	it('should be enabled when module is active and only the superset dynamic flag is on', () => {
		const { isEnabled } = setup({ moduleActive: true, privateFlag: false, dynamicFlag: true });
		expect(isEnabled.value).toBe(true);
	});

	it('should be disabled when module is not active', () => {
		const { isEnabled } = setup({ moduleActive: false, privateFlag: true, dynamicFlag: true });
		expect(isEnabled.value).toBe(false);
	});

	it('should be disabled when neither flag is on', () => {
		const { isEnabled } = setup({ moduleActive: true, privateFlag: false, dynamicFlag: false });
		expect(isEnabled.value).toBe(false);
	});
});
