import { computed } from 'vue';

import { INSTANCE_AI_TEST_AGENT_PREVIEW_EXPERIMENT } from '@/app/constants/experiments';
import { usePostHog } from '@/app/stores/posthog.store';
import { useSettingsStore } from '@n8n/stores/settings.store';

export function useTestAgentPreviewExperiment() {
	const posthogStore = usePostHog();
	const settingsStore = useSettingsStore();

	// `N8N_FORCE_AGENT_WORTH_TESTING` also forces this variant on, so a local/QA
	// environment gets the full preview flow from one flag instead of also
	// needing a PostHog override.
	const isFeatureEnabled = computed(
		() =>
			settingsStore.settings.evaluation?.forceAgentWorthTesting === true ||
			posthogStore.getVariant(INSTANCE_AI_TEST_AGENT_PREVIEW_EXPERIMENT.name) ===
				INSTANCE_AI_TEST_AGENT_PREVIEW_EXPERIMENT.variant,
	);

	return { isFeatureEnabled };
}
