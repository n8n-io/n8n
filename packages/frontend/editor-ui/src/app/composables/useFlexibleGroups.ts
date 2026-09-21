import { FLEXIBLE_GROUPS_CANVAS_FLAG } from '@n8n/api-types';
import { useSettingsStore } from '@n8n/stores/settings.store';
import { computed } from 'vue';

import { usePostHog } from '@/app/stores/posthog.store';

/**
 * Frontend gate for the flexible canvas groups. It combines two signals, the
 * way `useAgentEvalsFlag` does:
 *
 *  - `settings.workflowsFlexibleGroupsEnabled` — the operator override
 *    (`N8N_WORKFLOWS_FLEXIBLE_GROUPS_ENABLED`). It rides in the settings
 *    payload, so it arrives even when the user payload carries no flags.
 *  - the PostHog flag — it carries the per-cohort rollout.
 *
 * The workflow save path reads the same flag for the same user, so the canvas
 * must not accept a group that the save then rejects.
 */
export function useFlexibleGroups() {
	const posthogStore = usePostHog();
	const settingsStore = useSettingsStore();

	const isEnabled = computed(
		() =>
			settingsStore.settings.workflowsFlexibleGroupsEnabled === true ||
			posthogStore.isFeatureEnabled(FLEXIBLE_GROUPS_CANVAS_FLAG),
	);

	return { isEnabled };
}
