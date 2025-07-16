import { useSettingsStore } from '@/stores/settings.store';

export const useEnvFeatureFlag = () => {
	const settingsStore = useSettingsStore();

	const check = (flag: Uppercase<string>): boolean => {
		const key: `FEAT_${Uppercase<string>}` = `FEAT_${flag}`;

		// Always use settings store for both dev and prod
		const envFeatureFlags = settingsStore.settings?.envFeatureFlags;

		if (envFeatureFlags?.[key] !== undefined) {
			const value = envFeatureFlags[key];
			return value === 'false' ? false : !!value;
		}

		// Fallback to false if not found
		return false;
	};

	return {
		check,
	};
};
