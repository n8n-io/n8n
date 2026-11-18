import type { WorkflowTestRunResult } from '@n8n/api-types';
import { BaseRepository, OperationContext, TransactionRunner } from '@n8n/db';
import { Service } from '@n8n/di';
import { DataSource } from '@n8n/typeorm';

import { WorkflowTestEntity } from './workflow-test.entity';

class WorkflowTestTable extends BaseRepository<WorkflowTestEntity> {
	constructor(dataSource: DataSource, transactionRunner: TransactionRunner) {
		super(WorkflowTestEntity, dataSource.manager, transactionRunner);
	}
}

@Service()
export class WorkflowTestRepository {
	private readonly table: WorkflowTestTable;

	constructor(dataSource: DataSource, transactionRunner: TransactionRunner) {
		this.table = new WorkflowTestTable(dataSource, transactionRunner);
	}

	async findByWorkflowId(workflowId: string, ctx: OperationContext) {
		return await this.table
			.managerFor(ctx)
			.find(WorkflowTestEntity, { where: { workflowId }, order: { createdAt: 'ASC' } });
	}

	async findOne(workflowId: string, id: string, ctx: OperationContext) {
		return await this.table.managerFor(ctx).findOneBy(WorkflowTestEntity, { workflowId, id });
	}

	/** `save`, not `insert`: the `@BeforeInsert` id generator only runs on an entity instance. */
	async insertFile(workflowId: string, source: string, ctx: OperationContext) {
		return await this.table
			.managerFor(ctx)
			.save(WorkflowTestEntity, this.table.create({ workflowId, source, lastRun: null }));
	}

	/** A new source invalidates the last run, so it is cleared. */
	async updateSource(id: string, source: string, ctx: OperationContext) {
		await this.table
			.managerFor(ctx)
			.update(WorkflowTestEntity, { id }, { source, lastRun: null, updatedAt: new Date() });
	}

	/** Records the run only while the row still holds the source that ran. */
	async recordLastRun(
		id: string,
		source: string,
		lastRun: WorkflowTestRunResult,
		ctx: OperationContext,
	): Promise<boolean> {
		const result = await this.table
			.managerFor(ctx)
			.update(WorkflowTestEntity, { id, source }, { lastRun });
		return result.affected === 1;
	}
}
