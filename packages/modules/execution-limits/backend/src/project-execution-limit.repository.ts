import { BaseRepository, chunkIds, TransactionRunner, type OperationContext } from '@n8n/db';
import { Service } from '@n8n/di';
import { DataSource, In } from '@n8n/typeorm';

import type { ProjectLimit } from './execution-limits.types';
import { ProjectExecutionLimit } from './project-execution-limit.entity';

class ProjectExecutionLimitTable extends BaseRepository<ProjectExecutionLimit> {
	constructor(dataSource: DataSource, transactionRunner: TransactionRunner) {
		super(ProjectExecutionLimit, dataSource.manager, transactionRunner);
	}
}

function toProjectLimit({ projectId, maxExecutions }: ProjectExecutionLimit): ProjectLimit {
	return { projectId, maxExecutions };
}

/** The only reader and writer of `project_execution_limit`. */
@Service()
export class ProjectExecutionLimitRepository {
	private readonly table: ProjectExecutionLimitTable;

	constructor(dataSource: DataSource, transactionRunner: TransactionRunner) {
		this.table = new ProjectExecutionLimitTable(dataSource, transactionRunner);
	}

	async findAll(ctx: OperationContext): Promise<ProjectLimit[]> {
		const rows = await this.table.managerFor(ctx).find(ProjectExecutionLimit);

		return rows.map(toProjectLimit);
	}

	async findByProjectIds(projectIds: string[], ctx: OperationContext): Promise<ProjectLimit[]> {
		const manager = this.table.managerFor(ctx);
		const limits: ProjectLimit[] = [];

		for (const batch of chunkIds(projectIds)) {
			const rows = await manager.find(ProjectExecutionLimit, {
				where: { projectId: In(batch) },
			});
			limits.push(...rows.map(toProjectLimit));
		}

		return limits;
	}

	/** Creates the limit of a project, or replaces the one that it has. */
	async upsertMany(limits: ProjectLimit[], ctx: OperationContext): Promise<void> {
		const manager = this.table.managerFor(ctx);

		for (const batch of chunkIds(limits)) {
			// TypeORM writes the generated timestamps into the objects that it gets.
			const rows = batch.map((limit) => ({ ...limit }));
			await manager.upsert(ProjectExecutionLimit, rows, ['projectId']);
		}
	}

	async deleteByProjectIds(projectIds: string[], ctx: OperationContext): Promise<void> {
		const manager = this.table.managerFor(ctx);

		for (const batch of chunkIds(projectIds)) {
			await manager.delete(ProjectExecutionLimit, { projectId: In(batch) });
		}
	}
}
