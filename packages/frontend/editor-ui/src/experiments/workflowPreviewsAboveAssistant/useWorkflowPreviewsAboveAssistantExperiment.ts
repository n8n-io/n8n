// Experiment cleanup (124_workflow_previews_above_assistant)
import { computed } from 'vue';

import { WORKFLOW_PREVIEWS_ABOVE_ASSISTANT_EXPERIMENT } from '@/app/constants/experiments';
import { usePostHog } from '@/app/stores/posthog.store';

type WorkflowPreviewsAboveAssistantVariant =
	| typeof WORKFLOW_PREVIEWS_ABOVE_ASSISTANT_EXPERIMENT.control
	| typeof WORKFLOW_PREVIEWS_ABOVE_ASSISTANT_EXPERIMENT.variant;

function isExperimentVariant(value: unknown): value is WorkflowPreviewsAboveAssistantVariant {
	return (
		value === WORKFLOW_PREVIEWS_ABOVE_ASSISTANT_EXPERIMENT.control ||
		value === WORKFLOW_PREVIEWS_ABOVE_ASSISTANT_EXPERIMENT.variant
	);
}

export function useWorkflowPreviewsAboveAssistantExperiment() {
	const posthogStore = usePostHog();

	const variant = computed<WorkflowPreviewsAboveAssistantVariant | null>(() => {
		const value = posthogStore.getVariant(WORKFLOW_PREVIEWS_ABOVE_ASSISTANT_EXPERIMENT.name);
		return isExperimentVariant(value) ? value : null;
	});

	const isFeatureEnabled = computed(
		() => variant.value === WORKFLOW_PREVIEWS_ABOVE_ASSISTANT_EXPERIMENT.variant,
	);

	return { variant, isFeatureEnabled };
}
