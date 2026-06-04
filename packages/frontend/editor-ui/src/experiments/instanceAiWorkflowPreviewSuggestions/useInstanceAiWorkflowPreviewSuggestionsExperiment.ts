import { computed } from 'vue';

import { INSTANCE_AI_WORKFLOW_PREVIEW_SUGGESTIONS_EXPERIMENT } from '@/app/constants/experiments';
import { usePostHog } from '@/app/stores/posthog.store';

export function useInstanceAiWorkflowPreviewSuggestionsExperiment() {
	const posthogStore = usePostHog();

	const isFeatureEnabled = computed(
		() =>
			posthogStore.getVariant(INSTANCE_AI_WORKFLOW_PREVIEW_SUGGESTIONS_EXPERIMENT.name) ===
			INSTANCE_AI_WORKFLOW_PREVIEW_SUGGESTIONS_EXPERIMENT.variant,
	);

	return { isFeatureEnabled };
}
