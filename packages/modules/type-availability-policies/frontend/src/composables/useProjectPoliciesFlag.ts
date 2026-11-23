import { useSettingsStore } from '@n8n/stores/settings.store';
import { computed } from 'vue';

const PROJECT_POLICIES_FLAG = 'N8N_ENV_FEAT_NODE_AND_CREDENTIAL_PROJECT_POLICIES';

/**
 * Project policies stay hidden until the server sets this flag. A module cannot import the
 * shell's `useEnvFeatureFlag`, so this reads the flags that `/rest/settings` sends. Flags set only
 * at build time do not apply.
 */
export function useProjectPoliciesFlag() {
	const settingsStore = useSettingsStore();

	const isEnabled = computed(() => {
		const value = settingsStore.settings.envFeatureFlags?.[PROJECT_POLICIES_FLAG];
		return !!value && value !== 'false';
	});

	return { isEnabled };
}
