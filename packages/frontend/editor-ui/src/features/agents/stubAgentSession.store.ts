import { useLocalStorage } from '@vueuse/core';
import { defineStore } from 'pinia';
import { computed, ref, watch, onScopeDispose } from 'vue';
import { AGENT_EVAL_RUN_POLL_INTERVAL } from '@/app/constants/durations';
import type { AgentBackgroundJobDto, AgentChatResumeDto } from '@n8n/api-types';
import { z } from 'zod';
import type { AgentExecution, AgentExecutionStatus } from './composables/useAgentThreadsApi';

const stubApprovalResponseSchema = z.object({ approved: z.boolean() });

export const useStubAgentSessionStore = defineStore('stubAgentSession', () => {
	const storedActive = useLocalStorage('N8N_AGENT_STUB_SESSION_STORE', false);
	const active = computed({
		get: () => import.meta.env.DEV && storedActive.value,
		set: (value: boolean) => {
			storedActive.value = import.meta.env.DEV && value;
		},
	});
	const executionKinds: AgentExecutionStatus[] = [
		'success',
		'running',
		'error',
		'cancelled',
		'interrupted',
	];
	const enabledKinds = ref<AgentExecutionStatus[]>([...executionKinds]);
	const scenarios = ['simple', 'fanout', 'background'] as const;
	const scenario = ref<(typeof scenarios)[number]>('simple');
	const showJobs = ref(true);
	const jobStates: Array<AgentBackgroundJobDto['status']> = [
		'running',
		'suspended',
		'paused',
		'completed',
		'failed',
		'cancelled',
	];
	const jobStateIndex = ref(0);
	const backgroundJobStateIndexes = ref([0, 0, 0]);
	const resolvedJobStatuses = ref(new Map<string, 'completed' | 'cancelled'>());
	const backgroundJobIntervals = [
		AGENT_EVAL_RUN_POLL_INTERVAL,
		AGENT_EVAL_RUN_POLL_INTERVAL * 1.5,
		AGENT_EVAL_RUN_POLL_INTERVAL * 2,
	];
	const start = Date.now() - 120000;
	const executions = computed<AgentExecution[]>(() =>
		(scenario.value === 'fanout'
			? enabledKinds.value
			: (['success'] satisfies AgentExecutionStatus[])
		).map((status) => {
			const timestamp = start + executionKinds.indexOf(status) * 15000;
			const execution: AgentExecution = {
				id: `stub-${status}`,
				threadId: 'stub-thread',
				agentId: 'stub-agent',
				status,
				createdAt: new Date(timestamp).toISOString(),
				startedAt: new Date(timestamp).toISOString(),
				stoppedAt: status === 'running' ? null : new Date(timestamp + 11900).toISOString(),
				duration: 14000,
				userMessage: 'Summarize the weekly project updates.',
				author: null,
				attachments: null,
				model: 'gpt-4.1-mini',
				promptTokens: 640,
				completionTokens: 160,
				totalTokens: 800,
				cost: 0.0005,
				timeline: [
					...(scenario.value === 'fanout'
						? [
								{
									type: 'suspension',
									toolName: 'approve_update',
									toolCallId: `approval-${status}`,
									timestamp: timestamp + 100,
									input: {},
									suspendPayload: { type: 'tool-approval' },
								},
								{
									type: 'hitl-response',
									toolCallId: `approval-${status}`,
									response: { approved: true },
									timestamp: timestamp + 200,
								},
								{
									type: 'background-task-signal',
									timestamp: timestamp + 300,
									signal: {
										tasks: [
											{
												id: 'finished-task',
												title: 'Review updates',
												kind: 'subagent',
												status: 'completed',
											},
										],
									},
								},
								{
									type: 'tool-call',
									kind: 'node',
									name: 'http_request',
									toolCallId: `node-${status}`,
									input: {},
									output: {},
									startTime: timestamp + 400,
									endTime: timestamp + 500,
									success: true,
									nodeType: 'n8n-nodes-base.httpRequest',
									nodeTypeVersion: 4,
									nodeDisplayName: 'HTTP Request',
								},
								{
									type: 'tool-call',
									kind: 'skill',
									name: 'load_skill',
									toolCallId: `skill-${status}`,
									input: { skillId: 'weekly-review' },
									output: {},
									startTime: timestamp + 600,
									endTime: timestamp + 700,
									success: true,
								},
							]
						: []),
					{
						type: 'tool-call',
						toolCallId: `stub-tool-${status}`,
						name: 'project_updates',
						input: { period: 'weekly' },
						output: status === 'success' ? { tasks: 2 } : null,
						startTime: timestamp + 1000,
						endTime: status === 'success' ? timestamp + 7000 : 0,
						success: status === 'success',
					},
					{
						type: 'tool-call',
						kind: 'workflow',
						toolCallId: `stub-workflow-${status}`,
						name: 'weekly_metrics',
						workflowName: 'Collect weekly metrics',
						input: { period: 'weekly' },
						output: { completedTasks: 12, pendingReviews: 2 },
						startTime: timestamp + 7500,
						endTime: timestamp + 11000,
						success: true,
					},
					{
						type: 'tool-call',
						name: 'review_updates',
						toolCallId: `review-${status}`,
						input: {},
						output: {},
						startTime: timestamp + 11100,
						endTime: timestamp + 11500,
						success: true,
					},
					{
						type: 'text',
						content: 'The project is on schedule. Two tasks need review.',
						timestamp: timestamp + 12000,
						endTime: timestamp + 14000,
					},
				],
				error: status === 'error' ? 'The project service did not respond.' : null,
				failureSummary: null,
				finishReason: null,
				guardrailCode: null,
				hitlStatus: null,
				source: 'chat',
			};
			if (scenario.value === 'background') {
				execution.timeline = [
					...(execution.timeline?.filter((event) => event.type !== 'text') ?? []),
					{
						type: 'tool-call',
						kind: 'node',
						name: 'http_request',
						toolCallId: `background-node-${status}`,
						input: {},
						output: {},
						startTime: timestamp + 11600,
						endTime: timestamp + 12000,
						success: true,
						nodeType: 'n8n-nodes-base.httpRequest',
						nodeTypeVersion: 4,
						nodeDisplayName: 'HTTP Request',
					},
					{
						type: 'tool-call',
						kind: 'skill',
						name: 'load_skill',
						toolCallId: `background-skill-${status}`,
						input: { skillId: 'weekly-review' },
						output: {},
						startTime: timestamp + 12100,
						endTime: timestamp + 12500,
						success: true,
					},
				];
			}
			return execution;
		}),
	);
	const jobs = computed<AgentBackgroundJobDto[]>(() => {
		if (!showJobs.value || scenario.value === 'simple') return [];
		return (
			scenario.value === 'background'
				? (['success'] satisfies AgentExecutionStatus[])
				: enabledKinds.value
		).flatMap((executionStatus) => {
			const timestamp = start + executionKinds.indexOf(executionStatus) * 15000;
			return (
				['subagent', 'workflow', 'subagent'] satisfies Array<AgentBackgroundJobDto['kind']>
			).map((kind, index) => {
				const stateIndex =
					scenario.value === 'background'
						? (backgroundJobStateIndexes.value[index] ?? 0)
						: jobStateIndex.value;
				const id = `stub-job-${executionStatus}-${kind}-${index}`;
				const status = resolvedJobStatuses.value.get(id) ?? jobStates[stateIndex] ?? 'running';
				const job: AgentBackgroundJobDto = {
					id,
					title: index === 0 ? 'Review project updates' : 'Collect weekly metrics',
					kind,
					status,
					startedAt: new Date(
						timestamp + (scenario.value === 'background' ? 15000 : 3000) + index * 2000,
					).toISOString(),
				};
				if (status === 'suspended') {
					job.approval = {
						runId: `background-job-${job.id}`,
						toolCallId: `stub-approval-${executionStatus}-${kind}-${index}`,
						suspendPayload: {
							type: 'approval',
							toolName: 'send_project_update',
							displayName: 'Send project update',
							args: {
								channel: '#project-updates',
								message: 'The project is on schedule. Two tasks need review.',
							},
						},
					};
				}
				if (status === 'completed' || status === 'failed' || status === 'cancelled')
					job.settledAt = new Date(
						timestamp + (scenario.value === 'background' ? 25000 : 11000),
					).toISOString();
				return job;
			});
		});
	});
	/** Resolve mock approvals locally. Do not send mock run IDs to the API. */
	function respondToApproval(payload: AgentChatResumeDto) {
		if (!active.value) return;
		const response = stubApprovalResponseSchema.safeParse(payload.resumeData);
		if (!response.success) return;
		const index = jobs.value.findIndex(
			(job) =>
				job.status === 'suspended' &&
				job.approval?.runId === payload.runId &&
				job.approval.toolCallId === payload.toolCallId,
		);
		const job = jobs.value[index];
		if (!job) return;
		const status = response.data.approved ? 'completed' : 'cancelled';
		if (scenario.value === 'background') {
			backgroundJobStateIndexes.value[index] = jobStates.indexOf(status);
		} else {
			resolvedJobStatuses.value.set(job.id, status);
		}
	}

	const timers: Array<ReturnType<typeof setInterval>> = [];

	function stopCycle() {
		for (const timer of timers) clearInterval(timer);
		timers.length = 0;
	}

	function cycleBackgroundJob(index: number) {
		let nextIndex = ((backgroundJobStateIndexes.value[index] ?? 0) + 1) % jobStates.length;
		if (index !== 0 && jobStates[nextIndex] === 'suspended') {
			nextIndex = (nextIndex + 1) % jobStates.length;
		}
		backgroundJobStateIndexes.value[index] = nextIndex;
	}
	watch(
		[active, scenario, showJobs],
		() => {
			stopCycle();
			resolvedJobStatuses.value.clear();
			if (active.value && scenario.value === 'background' && showJobs.value) {
				for (const [index, interval] of backgroundJobIntervals.entries()) {
					timers.push(
						setInterval(() => {
							if (
								index === 0 &&
								jobStates[backgroundJobStateIndexes.value[index] ?? 0] === 'suspended'
							) {
								return;
							}
							cycleBackgroundJob(index);
						}, interval),
					);
				}
			}
		},
		{ immediate: true },
	);
	onScopeDispose(stopCycle);
	function toggleKind(kind: AgentExecutionStatus) {
		enabledKinds.value = enabledKinds.value.includes(kind)
			? enabledKinds.value.filter((value) => value !== kind)
			: [...enabledKinds.value, kind];
	}
	function cycleJobs() {
		resolvedJobStatuses.value.clear();
		if (scenario.value === 'background') {
			for (const index of backgroundJobStateIndexes.value.keys()) cycleBackgroundJob(index);
			return;
		}
		jobStateIndex.value = (jobStateIndex.value + 1) % jobStates.length;
	}
	return {
		active,
		scenarios,
		scenario,
		executionKinds,
		enabledKinds,
		showJobs,
		executions,
		jobs,
		toggleKind,
		cycleJobs,
		respondToApproval,
	};
});
