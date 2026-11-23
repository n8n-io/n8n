import { computed } from 'vue';

import { AGENT_TRIGGER_REDESIGN_EXPERIMENT } from '@/app/constants/experiments';
import { usePostHog } from '@/app/stores/posthog.store';

/**
 * Gates the agent config redesign: Triggers show first, and one "Add trigger"
 * menu replaces the add buttons of each trigger row.
 */
export function useAgentTriggerRedesignFlag() {
	const posthogStore = usePostHog();

	return computed(() =>
		posthogStore.isVariantEnabled(
			AGENT_TRIGGER_REDESIGN_EXPERIMENT.name,
			AGENT_TRIGGER_REDESIGN_EXPERIMENT.variant,
		),
	);
}
