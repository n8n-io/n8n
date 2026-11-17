import { computed } from 'vue';
import { KNOWLEDGE_COLLECTIONS_FLAG } from '@n8n/api-types';
import { useSettingsStore } from '@n8n/stores/settings.store';

import { usePostHog } from '@/app/stores/posthog.store';

// Mirrors `KnowledgeAvailabilityService.isCollectionsEnabled()` on the backend. The
// operator override comes in the module settings, so it works without PostHog.
export function useIsCollectionsEnabled() {
	const posthog = usePostHog();
	const settingsStore = useSettingsStore();

	return computed(
		() =>
			settingsStore.isModuleActive('knowledge') === true &&
			(settingsStore.moduleSettings.knowledge?.collectionsEnabled === true ||
				posthog.isFeatureEnabled(KNOWLEDGE_COLLECTIONS_FLAG)),
	);
}
