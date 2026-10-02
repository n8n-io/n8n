import { computed } from 'vue';

import { INSTANCE_AI_CLOUD_BROWSER_EXPERIMENT } from '@/app/constants/experiments';
import { usePostHog } from '@/app/stores/posthog.store';

export function useInstanceAiCloudBrowserExperiment() {
	const posthogStore = usePostHog();

	const isFeatureEnabled = computed(
		() =>
			posthogStore.getVariant(INSTANCE_AI_CLOUD_BROWSER_EXPERIMENT.name) ===
			INSTANCE_AI_CLOUD_BROWSER_EXPERIMENT.variant,
	);

	return { isFeatureEnabled };
}
