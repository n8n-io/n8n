import { computed, ref } from 'vue';
import type { PushPayload } from '@n8n/api-types';

import type { ThreadDetail } from './useAgentThreadsApi';
import type { AgentUsageUpdate } from '../types';
import { getAgentSessionDuration, getAgentSessionUsage } from '../utils/agent-usage';

export function useAgentSessionUsage(
	detail: () => ThreadDetail | null,
	streamUpdates: () => Record<string, AgentUsageUpdate>,
) {
	const pushedUpdates = ref<Record<string, AgentUsageUpdate>>({});
	const updates = computed(() => {
		const merged = { ...pushedUpdates.value };
		for (const update of Object.values(streamUpdates())) {
			const pushed = merged[update.executionId];
			merged[update.executionId] = {
				...update,
				duration: Math.max(pushed?.duration ?? 0, update.duration ?? 0),
				complete: pushed?.complete === true || update.complete,
				usage:
					(pushed?.usage?.totalTokens ?? 0) > (update.usage?.totalTokens ?? 0)
						? pushed?.usage
						: update.usage,
			};
		}
		return merged;
	});
	const usage = computed(() => {
		const current = detail();
		return current ? getAgentSessionUsage(current, updates.value) : { totalTokens: 0, cost: null };
	});
	const duration = computed(() => {
		const current = detail();
		return current ? getAgentSessionDuration(current, updates.value) : 0;
	});
	function onExecutionUpdated(update: PushPayload<'agentExecutionUpdated'>) {
		if (!update.usage && update.duration === undefined) return;
		const previous = pushedUpdates.value[update.executionId];
		if (previous?.complete && !update.complete) return;
		pushedUpdates.value[update.executionId] = {
			sessionId: update.threadId,
			executionId: update.executionId,
			usage:
				(previous?.usage?.totalTokens ?? 0) > (update.usage?.totalTokens ?? 0)
					? previous?.usage
					: (update.usage ?? previous?.usage),
			duration: Math.max(previous?.duration ?? 0, update.duration ?? 0),
			complete: previous?.complete === true || update.complete === true,
		};
	}
	return { usage, duration, onExecutionUpdated };
}
