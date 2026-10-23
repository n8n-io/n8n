import { computed } from 'vue';

import { PREFERENCES_EMPTY_STATE_EXPERIMENT } from '@/app/constants/experiments';
import { usePostHog } from '@/app/stores/posthog.store';
import { useInstanceAiReady } from '@/features/ai/instanceAi/composables/useInstanceAiAvailability';

const PREFERENCES_EMPTY_STATE_VARIANTS = [
	PREFERENCES_EMPTY_STATE_EXPERIMENT.control,
	PREFERENCES_EMPTY_STATE_EXPERIMENT.examples,
	PREFERENCES_EMPTY_STATE_EXPERIMENT.assistant,
] as const;

export type PreferencesEmptyStateVariant = (typeof PREFERENCES_EMPTY_STATE_VARIANTS)[number];

function isPreferencesEmptyStateVariant(value: unknown): value is PreferencesEmptyStateVariant {
	return PREFERENCES_EMPTY_STATE_VARIANTS.some((variant) => variant === value);
}

export function usePreferencesEmptyStateExperiment() {
	const posthogStore = usePostHog();
	const instanceAiReady = useInstanceAiReady();

	const variant = computed<PreferencesEmptyStateVariant | undefined>(() => {
		if (!instanceAiReady.value) return undefined;
		const assigned = posthogStore.getVariant(PREFERENCES_EMPTY_STATE_EXPERIMENT.name);
		return isPreferencesEmptyStateVariant(assigned) ? assigned : undefined;
	});

	function trackExposure() {
		if (!variant.value) return;
		posthogStore.trackExposure(PREFERENCES_EMPTY_STATE_EXPERIMENT.name);
	}

	return { variant, trackExposure };
}
