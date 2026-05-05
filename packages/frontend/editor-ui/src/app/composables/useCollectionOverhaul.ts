import { computed } from 'vue';
import { usePostHog } from '@/app/stores/posthog.store';
import { COLLECTION_OVERHAUL_EXPERIMENT } from '@/app/constants';

export function useCollectionOverhaul() {
	const postHogStore = usePostHog();

	const isEnabled = computed(
		() =>
			postHogStore.getVariant(COLLECTION_OVERHAUL_EXPERIMENT.name) ===
			COLLECTION_OVERHAUL_EXPERIMENT.variant,
	);

	return {
		isEnabled,
	};
}
