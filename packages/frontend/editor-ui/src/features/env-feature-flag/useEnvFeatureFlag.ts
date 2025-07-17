import { computed } from 'vue';
import type { N8nEnvFeatFlags } from '@n8n/api-types';
import { useSettingsStore } from '@/stores/settings.store';

export const useEnvFeatureFlag = () => {
	const settingsStore = useSettingsStore();

	const check = computed(() => (flag: Uppercase<string>): boolean => {
		const key = `N8N_ENV_FEAT_${flag}` as const;

		// Settings provided by the backend take precedence over build-time or runtime flags
		const settingsProvidedEnvFeatFlag = settingsStore.settings.envFeatureFlags?.[key];
		if (settingsProvidedEnvFeatFlag !== undefined) {
			return settingsProvidedEnvFeatFlag !== 'false' && !!settingsProvidedEnvFeatFlag;
		}

		// "Vite exposes certain constants under the special import.meta.env object. These constants are defined as global variables during dev and statically replaced at build time to make tree-shaking effective."
		// See https://vite.dev/guide/env-and-mode.html
		const buildTimeValue = (import.meta.env as N8nEnvFeatFlags)[key];
		if (buildTimeValue !== undefined) {
			return buildTimeValue !== 'false' && !!buildTimeValue;
		}

		return false;
	});

	return {
		check,
	};
};
