import { computed } from 'vue';

import { EVALUATIONS_WIZARD_SIDEPANEL_EXPERIMENT } from '@/app/constants/experiments';
import { usePostHog } from '@/app/stores/posthog.store';
import { useSettingsStore } from '@/app/stores/settings.store';

export function useEvaluationsWizardSidepanelExperiment() {
	const posthogStore = usePostHog();
	const settingsStore = useSettingsStore();

	// Operator override (`N8N_CONFIG_EVALS_ENABLED`) wins; otherwise the
	// `088_config_evaluations` PostHog flag remains the source of truth.
	const isFeatureEnabled = computed(
		() =>
			settingsStore.settings.evaluation?.configEvalsEnabled === true ||
			posthogStore.getVariant(EVALUATIONS_WIZARD_SIDEPANEL_EXPERIMENT.name) ===
				EVALUATIONS_WIZARD_SIDEPANEL_EXPERIMENT.variant,
	);

	return { isFeatureEnabled };
}
