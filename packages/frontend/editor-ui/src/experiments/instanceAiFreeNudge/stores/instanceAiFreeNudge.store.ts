import { useStorage } from '@n8n/composables/useStorage';
import { useTelemetry } from '@n8n/composables/useTelemetry';
import { STORES } from '@n8n/stores';
import { TELEMETRY_EVENT } from '@n8n/telemetry';
import { defineStore } from 'pinia';
import { computed } from 'vue';

import { INSTANCE_AI_FREE_NUDGE_EXPERIMENT } from '@/app/constants/experiments';
import { usePostHog } from '@/app/stores/posthog.store';
import { getExperimentTelemetryPayload } from '@/experiments/utils';

const DISMISSED_STORAGE_KEY = 'N8N_INSTANCE_AI_FREE_NUDGE_DISMISSED';

type ExperimentVariant =
	| typeof INSTANCE_AI_FREE_NUDGE_EXPERIMENT.control
	| typeof INSTANCE_AI_FREE_NUDGE_EXPERIMENT.variant1
	| typeof INSTANCE_AI_FREE_NUDGE_EXPERIMENT.variant2;

type TreatmentVariant = Exclude<
	ExperimentVariant,
	typeof INSTANCE_AI_FREE_NUDGE_EXPERIMENT.control
>;

export const useInstanceAiFreeNudgeStore = defineStore(
	STORES.EXPERIMENT_INSTANCE_AI_FREE_NUDGE,
	() => {
		const posthogStore = usePostHog();
		const telemetry = useTelemetry();
		const dismissedStorage = useStorage(DISMISSED_STORAGE_KEY);

		const currentVariant = computed(() =>
			posthogStore.getVariant(INSTANCE_AI_FREE_NUDGE_EXPERIMENT.name),
		);
		const experimentVariant = computed<ExperimentVariant | null>(() => {
			const variant = currentVariant.value;

			if (
				variant === INSTANCE_AI_FREE_NUDGE_EXPERIMENT.control ||
				variant === INSTANCE_AI_FREE_NUDGE_EXPERIMENT.variant1 ||
				variant === INSTANCE_AI_FREE_NUDGE_EXPERIMENT.variant2
			) {
				return variant;
			}

			return null;
		});
		const treatmentVariant = computed<TreatmentVariant | null>(() => {
			const variant = experimentVariant.value;

			return variant === INSTANCE_AI_FREE_NUDGE_EXPERIMENT.variant1 ||
				variant === INSTANCE_AI_FREE_NUDGE_EXPERIMENT.variant2
				? variant
				: null;
		});
		const isDismissed = computed(() => dismissedStorage.value === 'true');
		const shouldShowNudge = computed(() => treatmentVariant.value !== null && !isDismissed.value);
		// Exposure follows assignment, not visibility: a dismissed treatment user must keep
		// counting as exposed, or a rerun would silently drop them from the variant cohort.
		const shouldTrackExposure = computed(() => experimentVariant.value !== null);

		function trackExposure() {
			const variant = experimentVariant.value;
			if (!variant) return;

			telemetry.track(
				TELEMETRY_EVENT.INSTANCE_AI.FREE_NUDGE_EXPOSED,
				getExperimentTelemetryPayload(INSTANCE_AI_FREE_NUDGE_EXPERIMENT, variant),
			);
		}

		function dismiss() {
			const variant = treatmentVariant.value;
			if (!variant) return;

			dismissedStorage.value = 'true';
			telemetry.track(
				TELEMETRY_EVENT.INSTANCE_AI.FREE_NUDGE_DISMISSED,
				getExperimentTelemetryPayload(INSTANCE_AI_FREE_NUDGE_EXPERIMENT, variant),
			);
		}

		return {
			currentVariant,
			treatmentVariant,
			isDismissed,
			shouldShowNudge,
			shouldTrackExposure,
			trackExposure,
			dismiss,
		};
	},
);
