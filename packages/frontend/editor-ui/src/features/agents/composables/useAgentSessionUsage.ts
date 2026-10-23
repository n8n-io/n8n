import { computed, ref, watch } from 'vue';
import { useIntervalFn } from '@vueuse/core';
import type { PushPayload } from '@n8n/api-types';

import { TIME } from '@/app/constants/durations';
import type { ThreadDetail } from './useAgentThreadsApi';
import type { AgentUsageUpdate } from '../types';
import { getAgentSessionDuration, getAgentSessionUsage } from '../utils/agent-usage';

export function useAgentSessionUsage(
	detail: () => ThreadDetail | null,
	streamUpdates: () => Record<string, AgentUsageUpdate>,
) {
	const pushedUpdates = ref<Record<string, AgentUsageUpdate>>({});
	const now = ref(Date.now());
	const updates = computed(() => {
		const merged = { ...pushedUpdates.value };
		for (const update of Object.values(streamUpdates())) {
			const pushed = merged[update.executionId];
			merged[update.executionId] = {
				...update,
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
	const elapsed = computed(() => {
		const current = detail();
		return current
			? getAgentSessionDuration(current, updates.value, now.value)
			: { duration: 0, running: false };
	});
	const { pause, resume } = useIntervalFn(
		() => {
			now.value = Date.now();
		},
		TIME.SECOND / 10,
		{ immediate: false },
	);
	watch(
		() => elapsed.value.running,
		(running) => {
			if (running) {
				now.value = Date.now();
				resume();
			} else pause();
		},
		{ immediate: true },
	);
	function onExecutionUpdated(update: PushPayload<'agentExecutionUpdated'>) {
		if (!update.usage) return;
		const previous = pushedUpdates.value[update.executionId]?.usage;
		if (previous && previous.totalTokens > update.usage.totalTokens) return;
		pushedUpdates.value[update.executionId] = {
			sessionId: update.threadId,
			executionId: update.executionId,
			usage: update.usage,
			complete: false,
		};
	}
	return { usage, duration: computed(() => elapsed.value.duration), onExecutionUpdated };
}
