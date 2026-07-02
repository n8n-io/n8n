import { computed } from 'vue';

import { INSTANCE_AI_TEMPLATE_EXAMPLES_EXPERIMENT } from '@/app/constants/experiments';
import { usePostHog } from '@/app/stores/posthog.store';

export function useInstanceAiTemplateExamplesExperiment() {
	const posthogStore = usePostHog();

	const isFeatureEnabled = computed(
		() =>
			posthogStore.getVariant(INSTANCE_AI_TEMPLATE_EXAMPLES_EXPERIMENT.name) ===
			INSTANCE_AI_TEMPLATE_EXAMPLES_EXPERIMENT.variant,
	);

	return { isFeatureEnabled };
}
