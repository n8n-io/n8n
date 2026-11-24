import { computed } from 'vue';

import { AGENTS_INVOCATION_STEP_EXPERIMENT } from '@/app/constants/experiments';
import { usePostHog } from '@/app/stores/posthog.store';

export function useAgentsInvocationStepExperiment() {
	const posthog = usePostHog();

	const isEnabled = computed(() =>
		posthog.isVariantEnabled(
			AGENTS_INVOCATION_STEP_EXPERIMENT.name,
			AGENTS_INVOCATION_STEP_EXPERIMENT.variant,
		),
	);

	return { isEnabled };
}
