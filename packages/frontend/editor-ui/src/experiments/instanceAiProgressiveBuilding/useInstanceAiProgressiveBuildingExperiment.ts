import { computed } from 'vue';

import { INSTANCE_AI_PROGRESSIVE_BUILDING_EXPERIMENT } from '@/app/constants/experiments';
import { usePostHog } from '@/app/stores/posthog.store';

export function useInstanceAiProgressiveBuildingExperiment() {
	const posthogStore = usePostHog();
	const isEnabled = computed(() =>
		posthogStore.isVariantEnabled(
			INSTANCE_AI_PROGRESSIVE_BUILDING_EXPERIMENT.name,
			INSTANCE_AI_PROGRESSIVE_BUILDING_EXPERIMENT.variant,
		),
	);

	return { isEnabled };
}
