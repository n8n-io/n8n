import { AI_ASSISTANT_AT_MENTIONS_FLAG } from '@n8n/api-types';
import { computed } from 'vue';

import { usePostHog } from '@/app/stores/posthog.store';

export function useIsAssistantAtMentionsEnabled() {
	const posthog = usePostHog();

	return computed(() => posthog.isFeatureEnabled(AI_ASSISTANT_AT_MENTIONS_FLAG));
}
