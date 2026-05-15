import { computed } from 'vue';

import { INSTANCE_AI_PROACTIVE_AGENT_EXPERIMENT } from '@/app/constants/experiments';
import { usePostHog } from '@/app/stores/posthog.store';

export function useInstanceAiProactiveAgentExperiment() {
	const posthogStore = usePostHog();

	const isFeatureEnabled = computed(
		() =>
			posthogStore.getVariant(INSTANCE_AI_PROACTIVE_AGENT_EXPERIMENT.name) ===
			INSTANCE_AI_PROACTIVE_AGENT_EXPERIMENT.variant,
	);

	return { isFeatureEnabled };
}
