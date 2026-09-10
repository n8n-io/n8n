import { computed } from 'vue';
import { useStorage } from '@n8n/composables/useStorage';

import { useInstanceAiBrowserUseExperiment } from '@/experiments/instanceAiBrowserUse';
import { useInstanceAiSettingsStore } from '../instanceAiSettings.store';

const DISMISSED_STORAGE_KEY = 'N8N_INSTANCE_AI_RECORD_PROMO_DISMISSED';

/**
 * Eligibility and dismissal for the "record instead of typing" promo pill.
 * No PostHog variant here (unlike Free Nudge) — this ships to everyone who
 * already qualifies for Browser Use, gated the same way the "+" input menu
 * decides whether to offer its browser item.
 */
export function useInstanceAiRecordPromoPill() {
	const settingsStore = useInstanceAiSettingsStore();
	const { isFeatureEnabled } = useInstanceAiBrowserUseExperiment();
	const dismissedStorage = useStorage(DISMISSED_STORAGE_KEY);

	const isDismissed = computed(() => dismissedStorage.value === 'true');
	const isEligible = computed(
		() =>
			isFeatureEnabled.value &&
			settingsStore.isBrowserUseEnabledByAdmin &&
			settingsStore.isWorkflowBuilderAvailable &&
			!isDismissed.value,
	);

	function dismiss() {
		dismissedStorage.value = 'true';
	}

	return { isEligible, isDismissed, dismiss };
}
