import { computed } from 'vue';

import { INSTANCE_AI_BROWSER_USE_EXPERIMENT } from '@/app/constants/experiments';
import { usePostHog } from '@/app/stores/posthog.store';

export function useInstanceAiBrowserUseExperiment() {
	const posthogStore = usePostHog();

	const isFeatureEnabled = computed(
		() =>
			posthogStore.getVariant(INSTANCE_AI_BROWSER_USE_EXPERIMENT.name) ===
			INSTANCE_AI_BROWSER_USE_EXPERIMENT.variant,
	);

	return { isFeatureEnabled };
}
