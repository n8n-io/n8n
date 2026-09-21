import { computed } from 'vue';
import { INSTANCE_AI_SETUP_PANEL_EXPERIMENT } from '@/app/constants/experiments';
import { usePostHog } from '@/app/stores/posthog.store';

export function useInstanceAiSetupPanelExperiment() {
	const posthog = usePostHog();
	const isEnabled = computed(
		() =>
			posthog.getVariant(INSTANCE_AI_SETUP_PANEL_EXPERIMENT.name) ===
			INSTANCE_AI_SETUP_PANEL_EXPERIMENT.variant,
	);
	return { isEnabled };
}
