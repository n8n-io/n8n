import { computed } from 'vue';

import { AGENT_SLACK_MANAGED_SETUP_EXPERIMENT } from '@/app/constants/experiments';
import { usePostHog } from '@/app/stores/posthog.store';

export function useAgentSlackManagedSetupExperiment() {
	const posthogStore = usePostHog();

	const isFeatureEnabled = computed(
		() => posthogStore.isFeatureEnabled(AGENT_SLACK_MANAGED_SETUP_EXPERIMENT.name) === true,
	);

	return { isFeatureEnabled };
}
