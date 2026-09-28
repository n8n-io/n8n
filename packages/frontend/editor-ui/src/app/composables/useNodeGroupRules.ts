import { GROUPS_WITH_MANY_BOUNDARIES_FLAG, GROUPS_WITH_TRIGGERS_FLAG } from '@n8n/api-types';
import { useSettingsStore } from '@n8n/stores/settings.store';
import { computed } from 'vue';

import { usePostHog } from '@/app/stores/posthog.store';

/**
 * Frontend gate for the two relaxed node group rules.
 *
 * Each rule also reads the settings override, because the user payload drops
 * the PostHog flags when PostHog answers too slowly at login.
 */
export function useNodeGroupRules() {
	const posthogStore = usePostHog();
	const settingsStore = useSettingsStore();

	const allowTriggerInGroup = computed(
		() =>
			settingsStore.settings.workflowsGroupsWithTriggersEnabled === true ||
			posthogStore.isFeatureEnabled(GROUPS_WITH_TRIGGERS_FLAG),
	);

	const allowMultipleBoundaryNodes = computed(
		() =>
			settingsStore.settings.workflowsGroupsWithManyBoundariesEnabled === true ||
			posthogStore.isFeatureEnabled(GROUPS_WITH_MANY_BOUNDARIES_FLAG),
	);

	return { allowTriggerInGroup, allowMultipleBoundaryNodes };
}
