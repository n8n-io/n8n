import { computed } from 'vue';
import { INSTANCE_AI_SETUP_PANEL_EXPERIMENT } from '@/app/constants/experiments';
import { usePostHog } from '@/app/stores/posthog.store';
import { getExperimentTelemetryPayload } from '@/experiments/utils';

export function useInstanceAiSetupPanelExperiment() {
	const posthog = usePostHog();
	const isEnabled = computed(
		() =>
			posthog.getVariant(INSTANCE_AI_SETUP_PANEL_EXPERIMENT.name) ===
			INSTANCE_AI_SETUP_PANEL_EXPERIMENT.variant,
	);
	function getTelemetryPayload() {
		const variant = posthog.getVariant(INSTANCE_AI_SETUP_PANEL_EXPERIMENT.name);
		return variant === 'control' || variant === 'variant'
			? getExperimentTelemetryPayload(INSTANCE_AI_SETUP_PANEL_EXPERIMENT, variant, {})
			: {};
	}
	return { isEnabled, getTelemetryPayload };
}
