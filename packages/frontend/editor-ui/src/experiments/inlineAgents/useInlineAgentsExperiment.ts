import { computed } from 'vue';

import { MESSAGE_AN_AGENT_NODE_TYPE } from '@/app/constants';
import { INLINE_AGENTS_EXPERIMENT } from '@/app/constants/experiments';
import { usePostHog } from '@/app/stores/posthog.store';

export function useInlineAgentsExperiment() {
	const posthogStore = usePostHog();

	const isFeatureEnabled = computed(() =>
		posthogStore.isFeatureEnabled(INLINE_AGENTS_EXPERIMENT.name),
	);

	return { isFeatureEnabled };
}

/**
 * With inline agent creation the node is a full agent rather than a way to
 * message an existing one, so it presents under the AI Agent name in the node
 * creator and as the default node name. The shipped "Message an Agent" name
 * stays the fail-safe default. Returns undefined when the override does not
 * apply (different node type, or the experiment is off).
 */
export function getN8nAgentsNodeName(nodeTypeName: string): string | undefined {
	if (nodeTypeName !== MESSAGE_AN_AGENT_NODE_TYPE) return undefined;
	return usePostHog().isFeatureEnabled(INLINE_AGENTS_EXPERIMENT.name) ? 'AI Agent V2' : undefined;
}
