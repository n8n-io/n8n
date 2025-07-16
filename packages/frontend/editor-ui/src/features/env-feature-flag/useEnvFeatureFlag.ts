import { useSettingsStore } from '@/stores/settings.store';

export const useEnvFeatureFlag = () => {
	const settingsStore = useSettingsStore();

	const check = (flag: Uppercase<string>): boolean => {
		const key: `FEAT_${Uppercase<string>}` = `FEAT_${flag}`;
		const envFeatureFlags = settingsStore.settings?.envFeatureFlags;
		const value = envFeatureFlags[key];

		return value === 'false' ? false : !!value;
	};

	return {
		check,
	};
};
