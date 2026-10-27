import { SKILL_SYNC_FLAG } from '@n8n/api-types';
import { computed } from 'vue';

import { usePostHog } from '@/app/stores/posthog.store';

/**
 * Whether the user sees Skill Sync: the Sources tab and "Connect to GitHub". The backend gates
 * its routes with the same per-user flag. The server-evaluated flags carry the local overrides
 * (`N8N_FEATURE_FLAG_OVERRIDES`), so the flag also works with telemetry off.
 */
export const useSkillSyncFlag = () => {
	const postHog = usePostHog();
	return computed(() => postHog.isFeatureEnabled(SKILL_SYNC_FLAG) === true);
};
