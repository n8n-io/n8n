import { computed } from 'vue';
import { CANVAS_NODE_CONTEXT_FLAG } from '@n8n/api-types';
import { usePostHog } from '@/app/stores/posthog.store';
import { useEditorContext } from '@/app/composables/useEditorContext';

/**
 * Lightweight visibility gate for the add-to-chat affordance, split out so
 * components that only decide whether to render the control don't instantiate
 * the full useAddNodesToChat composable (stores, router, i18n, ...).
 *
 * Gates on Instance AI actually being available — the flag alone would surface
 * an unusable control and suppress the legacy Focus AI action.
 */
export function useIsNodeContextEnabled() {
	const posthog = usePostHog();
	const { instanceAi } = useEditorContext();

	const isNodeContextEnabled = computed(
		() => posthog.isFeatureEnabled(CANVAS_NODE_CONTEXT_FLAG) && instanceAi.value,
	);

	return { isNodeContextEnabled };
}
