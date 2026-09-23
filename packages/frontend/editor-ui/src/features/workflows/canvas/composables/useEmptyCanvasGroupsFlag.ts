import { computed } from 'vue';

import { usePostHog } from '@/app/stores/posthog.store';

const EMPTY_CANVAS_GROUPS_FLAG = '121_empty_canvas_groups';

export function useEmptyCanvasGroupsFlag() {
	const posthog = usePostHog();

	return computed(() => posthog.isFeatureEnabled(EMPTY_CANVAS_GROUPS_FLAG));
}
