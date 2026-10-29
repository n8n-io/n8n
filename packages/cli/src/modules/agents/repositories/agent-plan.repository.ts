import type { AgentPlanTaskRef } from '@n8n/api-types';
import {
	BaseRepository,
	isUniqueConstraintError,
	TransactionRunner,
	type OperationContext,
} from '@n8n/db';
import { Service } from '@n8n/di';
import { DataSource, IsNull, MoreThan, type EntityManager } from '@n8n/typeorm';
import { isRecord } from '@n8n/utils/is-record';
import { UserError, type JsonObject } from 'n8n-workflow';
import { validate as isUuid } from 'uuid';

import { AgentBackgroundJob } from '../entities/agent-background-job.entity';
import { AgentExecutionThread } from '../entities/agent-execution-thread.entity';
import { AgentPlanHistory } from '../entities/agent-plan-history.entity';
import { AgentPlan } from '../entities/agent-plan.entity';
import { derivePlanGroups, planLeaves, resolveAgentPlan } from '../plans/agent-plan-state';
import {
	AgentPlanValidationError,
	parseStoredAgentPlan,
	storeAgentPlan,
	type AgentPlanDocument,
} from '../plans/agent-plan.schema';
import { getAgentPlanReadiness } from '../plans/agent-plan.validation';
import { AgentExecutionThreadRepository } from './agent-execution-thread.repository';

export type AgentPlanRecord = Pick<
	AgentPlan,
	'id' | 'threadId' | 'revision' | 'formatVersion' | 'data' | 'closedAt' | 'createdAt' | 'updatedAt'
>;

export type AgentPlanRevision = Pick<
	AgentPlanHistory,
	'planId' | 'revision' | 'formatVersion' | 'data' | 'closedAt' | 'createdAt'
>;

export type AgentPlanRevisionMetadata = Omit<AgentPlanRevision, 'planId' | 'data'>;

type PlanWrite = { threadId: string; planId: string; expectedRevision: number };
type PlanDocument = { formatVersion: number; data: JsonObject };

export class AgentPlanWriteConflictError extends UserError {
	constructor() {
		super('The plan write conflicts with the stored state');
	}
}

@Service()
export class AgentPlanRepository extends BaseRepository<AgentPlan> {
	constructor(
		dataSource: DataSource,
		transactionRunner: TransactionRunner,
		private readonly threadRepository: AgentExecutionThreadRepository,
	) {
		super(AgentPlan, dataSource.manager, transactionRunner);
	}

	async createActivePlan(
		input: PlanDocument & { id: string; threadId: string },
		ctx: OperationContext,
	): Promise<AgentPlanRecord> {
		if (!isUuid(input.id)) throw new UserError('The plan ID must be a UUID');

		this.validateVersion(input.formatVersion);
		const data = this.serializeData(input.data);

		return await this.runInTransaction(ctx, async (manager, tx) => {
			await this.threadRepository.lockById(input.threadId, tx);

			const now = new Date();

			try {
				await manager
					.createQueryBuilder()
					.insert()
					.into(AgentPlan)
					.values({
						id: input.id,
						threadId: input.threadId,
						formatVersion: input.formatVersion,
						data: () => ':planData',
						revision: 1,
						closedAt: null,
						createdAt: now,
						updatedAt: now,
					})
					.setParameter('planData', data)
					.execute();
			} catch (error) {
				if (isUniqueConstraintError(error)) throw new AgentPlanWriteConflictError();

				throw error;
			}

			const plan = await manager.findOneByOrFail(AgentPlan, {
				id: input.id,
				threadId: input.threadId,
			});
			await this.insertSnapshot(manager, plan);

			return plan;
		});
	}

	async findLatestPlan(threadId: string, ctx: OperationContext) {
		return await this.managerFor(ctx).findOne(AgentPlan, {
			where: { threadId },
			order: { createdAt: 'DESC' },
		});
	}

	async findActivePlan(threadId: string, ctx: OperationContext): Promise<AgentPlanRecord | null> {
		return await this.managerFor(ctx).findOneBy(AgentPlan, { threadId, closedAt: IsNull() });
	}

	async findPlan(
		threadId: string,
		planId: string,
		ctx: OperationContext,
	): Promise<AgentPlanRecord | null> {
		return await this.managerFor(ctx).findOneBy(AgentPlan, { id: planId, threadId });
	}

	async findRevision(
		threadId: string,
		planId: string,
		revision: number,
		ctx: OperationContext,
	): Promise<AgentPlanRevision | null> {
		return await this.managerFor(ctx).findOne(AgentPlanHistory, {
			where: { planId, revision, plan: { threadId } },
		});
	}

	async listHistory(
		threadId: string,
		planId: string,
		options: { afterRevision?: number; limit?: number },
		ctx: OperationContext,
	): Promise<{ items: AgentPlanRevisionMetadata[]; nextCursor: number | null }> {
		const limit = options.limit ?? 50;
		const afterRevision = options.afterRevision ?? 0;

		if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
			throw new UserError('The history limit must be an integer between 1 and 100');
		}
		if (!Number.isSafeInteger(afterRevision) || afterRevision < 0) {
			throw new UserError('The history cursor must be a non-negative integer');
		}

		const rows = await this.managerFor(ctx).find(AgentPlanHistory, {
			where: { planId, plan: { threadId }, revision: MoreThan(afterRevision) },
			select: {
				planId: true,
				revision: true,
				formatVersion: true,
				closedAt: true,
				createdAt: true,
			},
			order: { revision: 'ASC' },
			take: limit + 1,
		});

		const items = rows.slice(0, limit).map(({ revision, formatVersion, closedAt, createdAt }) => ({
			revision,
			formatVersion,
			closedAt,
			createdAt,
		}));

		return {
			items,
			nextCursor: rows.length > limit ? items[items.length - 1].revision : null,
		};
	}

	async replacePlan(
		input: PlanWrite & PlanDocument,
		ctx: OperationContext,
	): Promise<AgentPlanRecord> {
		this.validateVersion(input.formatVersion);
		return await this.writeRevision(input, { ...input, data: this.serializeData(input.data) }, ctx);
	}

	async closePlan(input: PlanWrite, ctx: OperationContext): Promise<AgentPlanRecord> {
		return await this.writeRevision(input, null, ctx);
	}

	private async writeRevision(
		input: PlanWrite,
		document: { formatVersion: number; data: string } | null,
		ctx: OperationContext,
	): Promise<AgentPlanRecord> {
		this.validateVersion(input.expectedRevision);

		return await this.runInTransaction(ctx, async (manager, tx) => {
			await this.threadRepository.lockById(input.threadId, tx);

			const now = new Date();
			const query = manager
				.createQueryBuilder()
				.update(AgentPlan)
				.set({
					revision: () => 'revision + 1',
					updatedAt: now,
					...(document
						? { formatVersion: document.formatVersion, data: () => ':planData' }
						: { closedAt: now }),
				})
				.where({
					id: input.planId,
					threadId: input.threadId,
					revision: input.expectedRevision,
					closedAt: IsNull(),
				});

			if (document) query.setParameter('planData', document.data);

			const result = await query.execute();

			if (result.affected !== 1) throw new AgentPlanWriteConflictError();

			const plan = await manager.findOneByOrFail(AgentPlan, {
				id: input.planId,
				threadId: input.threadId,
			});
			await this.insertSnapshot(manager, plan);

			return plan;
		});
	}

	private async insertSnapshot(manager: EntityManager, plan: AgentPlanRecord): Promise<void> {
		await manager
			.createQueryBuilder()
			.insert()
			.into(AgentPlanHistory)
			.values({
				planId: plan.id,
				revision: plan.revision,
				formatVersion: plan.formatVersion,
				data: () => ':planData',
				closedAt: plan.closedAt,
				createdAt: plan.updatedAt,
			})
			.setParameter('planData', JSON.stringify(plan.data))
			.execute();
	}

	private validateVersion(value: number): void {
		if (!Number.isInteger(value) || value < 1 || value > 2_147_483_647) {
			throw new UserError('Plan versions must be positive 32-bit integers');
		}
	}

	private serializeData(data: JsonObject): string {
		if (!isRecord(data)) throw new UserError('The plan document must be a JSON object');
		return JSON.stringify(data);
	}

	private async jobsForPlan(planId: string, ctx: OperationContext = {}) {
		return await this.managerFor(ctx).find(AgentBackgroundJob, {
			where: { planId },
			order: { createdAt: 'ASC' },
		});
	}

	async jobStatesForPlan(planId: string, ctx: OperationContext = {}) {
		return await this.managerFor(ctx).find(AgentBackgroundJob, {
			where: { planId },
			select: ['id', 'status', 'createdAt', 'settledAt', 'pauseRequestId', 'notifiedAt'],
		});
	}

	private async resolvePlan(plan: AgentPlanRecord, ctx: OperationContext = {}) {
		return resolveAgentPlan(
			parseStoredAgentPlan(plan.data, plan.formatVersion),
			await this.jobStatesForPlan(plan.id, ctx),
		);
	}

	async validateTask(
		threadId: string,
		ref: AgentPlanTaskRef | undefined,
		ctx: OperationContext = {},
		inherited = false,
	) {
		const manager = this.managerFor(ctx);
		const plan = await manager.findOneBy(
			AgentPlan,
			ref ? { id: ref.planId, closedAt: IsNull() } : { threadId, closedAt: IsNull() },
		);

		if (!ref) {
			if (plan)
				throw new AgentPlanValidationError(
					'Read the plan and pass planTask with its plan ID and leaf task ID.',
				);

			return;
		}

		let owner = threadId;

		if (inherited) {
			const visited = new Set<string>();

			// Stop on a parent cycle so the walk cannot hold the thread lock forever.
			while (owner !== plan?.threadId && !visited.has(owner)) {
				visited.add(owner);
				const thread = await manager.findOneBy(AgentExecutionThread, { id: owner });

				if (!thread?.parentThreadId) break;

				owner = thread.parentThreadId;
			}
		}

		if (!plan || plan.threadId !== owner)
			throw new AgentPlanValidationError(
				'The plan reference is stale or belongs to another conversation. Read the plan again.',
			);

		const data = await this.resolvePlan(plan, ctx);
		const task = planLeaves(data).find(
			(item) => item.kind === 'task' && item.id === ref.planTaskId,
		);

		if (!task || task.kind !== 'task' || !['pending', 'in_progress'].includes(task.status)) {
			throw new AgentPlanValidationError(
				'The plan task must be an unfinished leaf task. Resume paused tasks before continuing them.',
			);
		}

		if (plan.threadId === threadId && task.jobId)
			throw new AgentPlanValidationError(
				'This task already has a background job. Create a new task for further work.',
			);

		if (getAgentPlanReadiness(data).blocked.some((item) => item.id === task.id)) {
			throw new AgentPlanValidationError(
				'The plan task has unfinished prerequisites. Complete them first.',
			);
		}
	}

	async bindJob(threadId: string, ref: AgentPlanTaskRef, jobId: string, ctx: OperationContext) {
		const plan = await this.findPlan(threadId, ref.planId, ctx);

		// Descendants keep the link for Stop, but only the owning job supplies task status.
		if (!plan) return;

		const data = await this.resolvePlan(plan, ctx);
		const task = planLeaves(data).find((item) => item.id === ref.planTaskId);

		if (task?.kind === 'task' && task.jobId === jobId) return;

		if (!task || task.kind !== 'task' || task.jobId)
			throw new AgentPlanValidationError('This task already has a background job.');

		task.jobId = jobId;
		await this.saveDefinition(plan, data, ctx);
	}

	async pauseManualTasks(threadId: string, planId: string, ctx: OperationContext) {
		const plan = await this.findPlan(threadId, planId, ctx);

		if (!plan || plan.closedAt) return;

		const data = await this.resolvePlan(plan, ctx);
		let changed = false;

		for (const item of planLeaves(data)) {
			if (item.kind !== 'task' || item.jobId || !['pending', 'in_progress'].includes(item.status))
				continue;

			item.status = 'paused';
			item.endedAt = new Date().toISOString();
			changed = true;
		}

		if (changed) await this.saveDefinition(plan, data, ctx);

		return derivePlanGroups(data);
	}

	async selectStoppedTasks(threadId: string, planId: string, taskIds?: string[]) {
		const plan = await this.findPlan(threadId, planId, {});

		if (!plan || plan.closedAt)
			throw new AgentPlanValidationError('The plan reference is stale. Read the plan again.');

		const stop = await this.threadRepository.findTaskStop(threadId, {});

		if (stop?.planId !== planId || !stop.pause.reportedAt || !stop.pause.resumedAt)
			return { status: 'stopping' as const };

		const planJobs = await this.jobsForPlan(planId);
		const data = resolveAgentPlan(parseStoredAgentPlan(plan.data, plan.formatVersion), planJobs);
		const all = data.items.flatMap((item) =>
			item.kind === 'group' ? [item, ...item.tasks] : [item],
		);

		if (taskIds?.some((id) => !all.some((item) => item.id === id)))
			throw new AgentPlanValidationError('A selected task does not exist. Read the plan again.');

		const selected = taskIds
			? all
					.filter((item) => taskIds.includes(item.id))
					.flatMap((item) => (item.kind === 'group' ? item.tasks : [item]))
			: planLeaves(data);
		const requestedIds = [
			...new Set(
				selected
					.filter((item) => ['paused', 'cancelled', 'failed'].includes(item.status))
					.map((item) => item.id),
			),
		];

		const blocked = getAgentPlanReadiness(data).blocked.filter((item) =>
			requestedIds.includes(item.id),
		);
		const ids = requestedIds.filter((id) => !blocked.some((item) => item.id === id));
		const jobs = planJobs.filter(
			(job) => job.pauseRequestId && job.planTaskId && ids.includes(job.planTaskId),
		);

		return {
			status: 'selected' as const,
			planId,
			stopId: stop.pause.id,
			taskIds: requestedIds,
			blocked,
			jobs,
		};
	}

	async releaseStoppedTasks(threadId: string, planId: string, stopId: string, ids: string[]) {
		return await this.runInTransaction({}, async (_manager, ctx) => {
			await this.threadRepository.lockById(threadId, ctx);

			const stop = await this.threadRepository.findTaskStop(threadId, ctx);

			if (stop?.pause.id !== stopId || !stop.pause.resumedAt) return false;

			const plan = await this.findPlan(threadId, planId, ctx);

			if (!plan || plan.closedAt) return false;

			const data = await this.resolvePlan(plan, ctx);
			const blocked = new Set(getAgentPlanReadiness(data).blocked.map((item) => item.id));
			let changed = false;

			for (const item of planLeaves(data)) {
				if (
					item.kind !== 'task' ||
					item.jobId ||
					item.status !== 'paused' ||
					!ids.includes(item.id) ||
					(item.startedAt && blocked.has(item.id))
				)
					continue;

				item.status = item.startedAt ? 'in_progress' : 'pending';
				item.endedAt = null;
				changed = true;
			}

			if (changed) await this.saveDefinition(plan, data, ctx);

			return true;
		});
	}

	private async saveDefinition(
		plan: AgentPlanRecord,
		data: AgentPlanDocument,
		ctx: OperationContext,
	) {
		return await this.replacePlan(
			{
				threadId: plan.threadId,
				planId: plan.id,
				expectedRevision: plan.revision,
				formatVersion: plan.formatVersion,
				data: storeAgentPlan(data),
			},
			ctx,
		);
	}
}
