import { BaseRepository, TransactionRunner, type OperationContext } from '@n8n/db';
import { Service } from '@n8n/di';
import { DataSource, In, IsNull, Not } from '@n8n/typeorm';
import { UserError } from 'n8n-workflow';

import { AgentTaskCancellation } from '../entities/agent-task-cancellation.entity';
import { AgentExecution } from '../entities/agent-execution.entity';
import { AgentExecutionThread } from '../entities/agent-execution-thread.entity';
import { AgentBackgroundJob } from '../entities/agent-background-job.entity';
import { AgentCheckpoint } from '../entities/agent-checkpoint.entity';
import { AgentExecutionThreadRepository } from './agent-execution-thread.repository';

@Service()
export class AgentTaskCancellationRepository extends BaseRepository<AgentTaskCancellation> {
	constructor(
		dataSource: DataSource,
		transactionRunner: TransactionRunner,
		private readonly threads: AgentExecutionThreadRepository,
	) {
		super(AgentTaskCancellation, dataSource.manager, transactionRunner);
	}

	async latest(threadId: string, ctx: OperationContext = {}) {
		return await this.managerFor(ctx).findOne(AgentTaskCancellation, {
			where: { threadId },
			order: { createdAt: 'DESC', id: 'DESC' },
		});
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

	async findRequest(threadId: string, id: string, ctx: OperationContext = {}) {
		return await this.managerFor(ctx).findOneBy(AgentTaskCancellation, { threadId, id });
	}

	async saveRequest(request: AgentTaskCancellation, ctx: OperationContext) {
		return await this.managerFor(ctx).save(AgentTaskCancellation, request);
	}

	async insertRequest(request: AgentTaskCancellation, ctx: OperationContext) {
		await this.managerFor(ctx).insert(AgentTaskCancellation, {
			id: request.id,
			threadId: request.threadId,
			planId: request.planId,
			status: request.status,
			generation: request.generation,
			cutoffAt: request.cutoffAt,
			settledAt: request.settledAt,
			failures: request.failures,
			reportStatus: request.reportStatus,
			report: request.report,
		});
	}

	async pendingThreads() {
		const requests = await this.find({
			where: [{ status: 'stopping' }, { status: 'stopped', reportStatus: 'pending' }],
		});
		return [...new Set(requests.map((request) => request.threadId))];
	}

	async blocksQueue(threadId: string, ctx: OperationContext) {
		const request = await this.latest(threadId, ctx);
		return !!request && (request.status !== 'stopped' || request.reportStatus === 'pending');
	}

	async claimReport(id: string) {
		const result = await this.update(
			{ id, status: 'stopped', reportStatus: 'pending' },
			{
				reportStatus: 'claimed',
			},
		);
		return result.affected === 1;
	}

	async finishReport(id: string, succeeded: boolean) {
		await this.update(
			{ id, reportStatus: 'claimed' },
			{ reportStatus: succeeded ? 'reported' : 'failed' },
		);
	}

	/** Lock ancestors first so dispatch and cancellation use the same admission boundary. */
	async lockScope(threadId: string, ctx: OperationContext) {
		const lineage = await this.lineage(threadId, ctx);
		for (const thread of lineage.toReversed()) await this.threads.lockById(thread.id, ctx);
	}

	async assertWakeAdmission(
		threadId: string,
		wake: { jobIds: string[]; cancellationId?: string },
		ctx: OperationContext,
	) {
		if (await this.isCancelled(threadId, undefined, ctx))
			throw new UserError('These background tasks were canceled');
		const request = await this.latest(threadId, ctx);
		if (!request) return;
		if (
			wake.cancellationId === request.id &&
			request.status === 'stopped' &&
			request.reportStatus === 'claimed'
		)
			return;
		const targeted = new Set((await this.targetedJobs(request, ctx)).map((job) => job.id));
		if (wake.cancellationId || !wake.jobIds.length || wake.jobIds.some((id) => targeted.has(id))) {
			throw new UserError('These background tasks were canceled');
		}
	}

	async assertAdmission(threadId: string, executionId: string | undefined, ctx: OperationContext) {
		if (await this.isCancelled(threadId, executionId, ctx)) {
			throw new UserError('These tasks were canceled. Wait for a new user request.');
		}
	}

	async isCancelled(threadId: string, executionId?: string, ctx: OperationContext = {}) {
		const manager = this.managerFor(ctx);
		const lineage = await this.lineage(threadId, ctx);
		for (const thread of lineage) {
			const request = await this.latest(thread.id, ctx);
			if (!request) continue;
			if (request.status !== 'stopped') return true;
			if (thread.id !== threadId) {
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

	async targetedJobs(request: AgentTaskCancellation, ctx: OperationContext = {}) {
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
					threadId === request.threadId && request.status === 'stopped'
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
					...(threadId === request.threadId && request.status === 'stopped'
						? { id: In(request.generation.threadIds) }
						: {}),
				},
			});
			pending.push(...delegated.map((thread) => thread.id));
		}
		return jobs;
	}

	async reopenForLateDispatch(threadId: string, ctx: OperationContext) {
		for (const thread of await this.lineage(threadId, ctx)) {
			const request = await this.latest(thread.id, ctx);
			if (request) {
				request.status = 'stopping';
				request.settledAt = null;
				await this.saveRequest(request, ctx);
				return;
			}
		}
	}

	async hasNewWork(request: AgentTaskCancellation, ctx: OperationContext) {
		const scope = {
			parentThreadId: request.threadId,
			status: In(['running', 'suspended', 'paused']),
			id: Not(In(request.generation.jobIds)),
		};
		return await this.managerFor(ctx).existsBy(AgentBackgroundJob, [
			{ ...scope, sourceExecutionId: IsNull() },
			{ ...scope, sourceExecutionId: Not(In(request.generation.executionIds)) },
		]);
	}

	async targetedDescendants(request: AgentTaskCancellation, ctx: OperationContext = {}) {
		const jobs = await this.targetedJobs(request, ctx);
		const threads = [
			request.threadId,
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

	async hasRunningWork(request: AgentTaskCancellation, ctx: OperationContext) {
		const threads = (await this.targetedDescendants(request, ctx)).map((thread) => thread.id);
		if (
			await this.managerFor(ctx).existsBy(AgentCheckpoint, {
				threadId: In(threads),
				state: Not(IsNull()),
				expired: false,
			})
		)
			return true;
		return await this.managerFor(ctx).existsBy(AgentExecution, [
			{ threadId: request.threadId, id: In(request.generation.executionIds), status: 'running' },
			{ threadId: In(threads), status: 'running' },
		]);
	}

	async consumeTargetedMail(ids: string[], ctx: OperationContext) {
		if (!ids.length) return;
		await this.managerFor(ctx).update(
			AgentBackgroundJob,
			{ id: In(ids), status: In(['completed', 'failed', 'cancelled']) },
			{ notifiedAt: new Date() },
		);
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
