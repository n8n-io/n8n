import { BaseRepository, type OperationContext, TransactionRunner } from '@n8n/db';
import { Service } from '@n8n/di';
import { DataSource } from '@n8n/typeorm';

import { WorkflowRuleExemptionEntity } from './workflow-rule-exemption.entity';

class WorkflowRuleExemptionTable extends BaseRepository<WorkflowRuleExemptionEntity> {
	constructor(dataSource: DataSource, transactionRunner: TransactionRunner) {
		super(WorkflowRuleExemptionEntity, dataSource.manager, transactionRunner);
	}
}

export type NewWorkflowRuleExemption = Pick<
	WorkflowRuleExemptionEntity,
	'workflowId' | 'ruleId' | 'reason' | 'createdById'
>;

@Service()
export class WorkflowRuleExemptionRepository {
	private readonly table: WorkflowRuleExemptionTable;

	constructor(dataSource: DataSource, transactionRunner: TransactionRunner) {
		this.table = new WorkflowRuleExemptionTable(dataSource, transactionRunner);
	}

	async findAll(ctx: OperationContext): Promise<WorkflowRuleExemptionEntity[]> {
		return await this.table
			.managerFor(ctx)
			.find(WorkflowRuleExemptionEntity, { order: { createdAt: 'DESC' } });
	}

	async findById(id: number, ctx: OperationContext): Promise<WorkflowRuleExemptionEntity | null> {
		return await this.table.managerFor(ctx).findOneBy(WorkflowRuleExemptionEntity, { id });
	}

	/** Returns `null` when the workflow is already exempt from the rule. */
	async createUnlessExists(
		exemption: NewWorkflowRuleExemption,
		ctx: OperationContext,
	): Promise<WorkflowRuleExemptionEntity | null> {
		return await this.table.runInTransaction(ctx, async (manager) => {
			const existing = await manager.findOneBy(WorkflowRuleExemptionEntity, {
				workflowId: exemption.workflowId,
				ruleId: exemption.ruleId,
			});
			if (existing) return null;
			return await manager.save(manager.create(WorkflowRuleExemptionEntity, exemption));
		});
	}

	async deleteById(id: number, ctx: OperationContext): Promise<boolean> {
		const result = await this.table.managerFor(ctx).delete(WorkflowRuleExemptionEntity, { id });
		return (result.affected ?? 0) > 0;
	}

	/** Changes on an insert and on a delete, so a poll notices either. */
	async readFingerprint(ctx: OperationContext): Promise<{ count: number; idSum: number }> {
		const row = await this.table
			.managerFor(ctx)
			.createQueryBuilder(WorkflowRuleExemptionEntity, 'exemption')
			.select('COUNT(*)', 'count')
			.addSelect('COALESCE(SUM(exemption.id), 0)', 'idSum')
			.getRawOne<{ count: string | number; idSum: string | number }>();
		return { count: Number(row?.count ?? 0), idSum: Number(row?.idSum ?? 0) };
	}
}
