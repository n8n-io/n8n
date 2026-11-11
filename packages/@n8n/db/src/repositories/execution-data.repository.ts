import { Service } from '@n8n/di';
import { DataSource, In } from '@n8n/typeorm';

import { BaseRepository } from './base-repository';
import { ExecutionData } from '../entities';
import { type OperationContext, TransactionRunner } from '../services/transaction';

class ExecutionDataTable extends BaseRepository<ExecutionData> {
	constructor(dataSource: DataSource, transactionRunner: TransactionRunner) {
		super(ExecutionData, dataSource.manager, transactionRunner);
	}
}

@Service()
export class ExecutionDataRepository {
	private readonly table: ExecutionDataTable;

	constructor(dataSource: DataSource, transactionRunner: TransactionRunner) {
		this.table = new ExecutionDataTable(dataSource, transactionRunner);
	}

	async findPayloadByExecutionId(
		executionId: string,
		ctx: OperationContext,
	): Promise<Pick<ExecutionData, 'data' | 'workflowData' | 'workflowVersionId'> | null> {
		return await this.table.managerFor(ctx).findOne(ExecutionData, {
			where: { executionId },
			select: ['data', 'workflowData', 'workflowVersionId'],
		});
	}

	async findWorkflowSnapshotByExecutionId(
		executionId: string,
		ctx: OperationContext,
	): Promise<Pick<ExecutionData, 'workflowData' | 'workflowVersionId'> | null> {
		return await this.table.managerFor(ctx).findOne(ExecutionData, {
			where: { executionId },
			select: ['workflowData', 'workflowVersionId'],
		});
	}

	async getDataByteSize(executionId: string, ctx: OperationContext): Promise<number | null> {
		// LENGTH() counts characters. The stored data is near-ASCII, so this approximates bytes.
		const row = await this.table
			.managerFor(ctx)
			.createQueryBuilder(ExecutionData, 'd')
			.select('LENGTH(d.data)', 'size')
			.where('d.executionId = :executionId', { executionId })
			.getRawOne<{ size: number | string | null }>();

		if (!row || row.size === null) return null;

		return Number(row.size);
	}

	async findPayloadsByExecutionIds(
		executionIds: string[],
		ctx: OperationContext,
	): Promise<
		Array<Pick<ExecutionData, 'executionId' | 'data' | 'workflowData' | 'workflowVersionId'>>
	> {
		return await this.table.managerFor(ctx).find(ExecutionData, {
			where: { executionId: In(executionIds) },
			select: ['executionId', 'data', 'workflowData', 'workflowVersionId'],
		});
	}
}
