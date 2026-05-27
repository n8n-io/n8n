import { computed } from 'vue';

import { INSTANCE_AI_SETUP_LIST_EXPERIMENT } from '@/app/constants/experiments';
import { usePostHog } from '@/app/stores/posthog.store';

export function useInstanceAiSetupListExperiment() {
	const posthogStore = usePostHog();

	const isFeatureEnabled = computed(
		() =>
			(import.meta.env.DEV && import.meta.env.MODE !== 'test') ||
			posthogStore.getVariant(INSTANCE_AI_SETUP_LIST_EXPERIMENT.name) ===
				INSTANCE_AI_SETUP_LIST_EXPERIMENT.variant,
	);

	return { isFeatureEnabled };
}
