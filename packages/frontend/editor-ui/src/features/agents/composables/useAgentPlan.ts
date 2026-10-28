import { computed, onScopeDispose, ref, watch } from 'vue';
import { useDocumentVisibility } from '@vueuse/core';
import { useRootStore } from '@n8n/stores/useRootStore';
import { usePushConnectionStore } from '@/app/stores/pushConnection.store';
import { getAgentPlan, type AgentChatChannel } from './useAgentApi';
import type { AgentPlanView } from '../utils/agent-plan';

export function useAgentPlan(target: {
	projectId: () => string;
	agentId: () => string;
	threadId: () => string | undefined;
	active: () => boolean;
	channel?: () => AgentChatChannel;
}) {
	const root = useRootStore();
	const push = usePushConnectionStore();
	const visibility = useDocumentVisibility();
	const plan = ref<AgentPlanView | null>(null);
	const identity = computed(() => [
		target.projectId(),
		target.agentId(),
		target.threadId(),
		target.active(),
		target.channel?.(),
	]);
	let request = 0;
	let disposed = false;

	async function refresh() {
		const threadId = target.threadId();

		if (!threadId || !target.active() || disposed || visibility.value !== 'visible') return;

		const read = ++request;

		try {
			const result = await getAgentPlan(
				root.restApiContext,
				target.projectId(),
				target.agentId(),
				threadId,
				target.channel?.(),
			);

			// Job transitions can change status without changing the plan revision.
			if (disposed || read !== request) return;

			if (result && plan.value?.planId === result.planId && result.revision < plan.value.revision)
				return;

			plan.value = result;
		} catch {
			// Keep the last confirmed view until the next push or reconnect.
		}
	}

	const unsubscribe = push.addEventListener((event) => {
		if (
			(event.type === 'agentBackgroundTasksUpdated' || event.type === 'agentExecutionUpdated') &&
			event.data.projectId === target.projectId() &&
			event.data.agentId === target.agentId() &&
			event.data.threadId === target.threadId()
		)
			void refresh();
	});

	watch(
		identity,
		() => {
			request++;
			plan.value = null;
			void refresh();
		},
		{ immediate: true, flush: 'sync' },
	);

	watch([visibility, () => push.isConnected], () => {
		void refresh();
	});

	onScopeDispose(() => {
		disposed = true;
		request++;
		unsubscribe();
	});

	return { plan, refresh };
}
