import { FLEXIBLE_GROUPS_CANVAS_FLAG } from '@n8n/api-types';
import { computed } from 'vue';

import { usePostHog } from '@/app/stores/posthog.store';

/**
 * Reads the flexible canvas groups rollout flag. The workflow save path checks
 * the same flag for the same user, so the canvas never lets a user build a
 * group that the save then rejects.
 */
export function useFlexibleGroups() {
	const posthogStore = usePostHog();

	const isEnabled = computed(() => posthogStore.isFeatureEnabled(FLEXIBLE_GROUPS_CANVAS_FLAG));

	return { isEnabled };
}
