import { computed, watch } from 'vue';
import { agentsEventBus } from '@/features/agents/agents.eventBus';
import { getLatestAgentConfigMutation } from '../canvasPreview.utils';
import type { ArtifactThread } from '../artifactThread';

/**
 * Signal persisted builder config mutations onto the agents event bus. Every
 * successful config-mutating builder tool call (stamped configMutated by the
 * backend) notifies any mounted AgentBuilderView for that agent — the artifact
 * panel, or a full-page builder in another route.
 */
export function useAgentMutationRefresh(thread: ArtifactThread): void {
	const latestAgentConfigMutation = computed(
		() => getLatestAgentConfigMutation(thread.artifactTurns) ?? null,
	);

	watch(
		() => latestAgentConfigMutation.value?.toolCallId,
		(toolCallId) => {
			if (!toolCallId || !latestAgentConfigMutation.value) return;
			if (thread.isHydratingThread) return;
			agentsEventBus.emit('agentUpdated', {
				agentId: latestAgentConfigMutation.value.agentId,
				source: 'instance-ai',
			});
		},
		{ flush: 'sync' },
	);
}
