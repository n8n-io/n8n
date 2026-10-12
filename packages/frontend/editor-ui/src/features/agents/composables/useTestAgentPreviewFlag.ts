import { computed } from 'vue';

import { useAgentEvalsFlag } from '@/features/ai/evaluation.ee/composables/useAgentEvalsFlag';
import { useSettingsStore } from '@n8n/stores/settings.store';

export function useTestAgentPreviewFlag() {
	const isAgentEvalsEnabled = useAgentEvalsFlag();
	const settingsStore = useSettingsStore();

	// The preview shares the main eval rollout. Keep the existing QA override;
	// it does not bypass the main eval access gate.
	const isFeatureEnabled = computed(
		() => settingsStore.settings.evaluation?.forceAgentWorthTesting || isAgentEvalsEnabled.value,
	);

	return { isFeatureEnabled };
}
