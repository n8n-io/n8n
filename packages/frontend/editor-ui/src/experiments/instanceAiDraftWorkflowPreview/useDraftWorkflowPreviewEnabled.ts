// Experiment cleanup (137_instance_ai_draft_workflow_preview)
import { computed } from 'vue';

import { INSTANCE_AI_DRAFT_WORKFLOW_PREVIEW_EXPERIMENT } from '@/app/constants/experiments';
import { usePostHog } from '@/app/stores/posthog.store';

/**
 * True for the variant of the draft workflow preview experiment. The variant
 * gets the draft canvas and the specific build progress in the chat.
 */
export function useDraftWorkflowPreviewEnabled() {
	const posthog = usePostHog();
	return computed(
		() =>
			posthog.getVariant(INSTANCE_AI_DRAFT_WORKFLOW_PREVIEW_EXPERIMENT.name) ===
			INSTANCE_AI_DRAFT_WORKFLOW_PREVIEW_EXPERIMENT.variant,
	);
}
