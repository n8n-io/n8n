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
}) {
	const root = useRootStore();
	const push = usePushConnectionStore();
	const visibility = useDocumentVisibility();
	const state = ref<AgentTaskCancellationState | null>(null);
	const sending = ref(false);
	const isStopping = computed(() => sending.value || state.value?.status === 'stopping');
	let revision = 0;
	let disposed = false;
	let timer: ReturnType<typeof setTimeout> | undefined;

	function schedule() {
		clearTimeout(timer);
		if (state.value?.status === 'stopping' || state.value?.reportStatus === 'pending') {
			timer = setTimeout(() => {
				void refresh();
			}, 1500);
		}
	}

	async function refresh() {
		const threadId = target.threadId();
		if (!threadId || !target.active() || visibility.value !== 'visible' || disposed) return;
		const current = ++revision;
		try {
			const result = await getAgentTaskCancellation(
				root.restApiContext,
				target.projectId(),
				target.agentId(),
				threadId,
			);
			if (!disposed && current === revision) state.value = result;
		} catch {
			// A new conversation has no persisted thread yet. Keep the last confirmed state.
		} finally {
			if (!disposed && current === revision) schedule();
		}
	}

	async function stopAll() {
		const threadId = target.threadId();
		if (!threadId || isStopping.value) return;
		sending.value = true;
		const current = ++revision;
		try {
			const result = await cancelAgentTasks(
				root.restApiContext,
				target.projectId(),
				target.agentId(),
				threadId,
				{
					planId: target.planId(),
					cancellationId: state.value?.status === 'failed' ? state.value.id : crypto.randomUUID(),
				},
			);
			if (!disposed && current === revision) state.value = result;
		} finally {
			if (!disposed && threadId === target.threadId()) {
				sending.value = false;
				await refresh();
			}
		}
	}

	const unsubscribe = push.addEventListener((event) => {
		if (
			event.type === 'agentBackgroundTasksUpdated' &&
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
			clearTimeout(timer);
			state.value = null;
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
		clearTimeout(timer);
		unsubscribe();
	});
	return { state, isStopping, stopAll, refresh };
}
