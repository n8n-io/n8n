import { computed } from 'vue';
import { useTelemetry } from '@n8n/composables/useTelemetry';
import { TELEMETRY_EVENT } from '@n8n/telemetry';

import { PREFERENCES_EMPTY_STATE_EXPERIMENT } from '@/app/constants/experiments';
import { usePostHog } from '@/app/stores/posthog.store';
import { getExperimentTelemetryPayload } from '@/experiments/utils';
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
	const telemetry = useTelemetry();
	const instanceAiReady = useInstanceAiReady();

	const variant = computed<PreferencesEmptyStateVariant | undefined>(() => {
		if (!instanceAiReady.value) return undefined;
		const assigned = posthogStore.getVariant(PREFERENCES_EMPTY_STATE_EXPERIMENT.name);
		return isPreferencesEmptyStateVariant(assigned) ? assigned : undefined;
	});

	function trackExposure() {
		const current = variant.value;
		if (!current) return;
		posthogStore.trackExposure(PREFERENCES_EMPTY_STATE_EXPERIMENT.name);
		telemetry.track(
			TELEMETRY_EVENT.CONTEXT.PREFERENCES_EMPTY_STATE_EXPOSED,
			getExperimentTelemetryPayload(PREFERENCES_EMPTY_STATE_EXPERIMENT, current),
		);
	}

	return { variant, trackExposure };
}
