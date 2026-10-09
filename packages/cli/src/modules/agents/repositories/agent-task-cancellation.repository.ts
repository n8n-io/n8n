import type { SerializableAgentState } from '@n8n/agents';
import { AgentsConfig } from '@n8n/config';
import { Time } from '@n8n/constants';
import { BaseRepository, TransactionRunner, type OperationContext } from '@n8n/db';
import { Service } from '@n8n/di';
import { DataSource, In, IsNull, MoreThanOrEqual, Not } from '@n8n/typeorm';
import { jsonParse, UserError } from 'n8n-workflow';

import { checkpointExecutionId } from '../types/agent-queued-message';
import type { AgentTaskStop } from '../types/agent-task-stop';
import { AgentExecution } from '../entities/agent-execution.entity';
import { AgentExecutionThread } from '../entities/agent-execution-thread.entity';
import { AgentBackgroundJob } from '../entities/agent-background-job.entity';
import { AgentPlan } from '../entities/agent-plan.entity';
import { AgentCheckpoint } from '../entities/agent-checkpoint.entity';
import { AgentExecutionThreadRepository } from './agent-execution-thread.repository';

type TaskStopScope = AgentTaskStop & { threadId: string };

@Service()
export class AgentTaskCancellationRepository extends BaseRepository<AgentExecutionThread> {
	constructor(
		dataSource: DataSource,
		transactionRunner: TransactionRunner,
		private readonly threads: AgentExecutionThreadRepository,
		private readonly agentsConfig: AgentsConfig,
	) {
		super(AgentExecutionThread, dataSource.manager, transactionRunner);
	}

	async latest(threadId: string, ctx: OperationContext = {}): Promise<TaskStopScope | null> {
		const thread = await this.managerFor(ctx).findOneBy(AgentExecutionThread, { id: threadId });
		return thread?.taskStop ? { ...thread.taskStop, threadId } : null;
	}

	async saveStop(stop: TaskStopScope, ctx: OperationContext) {
		const { threadId, ...taskStop } = stop;
		await this.managerFor(ctx).update(AgentExecutionThread, { id: threadId }, { taskStop });
		return stop;
	}

	async captureGeneration(threadId: string, ctx: OperationContext) {
		const manager = this.managerFor(ctx);
		const [executions, jobs, children] = await Promise.all([
			manager.find(AgentExecution, {
				where: { threadId },
				select: ['id'],
			}),
			manager.find(AgentBackgroundJob, {
				where: { parentThreadId: threadId },
				select: ['id', 'sourceExecutionId', 'childThreadId'],
			}),
			manager.find(AgentExecutionThread, { where: { parentThreadId: threadId }, select: ['id'] }),
		]);
		return {
			executionIds: [
				...new Set([
					...executions.map((execution) => execution.id),
					...jobs.flatMap((job) => (job.sourceExecutionId ? [job.sourceExecutionId] : [])),
				]),
			],
			jobIds: jobs.map((job) => job.id),
			threadIds: [
				...new Set([
					...children.map((child) => child.id),
					...jobs.flatMap((job) => (job.childThreadId ? [job.childThreadId] : [])),
				]),
			],
		};
	}

	async blocksQueue(threadId: string, ctx: OperationContext) {
		const stop = await this.latest(threadId, ctx);
		if (stop?.pause) return !stop.pause.reportedAt;
		return !!stop && (await this.unfinishedWork(stop, ctx)).length > 0;
	}

	/** Lock ancestors first so dispatch and cancellation use the same admission boundary. */
	async lockScope(threadId: string, ctx: OperationContext) {
		const lineage = await this.lineage(threadId, ctx);
		for (const thread of lineage.toReversed()) await this.threads.lockById(thread.id, ctx);
	}

	async assertWakeAdmission(
		threadId: string,
		wake: { jobIds: string[]; planStopId?: string },
		ctx: OperationContext,
	) {
		const pause = await this.latest(threadId, ctx);
		if (wake.planStopId) {
			if (
				!pause?.pause ||
				pause.pause.id !== wake.planStopId ||
				pause.pause.reportExecutionId ||
				pause.pause.reportedAt ||
				pause.pause.resumedAt ||
				(await this.unfinishedWork(pause, ctx)).length
			) {
				throw new UserError('This plan stop report is no longer available');
			}
			return;
		}
		if (pause?.pause) {
			if (pause.pause.resumedAt) return;
			throw new UserError('The plan is stopped. Wait for a new user request.');
		}
		if (
			(await this.isCancelled(threadId, undefined, ctx)) ||
			(await this.hasPausedAncestor(threadId, ctx))
		)
			throw new UserError('These background tasks were canceled');
		const request = await this.latest(threadId, ctx);
		if (!request) return;

		const targeted = new Set((await this.targetedJobs(request, ctx)).map((job) => job.id));
		if (!wake.jobIds.length || wake.jobIds.some((id) => targeted.has(id))) {
			throw new UserError('These background tasks were canceled');
		}
	}

	async assertAdmission(threadId: string, executionId: string | undefined, ctx: OperationContext) {
		if (
			(await this.isCancelled(threadId, executionId, ctx)) ||
			(await this.hasPausedAncestor(threadId, ctx))
		) {
			throw new UserError('These tasks were canceled. Wait for a new user request.');
		}
	}

	async isCancelled(threadId: string, executionId?: string, ctx: OperationContext = {}) {
		const manager = this.managerFor(ctx);
		const lineage = await this.lineage(threadId, ctx);
		for (const thread of lineage) {
			const request = await this.latest(thread.id, ctx);
			if (!request) continue;
			if (thread.id !== threadId) {
				if (request.pause) continue;
				const child = lineage[lineage.indexOf(thread) - 1];
				const job = await manager.findOneBy(AgentBackgroundJob, { childThreadId: child.id });
				if (
					request.generation.threadIds.includes(child.id) ||
					(job && request.generation.jobIds.includes(job.id)) ||
					(job?.sourceExecutionId &&
						request.generation.executionIds.includes(job.sourceExecutionId))
				)
					return true;
				continue;
			}
			const execution = executionId
				? await manager.findOneBy(AgentExecution, { id: executionId, threadId })
				: await manager.findOne(AgentExecution, {
						where: { threadId, status: 'running' },
						order: { createdAt: 'DESC' },
					});
			if (execution && request.generation.executionIds.includes(execution.id)) return true;
		}
		return false;
	}

	async targetedJobs(request: TaskStopScope, ctx: OperationContext = {}) {
		const manager = this.managerFor(ctx);
		const jobs: AgentBackgroundJob[] = [];
		const visited = new Set<string>();
		const pending = [request.threadId, ...request.generation.threadIds];
		while (pending.length) {
			const threadId = pending.shift()!;
			if (visited.has(threadId)) continue;
			visited.add(threadId);
			const children = await manager.find(AgentBackgroundJob, {
				where:
					threadId === request.threadId
						? [
								{ parentThreadId: threadId, id: In(request.generation.jobIds) },
								{
									parentThreadId: threadId,
									sourceExecutionId: In(request.generation.executionIds),
								},
							]
						: { parentThreadId: threadId },
			});
			jobs.push(...children);
			pending.push(...children.flatMap((job) => (job.childThreadId ? [job.childThreadId] : [])));
			const delegated = await manager.find(AgentExecutionThread, {
				where: {
					parentThreadId: threadId,
					...(threadId === request.threadId ? { id: In(request.generation.threadIds) } : {}),
				},
			});
			pending.push(...delegated.map((thread) => thread.id));
		}
		return jobs;
	}

	async targetedDescendants(request: TaskStopScope, ctx: OperationContext = {}) {
		const jobs = await this.targetedJobs(request, ctx);
		const threads = [
			...request.generation.threadIds,
			...jobs.flatMap((job) => (job.childThreadId ? [job.childThreadId] : [])),
		];
		const seen = new Set(threads);
		let parents = [...threads];
		while (parents.length) {
			const descendants = await this.managerFor(ctx).find(AgentExecutionThread, {
				where: { parentThreadId: In(parents) },
			});
			parents = descendants.filter((thread) => !seen.has(thread.id)).map((thread) => thread.id);
			for (const id of parents) seen.add(id);
		}
		return await this.managerFor(ctx).findBy(AgentExecutionThread, {
			id: In([...seen].filter((id) => id !== request.threadId)),
		});
	}

	async unfinishedWork(request: TaskStopScope, ctx: OperationContext = {}) {
		const manager = this.managerFor(ctx);
		const children = await this.targetedDescendants(request, ctx);
		const childIds = children.map((thread) => thread.id);
		const executions = await manager.find(AgentExecution, {
			where: [
				{ threadId: request.threadId, id: In(request.generation.executionIds), status: 'running' },
				{ threadId: In(childIds), status: 'running' },
			],
		});
		const checkpoints = await manager.find(AgentCheckpoint, {
			where: {
				threadId: In(request.pause ? [request.threadId] : [request.threadId, ...childIds]),
				state: Not(IsNull()),
				expired: false,
				updatedAt: MoreThanOrEqual(
					new Date(
						Date.now() - this.agentsConfig.checkpointTtlSeconds * Time.seconds.toMilliseconds,
					),
				),
			},
		});
		const jobs = await this.targetedJobs(request, ctx);
		return [
			...request.failures.filter((failure) => {
				const job = jobs.find((item) => item.id === failure.jobId);
				return request.pause
					? jobs.some(
							(item) => item.id === failure.jobId && ['running', 'suspended'].includes(item.status),
						) ||
							executions.some((item) => item.id === failure.jobId) ||
							checkpoints.some((checkpoint) => {
								const state = jsonParse<SerializableAgentState | null>(checkpoint.state ?? '', {
									fallbackValue: null,
								});
								return (
									state?.status === 'suspended' && checkpointExecutionId(state) === failure.jobId
								);
							})
					: job?.status !== 'completed' && job?.status !== 'failed';
			}),
			...jobs
				.filter((job) =>
					(request.pause ? ['running', 'suspended'] : ['running', 'suspended', 'paused']).includes(
						job.status,
					),
				)
				.map((job) => ({ jobId: job.id, title: job.title })),
			...executions.map((execution) => ({
				jobId: execution.id,
				title:
					children.find((child) => child.id === execution.threadId)?.agentName ??
					'Current response',
			})),
			...checkpoints
				.filter((checkpoint) => {
					if (checkpoint.threadId !== request.threadId) return true;
					const state = jsonParse<SerializableAgentState | null>(checkpoint.state ?? '', {
						fallbackValue: null,
					});
					if (state?.status !== 'suspended') return false;
					const executionId = checkpointExecutionId(state);
					return !executionId || request.generation.executionIds.includes(executionId);
				})
				.flatMap((checkpoint) =>
					checkpoint.threadId
						? [
								{
									jobId: checkpoint.threadId,
									title:
										children.find((child) => child.id === checkpoint.threadId)?.agentName ??
										'Current response',
								},
							]
						: [],
				),
		];
	}

	async consumeTargetedMail(ids: string[], ctx: OperationContext) {
		if (!ids.length) return;
		await this.managerFor(ctx).update(
			AgentBackgroundJob,
			{ id: In(ids), status: In(['completed', 'failed', 'cancelled']) },
			{ notifiedAt: new Date() },
		);
	}

	async pausedScope(threadId: string, ctx: OperationContext = {}) {
		const thread = (await this.lineage(threadId, ctx)).find(
			(item) => item.taskStop?.pause && !item.taskStop.pause.resumedAt,
		);
		return thread?.taskStop ? { ...thread.taskStop, threadId: thread.id } : null;
	}

	async hasPausedAncestor(threadId: string, ctx: OperationContext) {
		return Boolean(await this.pausedScope(threadId, ctx));
	}

	async recordAdmission(
		threadId: string,
		executionId: string,
		input: {
			planStopId?: string;
			userInitiated: boolean;
		},
		ctx: OperationContext,
	) {
		const stop = await this.latest(threadId, ctx);
		if (!stop?.pause) return;
		if (input.planStopId) {
			stop.pause.reportExecutionId = executionId;
		} else if (input.userInitiated && !stop.pause.resumedAt) {
			if (!stop.pause.reportedAt) throw new UserError('The plan is still stopping');
			stop.pause.resumedAt = new Date().toISOString();
		} else return;
		await this.saveStop(stop, ctx);
	}

	async pendingPauseReports() {
		const threads = await this.find({ where: { taskStop: Not(IsNull()) } });
		return threads
			.filter((thread) => thread.taskStop?.pause && !thread.taskStop.pause.reportedAt)
			.map((thread) => thread.id);
	}

	async pauseReportPlan(stop: TaskStopScope) {
		return stop.planId
			? await this.managerFor({}).findOneBy(AgentPlan, {
					threadId: stop.threadId,
					id: stop.planId,
				})
			: null;
	}

	async pauseReportTarget(threadId: string) {
		return await this.findOneBy({ id: threadId });
	}

	async finishPauseReport(threadId: string, stopId: string, failed = false) {
		return await this.runInTransaction({}, async (manager, ctx) => {
			await this.threads.lockById(threadId, ctx);
			const stop = await this.latest(threadId, ctx);
			if (!stop?.pause || stop.pause.id !== stopId || stop.pause.reportedAt) return;
			const execution = stop.pause.reportExecutionId
				? await manager.findOneBy(AgentExecution, { id: stop.pause.reportExecutionId })
				: null;
			if (execution?.status === 'running' || (!execution && !failed)) return;
			stop.pause.reportedAt = new Date().toISOString();
			stop.pause.reportFailed =
				failed || !execution || execution.status === 'error' || execution.status === 'interrupted';
			// Composer Stop also consumes this report. It must not trigger another reply.
			await this.saveStop(stop, ctx);
			const jobs = await this.targetedJobs(stop, ctx);
			if (jobs.length)
				await manager.update(
					AgentBackgroundJob,
					{
						id: In(jobs.map((job) => job.id)),
						status: In(['paused', 'completed', 'failed', 'cancelled']),
					},
					{ notifiedAt: new Date(stop.pause.reportedAt) },
				);
		});
	}

	private async lineage(threadId: string, ctx: OperationContext) {
		const threads: AgentExecutionThread[] = [];
		const visited = new Set<string>();
		let id: string | null = threadId;
		while (id && !visited.has(id)) {
			visited.add(id);
			const thread: AgentExecutionThread | null = await this.managerFor(ctx).findOneBy(
				AgentExecutionThread,
				{ id },
			);
			if (!thread) break;
			threads.push(thread);
			id = thread.parentThreadId;
		}
		return threads;
	}
}
