import { computed } from 'vue';

import { useEditorContext } from '@/app/composables/useEditorContext';
import { usePostHog } from '@/app/stores/posthog.store';

import { INSTANCE_AI_MENTIONS_FLAG } from '../constants';

export function useIsInstanceAiMentionsEnabled() {
	const posthog = usePostHog();
	const { instanceAi } = useEditorContext();

	return computed(() => posthog.isFeatureEnabled(INSTANCE_AI_MENTIONS_FLAG) && instanceAi.value);
}
