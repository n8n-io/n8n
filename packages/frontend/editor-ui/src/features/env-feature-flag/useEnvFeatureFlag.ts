import type { N8nEnvFeatFlags } from '@n8n/api-types';
import { useSettingsStore } from '@/stores/settings.store';

export const useEnvFeatureFlag = () => {
	const settingsStore = useSettingsStore();

	const check = (flag: Uppercase<string>): boolean => {
		const key = `N8N_ENV_FEAT_${flag}` as const;

		const runtimeValue = settingsStore.settings?.envFeatureFlags?.[key];
		if (runtimeValue !== undefined) {
			return runtimeValue !== 'false' && !!runtimeValue;
		}

		const buildTimeValue = (import.meta.env as N8nEnvFeatFlags)[key];
		if (buildTimeValue !== undefined) {
			return buildTimeValue !== 'false' && !!buildTimeValue;
		}

		return false;
	};

	return {
		check,
	};
};
