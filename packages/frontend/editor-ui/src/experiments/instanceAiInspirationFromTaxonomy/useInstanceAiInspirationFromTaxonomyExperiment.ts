import { computed } from 'vue';

import { INSTANCE_AI_INSPIRATION_FROM_TAXONOMY_EXPERIMENT } from '@/app/constants/experiments';
import { usePostHog } from '@/app/stores/posthog.store';

export function useInstanceAiInspirationFromTaxonomyExperiment() {
	const posthogStore = usePostHog();

	const currentVariant = computed(() =>
		posthogStore.getVariant(INSTANCE_AI_INSPIRATION_FROM_TAXONOMY_EXPERIMENT.name),
	);
	const isTreatmentVariant = computed(
		() => currentVariant.value === INSTANCE_AI_INSPIRATION_FROM_TAXONOMY_EXPERIMENT.variant,
	);

	return {
		currentVariant,
		isTreatmentVariant,
	};
}
