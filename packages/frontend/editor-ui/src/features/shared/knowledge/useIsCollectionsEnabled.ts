import { computed } from 'vue';
import { KNOWLEDGE_COLLECTIONS_FLAG } from '@n8n/api-types';
import { useSettingsStore } from '@n8n/stores/settings.store';

import { usePostHog } from '@/app/stores/posthog.store';

// Mirrors `KnowledgeAvailabilityService.isCollectionsEnabled()` on the backend.
export function useIsCollectionsEnabled() {
	const posthog = usePostHog();
	const settingsStore = useSettingsStore();

	return computed(
		() =>
			settingsStore.isModuleActive('knowledge') === true &&
			posthog.isFeatureEnabled(KNOWLEDGE_COLLECTIONS_FLAG),
	);
}
