import { computed } from 'vue';
import { INSTANCE_AI_SPLIT_EMPTY_STATE_EXPERIMENT } from '@/app/constants/experiments';
import { usePostHog } from '@/app/stores/posthog.store';

export function useInstanceAiSplitEmptyStateExperiment() {
	const posthogStore = usePostHog();
	const currentVariant = computed(() =>
		posthogStore.getVariant(INSTANCE_AI_SPLIT_EMPTY_STATE_EXPERIMENT.name),
	);
	const isVariantEnabled = computed(
		() => currentVariant.value === INSTANCE_AI_SPLIT_EMPTY_STATE_EXPERIMENT.variant,
	);
	const isFeatureEnabled = isVariantEnabled;
	return { currentVariant, isFeatureEnabled, isVariantEnabled };
}
