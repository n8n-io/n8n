import type { AgentTaskCancellationState, AgentTaskStopFailure } from '@n8n/api-types';
import { LockNamespace, LockService } from '@n8n/backend-common';
import { TransactionRunner } from '@n8n/db';
import { Service } from '@n8n/di';
import { ConflictError, NotFoundError } from '@n8n/errors';
import { scrubSecretsInText } from '@n8n/utils/scrub-secrets';

import { AgentChatExecutionService } from './agent-chat-execution.service';
import { AgentExecutionUpdateBroadcaster } from './agent-execution-update-broadcaster';
import { AgentPlanService } from './agent-plan.service';
import { AgentBackgroundJobService } from './background/agent-background-job.service';
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

	async request(threadId: string, planId: string | null): Promise<AgentTaskCancellationState> {
		return await this.locks.withLease(
			LockNamespace.KNOWN_LOCKS,
			`agent-task-cancellation:${threadId}`,
			async () => {
				const { thread, stop } = await this.txRunner.run({}, async (ctx) => {
					const thread = await this.threads.lockById(threadId, ctx);
					if (!thread) throw new NotFoundError('Session not found');
					const plan = await this.plans.findLatestPlan(threadId, ctx);
					if ((plan?.id ?? null) !== planId)
						throw new ConflictError('The plan has changed. Refresh it and try again.');
					const stop = await this.repository.saveStop(
						{
							threadId,
							planId,
							requestedAt: new Date().toISOString(),
							generation: await this.repository.captureGeneration(threadId, ctx),
							failures: [],
						},
						ctx,
					);
					await this.queue.holdPending(threadId, ctx);
					if (plan && !plan.closedAt) {
						const data = parseAgentPlan(plan.data, plan.formatVersion);
						await this.plans.cancelPlan(
							{
								threadId,
								planId: plan.id,
								expectedRevision: plan.revision,
								formatVersion: plan.formatVersion,
								data: { ...data, items: cancelPlanItems(data.items, stop.requestedAt) },
							},
							ctx,
						);
					}
					return { thread, stop };
				});
				this.updates.notifyQueueUpdated(threadId);
				const failures: AgentTaskStopFailure[] = [];
				const execution = await this.executions.findLatestByThreadId(threadId);
				if (
					thread.ownerId &&
					execution &&
					stop.generation.executionIds.includes(execution.id) &&
					(execution.status === 'running' || execution.hitlStatus === 'suspended')
				) {
					try {
						await this.chatExecutions.requestCancel({
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
				// A repeated Stop targets the current work, including earlier interrupted stops.
				for (const job of (await this.repository.targetedJobs(stop)).toReversed()) {
					if (!active(job.status) && job.status !== 'cancelled') continue;
					try {
						await this.jobs.cancelPermanently(job.parentThreadId, job.id);
					} catch {
						failures.push({ jobId: job.id, title: job.title });
					}
				}
				for (const child of await this.repository.targetedDescendants(stop)) {
					try {
						await this.checkpoints.deleteDelegatedForThread(child.agentId, child.id);
					} catch {
						failures.push({ jobId: child.id, title: child.agentName });
					}
				}
				await this.txRunner.run({}, async (ctx) => {
					await this.threads.lockById(threadId, ctx);
					const jobs = await this.repository.targetedJobs(stop, ctx);
					stop.failures = failures.filter((failure) => {
						const job = jobs.find((item) => item.id === failure.jobId);
						return job?.status !== 'completed' && job?.status !== 'failed';
					});
					await this.repository.saveStop(stop, ctx);
					await this.repository.consumeTargetedMail(
						jobs.map((job) => job.id),
						ctx,
					);
				});
				this.updates.notifyBackgroundJobsUpdated(thread.agentId, threadId);
				return (await this.state(threadId))!;
			},
		);
	}

	async state(threadId: string): Promise<AgentTaskCancellationState | null> {
		const stop = await this.repository.latest(threadId);
		if (!stop) return null;
		const plan = stop.planId ? await this.planService.findPlan(threadId, stop.planId, {}) : null;
		const jobs = await this.repository.targetedJobs(stop);
		const failures = new Map(
			(await this.repository.unfinishedWork(stop)).map((failure) => [
				failure.jobId,
				{ ...failure, title: scrubSecretsInText(failure.title) },
			]),
		);
		const data = plan ? parseAgentPlan(plan.data, plan.formatVersion) : null;
		const tasks = data?.items.flatMap((item) => (item.kind === 'group' ? item.tasks : [item]));
		return {
			planId: stop.planId,
			requestedAt: stop.requestedAt,
			status: failures.size ? 'failed' : 'stopped',
			failures: [...failures.values()],
			summary: {
				completed: tasks
					? tasks.filter((task) => task.status === 'done').length
					: jobs.filter((job) => job.status === 'completed').length,
				canceled: tasks
					? tasks.filter((task) => task.status === 'cancelled').length
					: jobs.filter((job) => job.status === 'cancelled').length,
			},
			plan: plan ? presentPlan(plan) : null,
			heldQueueIds: (await this.queue.listPending(threadId))
				.filter((item) => item.held)
				.map((item) => item.id),
		};
	}
}
