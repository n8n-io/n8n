import { computed, watch } from 'vue';
import { agentsEventBus } from '@/features/agents/agents.eventBus';
import { getLatestAgentConfigMutation } from '../canvasPreview.utils';
import type { ThreadRuntime } from '../instanceAi.store';

/**
 * Signal persisted builder config mutations onto the agents event bus. Every
 * successful config-mutating builder tool call (stamped configMutated by the
 * backend) notifies any mounted AgentBuilderView for that agent — the artifact
 * panel, or a full-page builder in another route.
 */
export function useAgentMutationRefresh(thread: ThreadRuntime): void {
	const latestAgentConfigMutation = computed(() => {
		for (let i = thread.messages.length - 1; i >= 0; i--) {
			const msg = thread.messages[i];
			if (msg.agentTree) {
				const result = getLatestAgentConfigMutation(msg.agentTree);
				if (result) return result;
			}
		}
		return null;
	});

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
