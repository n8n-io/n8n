import type { AgentTaskCancellationState, AgentTaskStopFailure } from '@n8n/api-types';
import { LockNamespace, LockService } from '@n8n/backend-common';
import { TransactionRunner } from '@n8n/db';
import { Service } from '@n8n/di';
import { ConflictError, NotFoundError } from '@n8n/errors';
import { scrubSecretsInText } from '@n8n/utils/scrub-secrets';
import { randomUUID } from 'node:crypto';

import { AgentChatExecutionService } from './agent-chat-execution.service';
import { AgentExecutionUpdateBroadcaster } from './agent-execution-update-broadcaster';
import { AgentPlanService } from './agent-plan.service';
import { AgentBackgroundJobService } from './background/agent-background-job.service';
import { AgentTaskCancellation } from './entities/agent-task-cancellation.entity';
import { N8NCheckpointStorage } from './integrations/n8n-checkpoint-storage';
import { parseAgentPlan, type AgentPlanItem, type AgentPlanTask } from './plans/agent-plan.schema';
import { presentPlan } from './plans/agent-plan-tools';
import { AgentExecutionRepository } from './repositories/agent-execution.repository';
import { AgentExecutionThreadRepository } from './repositories/agent-execution-thread.repository';
import { AgentMessageQueueRepository } from './repositories/agent-message-queue.repository';
import { AgentPlanRepository } from './repositories/agent-plan.repository';
import { AgentTaskCancellationRepository } from './repositories/agent-task-cancellation.repository';

const active = (status: string) => ['running', 'suspended', 'paused'].includes(status);

export function cancelPlanItems(items: AgentPlanItem[], endedAt: string): AgentPlanItem[] {
	const stop = <T extends AgentPlanItem | AgentPlanTask>(item: T): T =>
		item.status === 'pending' || item.status === 'in_progress'
			? { ...item, status: 'cancelled', endedAt }
			: item;
	return items.map((item) =>
		item.kind === 'group' ? { ...stop(item), tasks: item.tasks.map(stop) } : stop(item),
	);
}

@Service()
export class AgentTaskCancellationService {
	constructor(
		private readonly repository: AgentTaskCancellationRepository,
		private readonly threads: AgentExecutionThreadRepository,
		private readonly executions: AgentExecutionRepository,
		private readonly queue: AgentMessageQueueRepository,
		private readonly plans: AgentPlanRepository,
		private readonly planService: AgentPlanService,
		private readonly jobs: AgentBackgroundJobService,
		private readonly chatExecutions: AgentChatExecutionService,
		private readonly txRunner: TransactionRunner,
		private readonly locks: LockService,
		private readonly updates: AgentExecutionUpdateBroadcaster,
		private readonly checkpoints: N8NCheckpointStorage,
	) {}

	async request(
		threadId: string,
		planId: string | null,
		cancellationId?: string,
	): Promise<AgentTaskCancellationState> {
		let responseId = cancellationId;
		let agentId: string | undefined;
		await this.txRunner.run({}, async (ctx) => {
			const thread = await this.threads.lockById(threadId, ctx);
			if (!thread) throw new NotFoundError('Session not found');
			agentId = thread.agentId;
			const existing = cancellationId
				? await this.repository.findRequest(threadId, cancellationId, ctx)
				: null;
			if (existing && existing.status !== 'failed') return;
			const plan = await this.plans.findLatestPlan(threadId, ctx);
			if ((plan?.id ?? null) !== planId)
				throw new ConflictError('The plan has changed. Refresh it and try again.');
			const previous = await this.repository.latest(threadId, ctx);
			if (previous?.planId === planId) {
				if (previous.status !== 'stopped' || !(await this.repository.hasNewWork(previous, ctx))) {
					responseId = previous.id;
					if (previous.status === 'failed') {
						previous.status = 'stopping';
						await this.repository.saveRequest(previous, ctx);
					}
					return;
				}
			}
			const request = Object.assign(new AgentTaskCancellation(), {
				generation: await this.repository.captureGeneration(threadId, ctx),
				id: cancellationId ?? randomUUID(),
				threadId,
				planId,
				status: 'stopping',
				cutoffAt: new Date(),
				settledAt: null,
				failures: [],
				reportStatus: 'pending',
				report: '',
			});
			await this.repository.saveRequest(request, ctx);
			await this.queue.holdPending(threadId, ctx);
		});
		this.updates.notifyQueueUpdated(threadId);
		if (agentId) this.updates.notifyBackgroundJobsUpdated(agentId, threadId);
		await this.reconcile(threadId);
		return (await this.state(threadId, responseId))!;
	}

	async reconcile(threadId: string): Promise<void> {
		await this.locks.withLease(
			LockNamespace.KNOWN_LOCKS,
			`agent-task-cancellation:${threadId}`,
			async () => {
				const request = await this.repository.latest(threadId);
				if (!request || request.status !== 'stopping') return;
				const thread = await this.threads.findOneBy({ id: threadId });
				if (!thread?.ownerId) return;
				const failures: AgentTaskStopFailure[] = [];
				const execution = await this.executions.findLatestByThreadId(threadId);
				if (
					execution &&
					(request.generation.executionIds.includes(execution.id) ||
						execution.createdAt <= request.cutoffAt) &&
					(execution.status === 'running' || execution.hitlStatus === 'suspended')
				) {
					try {
						await this.chatExecutions.cancelTasksInRuntime({
							projectId: thread.projectId,
							agentId: thread.agentId,
							threadId,
							executionId: execution.id,
							userId: thread.ownerId,
							scope: 'foreground',
						});
					} catch {
						failures.push({ jobId: execution.id, title: 'Current response' });
					}
				}
				const jobs = await this.repository.targetedJobs(request);
				// Stop descendants before their parents so checkpoint cleanup cannot hide them.
				for (const job of jobs.toReversed()) {
					if (
						!active(job.status) &&
						job.status !== 'cancelled' &&
						!request.failures.some((failure) => failure.jobId === job.id)
					)
						continue;
					try {
						await this.jobs.cancelPermanently(job.parentThreadId, job.id);
					} catch {
						failures.push({ jobId: job.id, title: job.title });
					}
				}
				for (const child of await this.repository.targetedDescendants(request)) {
					try {
						await this.checkpoints.deleteDelegatedForThread(child.agentId, child.id);
					} catch {
						failures.push({ jobId: child.id, title: child.agentName });
					}
				}
				await this.txRunner.run({}, async (ctx) => {
					await this.threads.lockById(threadId, ctx);
					const current = await this.repository.latest(threadId, ctx);
					if (current?.id !== request.id || current.status !== 'stopping') return;
					const settledJobs = await this.repository.targetedJobs(current, ctx);
					for (const job of settledJobs.filter((job) => active(job.status))) {
						if (!failures.some((failure) => failure.jobId === job.id))
							failures.push({ jobId: job.id, title: job.title });
					}
					current.failures = failures.filter((failure) => {
						const job = settledJobs.find((item) => item.id === failure.jobId);
						return job?.status !== 'completed' && job?.status !== 'failed';
					});
					if (current.failures.length) {
						current.status = 'failed';
					} else if (
						!(await this.repository.hasRunningWork(current, ctx)) &&
						!(await this.checkpoints.findSuspendedForThread(thread.agentId, threadId, ctx))
					) {
						const plan = current.planId
							? await this.plans.findPlan(threadId, current.planId, ctx)
							: null;
						let completed = settledJobs.filter((job) => job.status === 'completed').length;
						let cancelled = settledJobs.filter((job) => job.status === 'cancelled').length;
						if (plan) {
							const data = parseAgentPlan(plan.data, plan.formatVersion);
							const tasks = data.items.flatMap((item) =>
								item.kind === 'group' ? item.tasks : [item],
							);
							completed = tasks.filter((task) => task.status === 'done').length;
							cancelled = tasks.filter((task) =>
								['pending', 'in_progress', 'cancelled'].includes(task.status),
							).length;
							if (!plan.closedAt)
								await this.plans.cancelPlan(
									{
										threadId,
										planId: plan.id,
										expectedRevision: plan.revision,
										formatVersion: plan.formatVersion,
										data: { ...data, items: cancelPlanItems(data.items, new Date().toISOString()) },
									},
									ctx,
								);
						}
						await this.repository.consumeTargetedMail(
							settledJobs.map((job) => job.id),
							ctx,
						);
						current.status = 'stopped';
						current.settledAt = new Date();
						current.report = `${completed} ${plan ? 'plan tasks' : 'background jobs'} completed. ${cancelled} ${plan ? 'plan tasks' : 'background jobs'} canceled. ${settledJobs.filter((job) => job.status === 'completed').length} background jobs have saved completed results. All background work in this chat has stopped. Queued messages remain held until you send them.`;
					}
					await this.repository.saveRequest(current, ctx);
				});
				this.updates.notifyBackgroundJobsUpdated(thread.agentId, threadId);
			},
		);
	}

	async state(
		threadId: string,
		cancellationId?: string,
	): Promise<AgentTaskCancellationState | null> {
		const request = cancellationId
			? await this.repository.findRequest(threadId, cancellationId)
			: await this.repository.latest(threadId);
		if (!request) return null;
		const plan = request.planId
			? await this.planService.findPlan(threadId, request.planId, {})
			: null;
		return {
			id: request.id,
			planId: request.planId,
			status: request.status,
			requestedAt: request.cutoffAt.toISOString(),
			settledAt: request.settledAt?.toISOString() ?? null,
			failures: request.failures.map((failure) => ({
				...failure,
				title: scrubSecretsInText(failure.title),
			})),
			reportStatus: request.reportStatus,
			report: request.report,
			plan: presentPlan(plan),
			heldQueueIds: (await this.queue.listPending(threadId))
				.filter((item) => item.held)
				.map((item) => item.id),
		};
	}
}
