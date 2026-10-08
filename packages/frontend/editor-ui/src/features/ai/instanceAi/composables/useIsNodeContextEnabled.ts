import { computed } from 'vue';
import { CANVAS_NODE_CONTEXT_FLAG } from '@n8n/api-types';
import { usePostHog } from '@/app/stores/posthog.store';
import { useEditorContext } from '@/app/composables/useEditorContext';

// Gate on Instance AI being available, not just the flag: the flag alone would
// show an unusable control and suppress the legacy Focus AI action.
export function useIsNodeContextEnabled() {
	const posthog = usePostHog();
	const { instanceAi } = useEditorContext();

	return computed(() => posthog.isFeatureEnabled(CANVAS_NODE_CONTEXT_FLAG) && instanceAi.value);
}
