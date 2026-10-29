import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue';
import { useI18n } from '@n8n/i18n';
import { useToast } from '@n8n/composables/useToast';
import { AGENT_SUMMARY_WAIT_TIMEOUT } from '@/app/constants/durations';
import type { ChatMessage } from '@/features/ai/shared/agentsChat/types';
import { TOOL_CALL_STATE } from '../constants';
import { getAgentPlanTasks, isAgentPlanFinished } from '../utils/agent-plan';
import type { AgentChatChannel } from './useAgentApi';
import { useAgentBackgroundJobs } from './useAgentBackgroundJobs';
import { useAgentPlan } from './useAgentPlan';
import { useAgentTaskCancellation } from './useAgentTaskCancellation';

export type AgentTaskStopNotice = 'stopping' | 'preparing' | 'failed' | 'reportFailed';

interface AgentChatTaskControlsOptions {
	projectId: () => string;
	agentId: () => string;
	threadId: () => string | undefined;
	channel: () => AgentChatChannel;
	backgroundJobsActive: () => boolean;
	visible: () => boolean;
	messages: () => ChatMessage[];
	requestStop: (planId: string | null) => Promise<void>;
	hasPendingApprovals: () => boolean;
	focusInput: (options?: FocusOptions) => void;
}

export function useAgentChatTaskControls(options: AgentChatTaskControlsOptions) {
	const locale = useI18n();
	const toast = useToast();
	let disposed = false;

	const planStopActive = computed(
		() => options.channel() === 'chat' && options.backgroundJobsActive(),
	);

	const completedPlanCalls = computed(() =>
		options
			.messages()
			.flatMap((message) => message.toolCalls ?? [])
			.filter(
				(call) =>
					['create_plan', 'read_plan', 'update_plan', 'close_plan'].includes(call.tool) &&
					call.state === TOOL_CALL_STATE.DONE,
			)
			.map((call) => call.toolCallId)
			.join(','),
	);

	const { plan: currentPlan, refresh: refreshPlan } = useAgentPlan({
		projectId: options.projectId,
		agentId: options.agentId,
		threadId: options.threadId,
		active: () => true,
		channel: options.channel,
	});

	const {
		state: planStop,
		isStopping: stoppingPlan,
		stopAll: stopPlan,
	} = useAgentTaskCancellation({
		projectId: options.projectId,
		agentId: options.agentId,
		threadId: options.threadId,
		active: () => planStopActive.value,
		planId: () => currentPlan.value?.planId ?? null,
		requestStop: options.requestStop,
	});

	const {
		jobs: backgroundJobs,
		respondToApproval,
		stopAll,
		isStopping,
	} = useAgentBackgroundJobs({
		projectId: options.projectId,
		agentId: options.agentId,
		threadId: options.threadId,
		active: options.backgroundJobsActive,
		channel: options.channel,
		receivedJobs: () =>
			options.messages().flatMap((message) => message.backgroundJobSignal?.tasks ?? []),
	});

	watch(completedPlanCalls, () => {
		void refreshPlan();
	});

	const currentPlanStop = computed(() =>
		planStopActive.value && planStop.value?.planId === (currentPlan.value?.planId ?? null)
			? planStop.value
			: null,
	);

	const planExpanded = ref(false);

	watch(
		[options.projectId, options.agentId, options.threadId, () => currentPlan.value?.planId],
		() => {
			planExpanded.value = false;
		},
	);

	const canStopBackgroundJobs = computed(() =>
		backgroundJobs.value.some((job) => job.status === 'running' || job.status === 'suspended'),
	);

	const backgroundStoppingIds = computed(
		() =>
			new Set(
				backgroundJobs.value
					.filter(
						(job) =>
							(job.status === 'running' || job.status === 'suspended') &&
							(isStopping.value || job.pauseRequested),
					)
					.map((job) => job.id),
			),
	);

	const stopFailed = ref(false);
	let stopRequestId = 0;

	const tasksStopping = computed(
		() =>
			isStopping.value ||
			stoppingPlan.value ||
			currentPlanStop.value?.status === 'stopping' ||
			backgroundStoppingIds.value.size > 0,
	);

	const canRetryStop = computed(
		() =>
			stopFailed.value ||
			currentPlanStop.value?.status === 'failed' ||
			(!isStopping.value &&
				backgroundJobs.value.some(
					(job) => job.kind === 'workflow' && job.status === 'running' && job.pauseRequested,
				)),
	);

	const stopDisabled = computed(() =>
		options.channel() === 'n8n-chat'
			? isStopping.value
			: isStopping.value || stoppingPlan.value || (tasksStopping.value && !canRetryStop.value),
	);

	const backgroundStopLabel = computed(() => {
		if (options.channel() === 'n8n-chat') {
			return locale.baseText('agents.chat.backgroundTasks.stopAll');
		}

		if (stopDisabled.value) return locale.baseText('agents.chat.tasks.stopping');

		if (canRetryStop.value) return locale.baseText('agents.chat.tasks.retry');

		return locale.baseText('agents.chat.tasks.stopAll');
	});

	const tasksStopped = computed(() => {
		if (!planStopActive.value) return false;

		if (tasksStopping.value || canStopBackgroundJobs.value) return false;

		if (backgroundJobs.value.some((job) => job.status === 'paused')) return true;

		// A job that finishes after Continue supersedes an earlier workflow stop.
		const latest = [...backgroundJobs.value].sort((a, b) =>
			(b.settledAt ?? '').localeCompare(a.settledAt ?? ''),
		)[0];

		return Boolean(latest?.pauseRequested);
	});

	const planStopped = computed(() => {
		const tasks = currentPlan.value ? getAgentPlanTasks(currentPlan.value) : [];
		const unfinished = tasks.filter((item) =>
			['pending', 'in_progress', 'paused'].includes(item.status),
		);

		return unfinished.length > 0 && unfinished.every((item) => item.status === 'paused');
	});

	const canStopPlan = computed(
		() =>
			planStopActive.value &&
			!planStopped.value &&
			(canStopBackgroundJobs.value ||
				(!currentPlan.value?.closed &&
					currentPlan.value?.document.items.some(
						(item) =>
							item.status === 'pending' ||
							item.status === 'in_progress' ||
							(item.kind === 'group' &&
								item.tasks.some(
									(task) => task.status === 'pending' || task.status === 'in_progress',
								)),
					))),
	);

	const showPlanStop = computed(
		() => planStopActive.value && (canStopPlan.value || tasksStopping.value),
	);

	watch(
		[
			options.projectId,
			options.agentId,
			options.threadId,
			() => currentPlan.value?.planId,
			options.channel,
			planStopActive,
		],
		() => {
			stopFailed.value = false;
			stopRequestId++;
		},
		{ flush: 'sync' },
	);

	watch(canStopBackgroundJobs, () => {
		stopFailed.value = false;
	});

	let taskStopFocus:
		| { button: EventTarget | null; threadId?: string; projectId: string; agentId: string }
		| undefined;

	async function restoreTaskStopFocus() {
		if (!taskStopFocus) return;

		const target = taskStopFocus;
		taskStopFocus = undefined;
		await nextTick();

		if (
			disposed ||
			!options.visible() ||
			options.threadId() !== target.threadId ||
			options.projectId() !== target.projectId ||
			options.agentId() !== target.agentId ||
			options.hasPendingApprovals() ||
			document.activeElement !== document.body
		)
			return;

		if (
			target.button instanceof HTMLElement &&
			target.button.isConnected &&
			!target.button.matches(':disabled')
		)
			target.button.focus({ preventScroll: true });
		else options.focusInput({ preventScroll: true });
	}

	watch(stopDisabled, () => {
		void restoreTaskStopFocus();
	});

	async function stopTasks(event: MouseEvent) {
		const stopCurrentPlan = planStopActive.value;

		if (
			stopDisabled.value ||
			!(canRetryStop.value || (stopCurrentPlan ? canStopPlan.value : canStopBackgroundJobs.value))
		)
			return;

		stopFailed.value = false;
		const requestId = ++stopRequestId;

		if (event.currentTarget === document.activeElement) {
			taskStopFocus = {
				button: event.currentTarget,
				threadId: options.threadId(),
				projectId: options.projectId(),
				agentId: options.agentId(),
			};
		}

		try {
			if (stopCurrentPlan) await stopPlan();
			else await stopAll();
		} catch (error) {
			if (disposed || requestId !== stopRequestId) return;

			stopFailed.value = true;

			// A plan conflict rejects a stale plan ID. Read the latest plan so Retry sends its ID.
			if (stopCurrentPlan) void refreshPlan();

			if (!planStopActive.value)
				toast.showError(error, locale.baseText('agents.chat.backgroundTasks.stopError'));
		}

		await restoreTaskStopFocus();
	}

	const hideStoppedStack = computed(
		() =>
			planStopActive.value &&
			(stoppingPlan.value ||
				stopFailed.value ||
				(currentPlanStop.value && currentPlanStop.value.status !== 'resumed') ||
				(currentPlan.value ? planStopped.value : tasksStopped.value)),
	);

	const planFinished = computed(
		() => currentPlan.value !== null && isAgentPlanFinished(currentPlan.value),
	);

	const showPlanCard = computed(
		() => Boolean(currentPlan.value) && !hideStoppedStack.value && !planFinished.value,
	);

	const stopNotice = computed<AgentTaskStopNotice | null>(() => {
		if (!planStopActive.value) return null;

		if (stoppingPlan.value) return 'stopping';

		if (stopFailed.value || currentPlanStop.value?.status === 'failed') return 'failed';

		if (currentPlanStop.value?.status === 'resumed') return null;

		if (currentPlanStop.value?.status === 'stopping') return 'stopping';

		const report = currentPlanStop.value?.report;
		const savedReply = options
			.messages()
			.some(
				(message) =>
					message.executionId === report?.executionId &&
					message.stopReport &&
					(message.content.trim() || message.status !== 'streaming'),
			);

		if (savedReply) return null;

		if (currentPlanStop.value?.reportFailed) return 'reportFailed';

		if (
			report &&
			['queued', 'running'].includes(report.status) &&
			!options
				.messages()
				.some(
					(message) =>
						message.executionId === report.executionId &&
						message.role === 'assistant' &&
						message.content.trim(),
				)
		)
			return 'preparing';

		return null;
	});

	const awaitingSummary = computed(
		() =>
			options.backgroundJobsActive() &&
			!hideStoppedStack.value &&
			!stopNotice.value &&
			(!currentPlan.value || planFinished.value) &&
			backgroundJobs.value.length > 0 &&
			backgroundJobs.value.every((job) =>
				['completed', 'failed', 'cancelled'].includes(job.status),
			),
	);

	// The results stay pending if the wake gives up, so stop waiting after a limit.
	const summaryWaitExpired = ref(false);

	watch(
		awaitingSummary,
		(awaiting, _, onCleanup) => {
			summaryWaitExpired.value = false;

			if (!awaiting) return;

			const timer = setTimeout(() => {
				summaryWaitExpired.value = true;
			}, AGENT_SUMMARY_WAIT_TIMEOUT);

			onCleanup(() => clearTimeout(timer));
		},
		{ immediate: true },
	);

	const preparingSummary = computed(() => awaitingSummary.value && !summaryWaitExpired.value);
	const summaryMissing = computed(() => awaitingSummary.value && summaryWaitExpired.value);

	watch(hideStoppedStack, () => {
		void restoreTaskStopFocus();
	});

	const showBackgroundJobs = computed(
		() =>
			options.backgroundJobsActive() &&
			!hideStoppedStack.value &&
			(options.channel() !== 'chat' || !currentPlan.value) &&
			backgroundJobs.value.some((job) => ['running', 'suspended'].includes(job.status)),
	);

	const planCardProps = computed(() => ({
		showStop: showPlanStop.value,
		canStop: canStopPlan.value,
		stopping: planStopActive.value && stopDisabled.value,
		stopped: planStopped.value,
		stoppedAt: currentPlanStop.value?.requestedAt,
		stopFailed: canRetryStop.value && canStopPlan.value && !isStopping.value,
	}));

	onBeforeUnmount(() => {
		disposed = true;
	});

	return {
		currentPlan,
		planExpanded,
		planStopActive,
		planCardProps,
		showPlanCard,
		backgroundJobs,
		showBackgroundJobs,
		canStopBackgroundJobs,
		backgroundStoppingIds,
		backgroundStopLabel,
		tasksStopping,
		stopDisabled,
		stopNotice,
		preparingSummary,
		summaryMissing,
		stopTasks,
		respondToApproval,
	};
}
