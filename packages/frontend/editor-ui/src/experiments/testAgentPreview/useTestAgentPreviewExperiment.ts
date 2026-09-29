import { computed } from 'vue';

import { INSTANCE_AI_TEST_AGENT_PREVIEW_EXPERIMENT } from '@/app/constants/experiments';
import { usePostHog } from '@/app/stores/posthog.store';

export function useTestAgentPreviewExperiment() {
	const posthogStore = usePostHog();

	const isFeatureEnabled = computed(() =>
		posthogStore.isFeatureEnabled(INSTANCE_AI_TEST_AGENT_PREVIEW_EXPERIMENT.name),
	);

	return { isFeatureEnabled };
}
