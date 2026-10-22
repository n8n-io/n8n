import { parseAgentPlan } from './plans/agent-plan.schema';
import { unfinishedPlanIds } from './plans/agent-plan-work-state';
import type { AgentTaskCancellationState, AgentTaskStopFailure } from '@n8n/api-types';
import { LockNamespace, LockService } from '@n8n/backend-common';
import { TransactionRunner } from '@n8n/db';
import { Service } from '@n8n/di';
import { ConflictError, NotFoundError } from '@n8n/errors';
import { scrubSecretsInText } from '@n8n/utils/scrub-secrets';

import { AgentChatAttachmentService } from './agent-chat-attachment.service';
import { AgentChatExecutionService } from './agent-chat-execution.service';
import { AgentExecutionUpdateBroadcaster } from './agent-execution-update-broadcaster';
import { AgentPlanService } from './agent-plan.service';
import { AgentBackgroundJobService } from './background/agent-background-job.service';
import { AgentWakeService } from './background/agent-wake.service';
import { draftChatMemoryResourceId } from './utils/agent-memory-scope';
import { v7 as uuidv7 } from 'uuid';
import { presentPlan } from './plans/agent-plan-tools';
import { AgentExecutionRepository } from './repositories/agent-execution.repository';
import { AgentMessageQueueRepository } from './repositories/agent-message-queue.repository';
import { AgentPlanRepository } from './repositories/agent-plan.repository';
import { AgentExecutionThreadRepository } from './repositories/agent-execution-thread.repository';

@Service()
export class AgentTaskCancellationService {
	constructor(
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
		private readonly attachments: AgentChatAttachmentService,
	) {}

	async request(threadId: string, planId: string | null): Promise<AgentTaskCancellationState> {
		return await this.locks.withLease(
			LockNamespace.KNOWN_LOCKS,
			`agent-task-cancellation:${threadId}`,
			async (signal) => {
				signal.throwIfAborted();
				const { thread, stop, attachmentIds } = await this.txRunner.run({}, async (ctx) => {
					const thread = await this.threads.lockById(threadId, ctx);
					if (!thread) throw new NotFoundError('Session not found');
					const plan = await this.plans.findLatestPlan(threadId, ctx);
					if ((plan?.id ?? null) !== planId)
						throw new ConflictError('The plan has changed. Refresh it and try again.');
					const previous = await this.threads.latest(threadId, ctx);
					const stop =
						previous && !previous.pause.resumedAt && previous.planId === planId
							? previous
							: await this.threads.saveStop(
									{
										threadId,
										planId,
										...(plan
											? {
													planRevision: plan.revision,
													stoppedTaskIds: unfinishedPlanIds(
														parseAgentPlan(plan.data, plan.formatVersion),
													),
												}
											: {}),
										requestedAt: new Date().toISOString(),
										generation: await this.threads.captureGeneration(threadId, ctx),
										failures: [],
										pause: { id: uuidv7() },
									},
									ctx,
								);
					signal.throwIfAborted();
					const attachmentIds =
						stop !== previous ? await this.queue.discardPending(threadId, ctx) : [];
					return { thread, stop, attachmentIds };
				});
				await this.attachments.deleteByIds(attachmentIds);
				signal.throwIfAborted();
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
						const cancelled = await this.chatExecutions.requestCancel({
							projectId: thread.projectId,
							agentId: thread.agentId,
							threadId,
							executionId: execution.id,
							userId: thread.ownerId,
							scope: 'foreground',
							surface: 'preview',
						});
						if (!cancelled) failures.push({ jobId: execution.id, title: 'Current response' });
					} catch {
						failures.push({ jobId: execution.id, title: 'Current response' });
					}
				}
				const jobs = await this.threads.targetedJobs(stop);
				const scopes = new Map(
					jobs.map((job) => [
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
					signal.throwIfAborted();
					try {
						await this.jobs.requestPause(
							scope.agentId,
							parentThreadId,
							scope.resourceId,
							stop.pause.id,
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
				signal.throwIfAborted();
				await this.txRunner.run({}, async (ctx) => {
					await this.threads.lockById(threadId, ctx);
					const jobs = await this.threads.targetedJobs(stop, ctx);
					const latest = await this.threads.latest(threadId, ctx);
					if (!latest || latest.pause.id !== stop.pause.id) return;
					latest.failures = failures.filter((failure) => {
						const job = jobs.find((item) => item.id === failure.jobId);
						return !job || ['running', 'suspended'].includes(job.status);
					});
					signal.throwIfAborted();
					await this.threads.saveStop(latest, ctx);
				});
				this.updates.notifyBackgroundJobsUpdated(thread.agentId, threadId);
				await this.wake.requestWake(threadId);
				return (await this.state(threadId))!;
			},
		);
	}

	async state(threadId: string): Promise<AgentTaskCancellationState | null> {
		const stop = await this.threads.latest(threadId);
		if (!stop) return null;
		const plan = stop.planId ? await this.planService.findPlan(threadId, stop.planId, {}) : null;
		const jobs = await this.threads.targetedJobs(stop);
		const outstanding = new Map(
			(await this.threads.unfinishedWork(stop)).map((failure) => [
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
						.filter((job) => !job.pauseRequestId && ['running', 'suspended'].includes(job.status))
						.map((job) => ({ jobId: job.id, title: job.title })),
				].map((failure) => [failure.jobId, failure]),
			).values(),
		].filter((failure) => outstanding.has(failure.jobId));
		return {
			planId: stop.planId,
			requestedAt: stop.requestedAt,
			status: stop.pause.resumedAt
				? 'resumed'
				: failures.length
					? 'failed'
					: outstanding.size
						? 'stopping'
						: 'stopped',
			reportFailed: stop.pause.reportFailed,
			failures: failures.map((failure) => outstanding.get(failure.jobId)!),
			plan: plan ? presentPlan(plan) : null,
		};
	}
}
