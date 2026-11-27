import { AGENT_SAFE_TESTING_FLAG } from '@n8n/api-types';
import { computed } from 'vue';

import { AGENT_TEST_SCENARIOS_EXPERIMENT } from '@/app/constants/experiments';
import { usePostHog } from '@/app/stores/posthog.store';

export function useAgentTestScenariosExperiment() {
	const posthog = usePostHog();

	const isEnabled = computed(() =>
		posthog.isVariantEnabled(
			AGENT_TEST_SCENARIOS_EXPERIMENT.name,
			AGENT_TEST_SCENARIOS_EXPERIMENT.variant,
		),
	);

	const isSafeTestingActive = computed(
		() =>
			posthog.isFeatureEnabled(AGENT_SAFE_TESTING_FLAG) ||
			posthog.isVariantEnabled(AGENT_SAFE_TESTING_FLAG, 'variant'),
	);

	const shouldShow = computed(() => isEnabled.value && !isSafeTestingActive.value);

	return { isEnabled, shouldShow };
}
