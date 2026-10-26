import type { AgentTaskCancellationState } from '@n8n/api-types';
import { useRootStore } from '@n8n/stores/useRootStore';
import { computed, onScopeDispose, ref, watch } from 'vue';
import { useDocumentVisibility } from '@vueuse/core';

import { usePushConnectionStore } from '@/app/stores/pushConnection.store';
import { cancelAgentTasks, getAgentTaskCancellation } from './useAgentApi';

export function useAgentTaskCancellation(target: {
	projectId: () => string;
	agentId: () => string;
	threadId: () => string | undefined;
	active: () => boolean;
	planId: () => string | null;
	requestStop?: (planId: string | null) => Promise<void>;
}) {
	const root = useRootStore();
	const push = usePushConnectionStore();
	const visibility = useDocumentVisibility();
	const state = ref<AgentTaskCancellationState | null>(null);
	const sending = ref(false);
	const awaitingState = ref(false);
	const isStopping = computed(() => sending.value || awaitingState.value);
	let revision = 0;
	let readRevision = 0;
	let disposed = false;

	function applyState(result: AgentTaskCancellationState | null) {
		const previous = state.value;
		if (previous && result?.planId === previous.planId) {
			if (result.requestedAt < previous.requestedAt) return;
			if (result.plan && previous.plan && result.plan.revision < previous.plan.revision) return;
		}
		state.value = result;
		if (result) awaitingState.value = false;
	}

	async function refresh(afterStop = false) {
		const threadId = target.threadId();
		if (
			!threadId ||
			!target.active() ||
			visibility.value !== 'visible' ||
			disposed ||
			(sending.value && !afterStop)
		)
			return;
		const current = revision;
		const read = ++readRevision;
		try {
			const result = await getAgentTaskCancellation(
				root.restApiContext,
				target.projectId(),
				target.agentId(),
				threadId,
			);
			if (!disposed && current === revision && read === readRevision && result !== undefined)
				applyState(result);
		} catch {
			// A new conversation has no persisted thread yet. Keep the last confirmed state.
		}
	}

	async function stopAll() {
		const threadId = target.threadId();
		if (!threadId || isStopping.value) return;
		sending.value = true;
		const current = ++revision;
		try {
			let result: AgentTaskCancellationState | undefined;
			if (target.requestStop) {
				await target.requestStop(target.planId());
				if (!disposed && current === revision) awaitingState.value = true;
			} else {
				result = await cancelAgentTasks(
					root.restApiContext,
					target.projectId(),
					target.agentId(),
					threadId,
					{
						planId: target.planId(),
					},
				);
			}
			if (!disposed && current === revision && result !== undefined) applyState(result);
		} finally {
			if (!disposed && current === revision) {
				await refresh(true);
				if (!disposed && current === revision) sending.value = false;
			}
		}
	}

	const unsubscribe = push.addEventListener((event) => {
		if (
			(event.type === 'agentBackgroundTasksUpdated' || event.type === 'agentExecutionUpdated') &&
			event.data.threadId === target.threadId() &&
			event.data.agentId === target.agentId() &&
			event.data.projectId === target.projectId()
		)
			void refresh();
	});
	watch(
		[target.projectId, target.agentId, target.threadId],
		() => {
			revision++;
			state.value = null;
			awaitingState.value = false;
			sending.value = false;
			void refresh();
		},
		{ immediate: true, flush: 'sync' },
	);
	watch([target.active, visibility, () => push.isConnected], () => {
		void refresh();
	});
	onScopeDispose(() => {
		disposed = true;
		revision++;
		unsubscribe();
	});
	return { state, isStopping, stopAll, refresh };
}
