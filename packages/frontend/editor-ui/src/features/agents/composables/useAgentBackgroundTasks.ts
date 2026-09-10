import type { AgentBackgroundTaskDto, PushMessage } from '@n8n/api-types';
import { useRootStore } from '@n8n/stores/useRootStore';
import { useDocumentVisibility } from '@vueuse/core';
import { computed, onScopeDispose, ref, toValue, watch, type MaybeRefOrGetter } from 'vue';

import { TIME } from '@/app/constants/durations';
import { usePushConnectionStore } from '@/app/stores/pushConnection.store';

import { getAgentBackgroundTasks } from './useAgentApi';

interface BackgroundTasksTarget {
	projectId: MaybeRefOrGetter<string>;
	agentId: MaybeRefOrGetter<string>;
	threadId: MaybeRefOrGetter<string | undefined>;
	active: MaybeRefOrGetter<boolean>;
}

const MAX_RETRIES = 2;

export function useAgentBackgroundTasks(target: BackgroundTasksTarget) {
	const rootStore = useRootStore();
	const pushStore = usePushConnectionStore();
	const visibility = useDocumentVisibility();
	const tasks = ref<AgentBackgroundTaskDto[]>([]);
	const active = computed(() => toValue(target.active) && visibility.value === 'visible');
	let generation = 0;
	let disposed = false;
	let inFlight: { generation: number } | undefined;
	let queued = false;
	let scheduled = false;
	let retries = 0;
	let retryTimer: ReturnType<typeof setTimeout> | undefined;

	function clearRetry() {
		clearTimeout(retryTimer);
		retryTimer = undefined;
	}

	async function fetchTasks() {
		scheduled = false;
		const projectId = toValue(target.projectId);
		const agentId = toValue(target.agentId);
		const threadId = toValue(target.threadId);
		if (disposed || !active.value || !threadId) return;
		if (inFlight) {
			queued = true;
			return;
		}
		const requestGeneration = generation;
		const request = { generation: requestGeneration };
		inFlight = request;
		const isCurrent = () =>
			!disposed &&
			active.value &&
			generation === requestGeneration &&
			projectId === toValue(target.projectId) &&
			agentId === toValue(target.agentId) &&
			threadId === toValue(target.threadId);
		try {
			const result = await getAgentBackgroundTasks(
				rootStore.restApiContext,
				projectId,
				agentId,
				threadId,
			);
			if (isCurrent()) {
				tasks.value = [...result.tasks].sort(
					(a, b) => a.startedAt.localeCompare(b.startedAt) || a.id.localeCompare(b.id),
				);
				retries = 0;
			}
		} catch {
			if (isCurrent() && !queued && retries < MAX_RETRIES) {
				retryTimer = setTimeout(
					() => {
						retryTimer = undefined;
						scheduleRefresh();
					},
					TIME.SECOND * 2 ** retries++,
				);
			}
		} finally {
			if (inFlight === request) {
				inFlight = undefined;
				if (queued) {
					queued = false;
					scheduleRefresh();
				}
			}
		}
	}

	function scheduleRefresh() {
		if (disposed || !active.value || scheduled) return;
		clearRetry();
		scheduled = true;
		void Promise.resolve().then(fetchTasks);
	}

	function refresh() {
		retries = 0;
		scheduleRefresh();
	}

	// The chat stream owns the shared connection. Subscribe before the first fetch.
	const removeListener = pushStore.addEventListener((event: PushMessage) => {
		if (
			event.type === 'agentBackgroundTasksUpdated' &&
			event.data.projectId === toValue(target.projectId) &&
			event.data.agentId === toValue(target.agentId) &&
			event.data.threadId === toValue(target.threadId)
		)
			refresh();
	});

	watch(
		[
			() => toValue(target.projectId),
			() => toValue(target.agentId),
			() => toValue(target.threadId),
		],
		() => {
			generation++;
			inFlight = undefined;
			queued = false;
			tasks.value = [];
			clearRetry();
			refresh();
		},
		{ flush: 'sync' },
	);
	watch(
		active,
		(enabled) => {
			generation++;
			inFlight = undefined;
			queued = false;
			clearRetry();
			if (enabled) refresh();
		},
		{ immediate: true },
	);
	watch(
		() => pushStore.isConnected,
		(connected) => {
			if (connected) refresh();
		},
	);

	onScopeDispose(() => {
		disposed = true;
		clearRetry();
		removeListener();
	});

	return { tasks };
}
