import { computed } from 'vue';
import { usePostHog } from '@/stores/posthog.store';
import { COLLECTION_OVERHAUL_EXPERIMENT } from '@/constants';

/**
 * Composable to check if the collection overhaul feature flag is enabled
 */
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
