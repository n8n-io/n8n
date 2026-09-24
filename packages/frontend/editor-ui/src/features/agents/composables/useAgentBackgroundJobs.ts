import type {
	AgentBackgroundJobSignal,
	AgentBackgroundJobsResponse,
	AgentChatResumeDto,
	PushMessage,
} from '@n8n/api-types';
import { useRootStore } from '@n8n/stores/useRootStore';
import { useDocumentVisibility } from '@vueuse/core';
import { computed, onScopeDispose, ref, toValue, watch, type MaybeRefOrGetter } from 'vue';

import { TIME } from '@/app/constants/durations';
import { usePushConnectionStore } from '@/app/stores/pushConnection.store';

import { getAgentBackgroundJobs, resumeAgentBackgroundJob } from './useAgentApi';

interface BackgroundJobsTarget {
	projectId: MaybeRefOrGetter<string>;
	agentId: MaybeRefOrGetter<string>;
	threadId: MaybeRefOrGetter<string | undefined>;
	active: MaybeRefOrGetter<boolean>;
	receivedJobs?: MaybeRefOrGetter<AgentBackgroundJobSignal['tasks']>;
}

const MAX_RETRIES = 2;

export function useAgentBackgroundJobs(target: BackgroundJobsTarget) {
	const rootStore = useRootStore();
	const pushStore = usePushConnectionStore();
	const visibility = useDocumentVisibility();
	const group = ref<AgentBackgroundJobsResponse>({ tasks: [] });
	const jobs = computed(() => {
		const received = new Map(toValue(target.receivedJobs)?.map((job) => [job.id, job]));
		// A late job response must not restore a running status after its chat signal arrives.
		const current = group.value.tasks.map((job) => ({
			...job,
			status: received.get(job.id)?.status ?? job.status,
		}));
		if (current.some((job) => job.status === 'running' || job.status === 'suspended'))
			return current;
		return group.value.pendingTaskIds?.some((id) => !received.has(id)) ? current : [];
	});
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

	async function fetchJobs() {
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
			const result = await getAgentBackgroundJobs(
				rootStore.restApiContext,
				projectId,
				agentId,
				threadId,
			);
			if (isCurrent()) {
				group.value = {
					...result,
					tasks: [...result.tasks].sort(
						(a, b) => a.startedAt.localeCompare(b.startedAt) || a.id.localeCompare(b.id),
					),
				};
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
		void Promise.resolve().then(fetchJobs);
	}

	function refresh() {
		retries = 0;
		scheduleRefresh();
	}

	async function respondToApproval(payload: AgentChatResumeDto) {
		const threadId = toValue(target.threadId);
		if (!threadId) return;
		const requestGeneration = generation;
		try {
			await resumeAgentBackgroundJob(
				rootStore.restApiContext,
				toValue(target.projectId),
				toValue(target.agentId),
				threadId,
				payload,
			);
			if (generation === requestGeneration) {
				for (const job of group.value.tasks) {
					if (
						job.approval?.runId === payload.runId &&
						job.approval.toolCallId === payload.toolCallId
					) {
						delete job.approval;
					}
				}
			}
		} finally {
			refresh();
		}
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
			group.value = { tasks: [] };
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

	return { jobs, respondToApproval };
}
