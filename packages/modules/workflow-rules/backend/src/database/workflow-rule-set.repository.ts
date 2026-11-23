import { BaseRepository, type OperationContext, TransactionRunner } from '@n8n/db';
import { Service } from '@n8n/di';
import { DataSource, IsNull } from '@n8n/typeorm';
import type { RuleSet } from '@n8n/workflow-rules';

import { WorkflowRuleSetEntity } from './workflow-rule-set.entity';

class WorkflowRuleSetTable extends BaseRepository<WorkflowRuleSetEntity> {
	constructor(dataSource: DataSource, transactionRunner: TransactionRunner) {
		super(WorkflowRuleSetEntity, dataSource.manager, transactionRunner);
	}
}

export interface RuleSetFingerprint {
	readonly count: number;
	readonly versionSum: number;
}

@Service()
export class WorkflowRuleSetRepository {
	private readonly table: WorkflowRuleSetTable;

	constructor(dataSource: DataSource, transactionRunner: TransactionRunner) {
		this.table = new WorkflowRuleSetTable(dataSource, transactionRunner);
	}

	async findAll(ctx: OperationContext): Promise<WorkflowRuleSetEntity[]> {
		return await this.table.managerFor(ctx).find(WorkflowRuleSetEntity, { order: { id: 'ASC' } });
	}

	/** `projectId: null` reads the instance rule set. */
	async findForScope(
		projectId: string | null,
		ctx: OperationContext,
	): Promise<WorkflowRuleSetEntity | null> {
		return await this.table.managerFor(ctx).findOneBy(WorkflowRuleSetEntity, {
			projectId: projectId ?? IsNull(),
		});
	}

	/**
	 * Writes the rule set only when the stored version still equals `expectedVersion`
	 * (0 = no row yet). Returns the new row, or `null` when another write came first.
	 */
	async saveIfVersionMatches(
		projectId: string | null,
		config: RuleSet,
		expectedVersion: number,
		updatedById: string | null,
		ctx: OperationContext,
	): Promise<WorkflowRuleSetEntity | null> {
		return await this.table.runInTransaction(ctx, async (manager) => {
			const existing = await manager.findOneBy(WorkflowRuleSetEntity, {
				projectId: projectId ?? IsNull(),
			});
			const currentVersion = existing?.version ?? 0;
			if (currentVersion !== expectedVersion) return null;

			if (!existing) {
				const row = new WorkflowRuleSetEntity();
				row.scope = projectId === null ? 'instance' : 'project';
				row.projectId = projectId;
				row.config = config;
				row.version = 1;
				row.updatedById = updatedById;
				return await manager.save(row);
			}

			const result = await manager.update(
				WorkflowRuleSetEntity,
				{ id: existing.id, version: expectedVersion },
				{ config, version: expectedVersion + 1, updatedById },
			);
			if (!result.affected) return null;
			return await manager.findOneByOrFail(WorkflowRuleSetEntity, { id: existing.id });
		});
	}

	async readFingerprint(ctx: OperationContext): Promise<RuleSetFingerprint> {
		const row = await this.table
			.managerFor(ctx)
			.createQueryBuilder(WorkflowRuleSetEntity, 'ruleSet')
			.select('COUNT(*)', 'count')
			.addSelect('COALESCE(SUM(ruleSet.version), 0)', 'versionSum')
			.getRawOne<{ count: string | number; versionSum: string | number }>();
		return { count: Number(row?.count ?? 0), versionSum: Number(row?.versionSum ?? 0) };
	}
}
