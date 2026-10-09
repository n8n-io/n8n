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
import { AgentWakeService } from './background/agent-wake.service';
import { draftChatMemoryResourceId } from './utils/agent-memory-scope';
import { v7 as uuidv7 } from 'uuid';
import { parseAgentPlan } from './plans/agent-plan.schema';
import { presentPlan } from './plans/agent-plan-tools';
import { AgentExecutionRepository } from './repositories/agent-execution.repository';
import { AgentExecutionThreadRepository } from './repositories/agent-execution-thread.repository';
import { AgentMessageQueueRepository } from './repositories/agent-message-queue.repository';
import { AgentPlanRepository } from './repositories/agent-plan.repository';
import { AgentTaskCancellationRepository } from './repositories/agent-task-cancellation.repository';

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
		private readonly wake: AgentWakeService,
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
					const previous = await this.repository.latest(threadId, ctx);
					const stop =
						previous?.pause && !previous.pause.resumedAt && previous.planId === planId
							? previous
							: await this.repository.saveStop(
									{
										threadId,
										planId,
										requestedAt: new Date().toISOString(),
										generation: await this.repository.captureGeneration(threadId, ctx),
										failures: [],
										pause: { id: uuidv7() },
									},
									ctx,
								);
					if (stop !== previous) await this.queue.discardPending(threadId, ctx);
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
							surface: 'preview',
						});
					} catch {
						failures.push({ jobId: execution.id, title: 'Current response' });
					}
				}
				const jobs = await this.repository.targetedJobs(stop);
				const scopes = new Map(
					jobs
						.filter((job) => job.detached)
						.map((job) => [
							job.parentThreadId,
							{
								agentId: job.parentAgentId,
								resourceId: job.parentResourceId,
							},
						]),
				);
				if (thread.ownerId)
					scopes.set(threadId, {
						agentId: thread.agentId,
						resourceId: draftChatMemoryResourceId(thread.ownerId),
					});
				for (const [parentThreadId, scope] of scopes) {
					try {
						await this.jobs.requestPause(
							scope.agentId,
							parentThreadId,
							scope.resourceId,
							stop.pause?.id,
						);
					} catch {
						failures.push(
							...jobs
								.filter(
									(job) =>
										job.parentThreadId === parentThreadId &&
										['running', 'suspended'].includes(job.status),
								)
								.map((job) => ({ jobId: job.id, title: job.title })),
						);
					}
				}
				await this.txRunner.run({}, async (ctx) => {
					await this.threads.lockById(threadId, ctx);
					const jobs = await this.repository.targetedJobs(stop, ctx);
					const latest = await this.repository.latest(threadId, ctx);
					if (!latest || latest.pause?.id !== stop.pause?.id) return;
					latest.failures = failures.filter((failure) => {
						const job = jobs.find((item) => item.id === failure.jobId);
						return !job || ['running', 'suspended'].includes(job.status);
					});
					await this.repository.saveStop(latest, ctx);
				});
				this.updates.notifyBackgroundJobsUpdated(thread.agentId, threadId);
				await this.wake.requestWake(threadId);
				return (await this.state(threadId))!;
			},
		);
	}

	async state(threadId: string): Promise<AgentTaskCancellationState | null> {
		const stop = await this.repository.latest(threadId);
		if (!stop) return null;
		const plan = stop.planId ? await this.planService.findPlan(threadId, stop.planId, {}) : null;
		const jobs = await this.repository.targetedJobs(stop);
		const outstanding = new Map(
			(await this.repository.unfinishedWork(stop)).map((failure) => [
				failure.jobId,
				{ ...failure, title: scrubSecretsInText(failure.title) },
			]),
		);
		// A stopped server can leave jobs outside the saved pause group. Keep Retry available.
		const failures = [
			...new Map(
				[
					...stop.failures,
					...jobs
						.filter(
							(job) =>
								stop.pause &&
								job.detached &&
								!job.pauseRequestId &&
								['running', 'suspended'].includes(job.status),
						)
						.map((job) => ({ jobId: job.id, title: job.title })),
				].map((failure) => [failure.jobId, failure]),
			).values(),
		].filter((failure) => outstanding.has(failure.jobId));
		const data = plan ? parseAgentPlan(plan.data, plan.formatVersion) : null;
		const tasks = data?.items.flatMap((item) => (item.kind === 'group' ? item.tasks : [item]));
		return {
			planId: stop.planId,
			requestedAt: stop.requestedAt,
			status: stop.pause?.resumedAt
				? 'resumed'
				: failures.length
					? 'failed'
					: outstanding.size
						? 'stopping'
						: 'stopped',
			reportFailed: stop.pause?.reportFailed,
			failures: failures.map((failure) => outstanding.get(failure.jobId)!),
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
