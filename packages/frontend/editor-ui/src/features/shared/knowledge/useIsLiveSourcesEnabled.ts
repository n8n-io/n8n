import { computed } from 'vue';
import { useSettingsStore } from '@n8n/stores/settings.store';

// Mirrors `KnowledgeAvailabilityService.isLiveSourcesEnabled()` on the backend. The
// operator turns it on with `N8N_KNOWLEDGE_LIVE_SOURCES_ENABLED`; there is no PostHog flag.
export function useIsLiveSourcesEnabled() {
	const settingsStore = useSettingsStore();

	return computed(
		() =>
			settingsStore.isModuleActive('knowledge') === true &&
			settingsStore.moduleSettings.knowledge?.liveSourcesEnabled === true,
	);
}
