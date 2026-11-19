import { SKILL_SYNC_FLAG } from '@n8n/api-types';
import { computed } from 'vue';

import { useSettingsStore } from '@n8n/stores/settings.store';

import { usePostHog } from '@/app/stores/posthog.store';

/**
 * Whether the user sees Skill Sync: the source rows of the skills table and "Connect to GitHub". The backend gates
 * its routes with the same per-user flag. The server-evaluated flags carry the local overrides
 * (`N8N_FEATURE_FLAG_OVERRIDES`), so the flag also works with telemetry off.
 */
export const useSkillSyncFlag = () => {
	const postHog = usePostHog();
	return computed(() => postHog.isFeatureEnabled(SKILL_SYNC_FLAG) === true);
};

export const useSkillSyncEnabled = () => {
	const settingsStore = useSettingsStore();
	const isFlagEnabled = useSkillSyncFlag();
	return computed(
		() => isFlagEnabled.value && settingsStore.moduleSettings.skills?.skillSyncEnabled === true,
	);
};
