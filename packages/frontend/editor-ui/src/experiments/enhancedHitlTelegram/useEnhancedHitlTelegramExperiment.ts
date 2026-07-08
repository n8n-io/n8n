import { computed } from 'vue';

import { ENHANCED_HITL_TELEGRAM_EXPERIMENT } from '@/app/constants/experiments';
import { usePostHog } from '@/app/stores/posthog.store';

export function useEnhancedHitlTelegramExperiment() {
	const posthogStore = usePostHog();

	const isFeatureEnabled = computed(
		() =>
			posthogStore.getVariant(ENHANCED_HITL_TELEGRAM_EXPERIMENT.name) ===
			ENHANCED_HITL_TELEGRAM_EXPERIMENT.variant,
	);

	return { isFeatureEnabled };
}
