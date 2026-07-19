import { createTestingPinia } from '@pinia/testing';
import { setActivePinia } from 'pinia';
import { usePrivateCredentials } from './usePrivateCredentials';
import { useSettingsStore } from '@/app/stores/settings.store';
import type { FrontendSettings } from '@n8n/api-types';

describe('usePrivateCredentials', () => {
	let settingsStore: ReturnType<typeof useSettingsStore>;

	const setup = ({ moduleActive }: { moduleActive: boolean }) => {
		const pinia = createTestingPinia();
		setActivePinia(pinia);

		settingsStore = useSettingsStore();
		settingsStore.settings = {
			activeModules: moduleActive ? ['dynamic-credentials'] : [],
		} as unknown as FrontendSettings;
		vi.spyOn(settingsStore, 'isModuleActive').mockImplementation(
			(name: string) => moduleActive && name === 'dynamic-credentials',
		);

		return usePrivateCredentials();
	};

	it('should be enabled when the module is active', () => {
		const { isEnabled } = setup({ moduleActive: true });
		expect(isEnabled.value).toBe(true);
	});

	it('should be disabled when the module is not active', () => {
		const { isEnabled } = setup({ moduleActive: false });
		expect(isEnabled.value).toBe(false);
	});
});
