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

import { AgentPlanHistory } from '../entities/agent-plan-history.entity';
import { AgentPlan } from '../entities/agent-plan.entity';

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
	constructor(dataSource: DataSource, transactionRunner: TransactionRunner) {
		super(AgentPlan, dataSource.manager, transactionRunner);
	}

	async createActivePlan(
		input: PlanDocument & { id: string; threadId: string },
		ctx: OperationContext,
	): Promise<AgentPlanRecord> {
		if (!isUuid(input.id)) throw new UserError('The plan ID must be a UUID');
		this.validateVersion(input.formatVersion);
		const data = this.serializeData(input.data);

		return await this.runInTransaction(ctx, async (manager) => {
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
		return await this.runInTransaction(ctx, async (manager) => {
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
}
