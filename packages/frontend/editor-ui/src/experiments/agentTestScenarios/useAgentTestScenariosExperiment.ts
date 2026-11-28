import { computed } from 'vue';

import { AGENT_TEST_SCENARIOS_EXPERIMENT } from '@/app/constants/experiments';
import { usePostHog } from '@/app/stores/posthog.store';
import { useAgentSafeTestingFlag } from '@/features/agents/composables/useAgentSafeTestingFlag';

export function useAgentTestScenariosExperiment() {
	const posthog = usePostHog();

	const isEnabled = computed(() =>
		posthog.isVariantEnabled(
			AGENT_TEST_SCENARIOS_EXPERIMENT.name,
			AGENT_TEST_SCENARIOS_EXPERIMENT.variant,
		),
	);

	// Test scenarios yield to safe testing when the user is in its `test` variant.
	const isSafeTestingActive = useAgentSafeTestingFlag();

	const shouldShow = computed(() => isEnabled.value && !isSafeTestingActive.value);

	return { isEnabled, shouldShow };
}
