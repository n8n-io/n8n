import { computed } from 'vue';

import { usePostHog } from '@/app/stores/posthog.store';
import { useSettingsStore } from '@n8n/stores/settings.store';
import { TEST_AGENT_PREVIEW_FLAG } from '../constants';

export function useTestAgentPreviewFlag() {
	const posthogStore = usePostHog();
	const settingsStore = useSettingsStore();

	// `N8N_FORCE_AGENT_WORTH_TESTING` also enables the preview, so a local/QA
	// environment gets the full preview flow from one flag instead of also
	// needing a PostHog override.
	const isFeatureEnabled = computed(
		() =>
			settingsStore.settings.evaluation?.forceAgentWorthTesting ||
			posthogStore.isFeatureEnabled(TEST_AGENT_PREVIEW_FLAG),
	);

	return { isFeatureEnabled };
}
