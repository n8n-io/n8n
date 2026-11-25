import { computed } from 'vue';
import { HUMAN_REVIEW_MODULE } from '@n8n/constants';
import { useSettingsStore } from '@n8n/stores/settings.store';

export function useAgentApprovalDestinationsEnabled() {
	const settingsStore = useSettingsStore();
	return computed(() => settingsStore.isAgentModuleActive(HUMAN_REVIEW_MODULE));
}
