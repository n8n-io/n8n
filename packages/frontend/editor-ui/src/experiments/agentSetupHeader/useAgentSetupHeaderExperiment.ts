import { computed } from 'vue';
import { AGENT_SETUP_HEADER_EXPERIMENT } from '@/app/constants/experiments';
import { usePostHog } from '@/app/stores/posthog.store';

export function useAgentSetupHeaderExperiment() {
	const posthog = usePostHog();
	const isEnabled = computed(() =>
		posthog.isVariantEnabled(
			AGENT_SETUP_HEADER_EXPERIMENT.name,
			AGENT_SETUP_HEADER_EXPERIMENT.variant,
		),
	);

	return { isEnabled };
}
