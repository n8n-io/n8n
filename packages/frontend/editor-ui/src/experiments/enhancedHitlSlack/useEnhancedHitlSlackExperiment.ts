import { computed } from 'vue';

import { ENHANCED_HITL_SLACK_EXPERIMENT } from '@/app/constants/experiments';
import { usePostHog } from '@/app/stores/posthog.store';

export function useEnhancedHitlSlackExperiment() {
	const posthogStore = usePostHog();

	const isFeatureEnabled = computed(() =>
		posthogStore.isFeatureEnabled(ENHANCED_HITL_SLACK_EXPERIMENT.name),
	);

	return { isFeatureEnabled };
}
