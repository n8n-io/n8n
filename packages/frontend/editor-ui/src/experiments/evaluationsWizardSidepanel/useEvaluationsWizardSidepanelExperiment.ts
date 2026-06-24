import { computed } from 'vue';

import { EVALUATIONS_WIZARD_SIDEPANEL_EXPERIMENT } from '@/app/constants/experiments';
import { usePostHog } from '@/app/stores/posthog.store';

export function useEvaluationsWizardSidepanelExperiment() {
	const posthogStore = usePostHog();

	const isFeatureEnabled = computed(
		() =>
			posthogStore.getVariant(EVALUATIONS_WIZARD_SIDEPANEL_EXPERIMENT.name) ===
			EVALUATIONS_WIZARD_SIDEPANEL_EXPERIMENT.variant,
	);

	return { isFeatureEnabled };
}
