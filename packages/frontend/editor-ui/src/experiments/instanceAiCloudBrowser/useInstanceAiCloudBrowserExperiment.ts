import { computed } from 'vue';

import { INSTANCE_AI_CLOUD_BROWSER_EXPERIMENT } from '@/app/constants/experiments';
import { usePostHog } from '@/app/stores/posthog.store';

export function useInstanceAiCloudBrowserExperiment() {
	const posthog = usePostHog();
	const isEnabled = computed(() =>
		posthog.isFeatureEnabled(INSTANCE_AI_CLOUD_BROWSER_EXPERIMENT.name),
	);

	return { isEnabled };
}
