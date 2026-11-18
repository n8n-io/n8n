import { BaseRepository, ExecutionEntity, OperationContext, TransactionRunner } from '@n8n/db';
import { Service } from '@n8n/di';
import { DataSource } from '@n8n/typeorm';

class ExecutionTable extends BaseRepository<ExecutionEntity> {
	constructor(dataSource: DataSource, transactionRunner: TransactionRunner) {
		super(ExecutionEntity, dataSource.manager, transactionRunner);
	}
}

/** The statuses of an execution that ran to its end. */
export const FINISHED_EXECUTION_STATUSES = ['success', 'error'] as const;

export type FinishedExecutionStatus = (typeof FINISHED_EXECUTION_STATUSES)[number];

export type LastExecutionRow = {
	workflowId: string;
	status: FinishedExecutionStatus;
	stoppedAt: Date;
};

type FinishedExecution = ExecutionEntity & { status: FinishedExecutionStatus; stoppedAt: Date };

function isFinished(execution: ExecutionEntity): execution is FinishedExecution {
	return (
		FINISHED_EXECUTION_STATUSES.some((status) => status === execution.status) &&
		execution.stoppedAt !== null
	);
}

function toLastExecutionRow({
	workflowId,
	status,
	stoppedAt,
}: FinishedExecution): LastExecutionRow {
	return { workflowId, status, stoppedAt };
}

/** Reads the execution table. The page module never writes to it. */
@Service()
export class PageExecutionRepository {
	private readonly table: ExecutionTable;

	constructor(dataSource: DataSource, transactionRunner: TransactionRunner) {
		this.table = new ExecutionTable(dataSource, transactionRunner);
	}

	/**
	 * Finds the last execution of each workflow that succeeded or failed, in one query.
	 * The last execution is the one that started last. Deleted executions do not count.
	 * A workflow with no such execution gives no row.
	 */
	async findLastFinishedByWorkflow(
		workflowIds: string[],
		ctx: OperationContext,
	): Promise<LastExecutionRow[]> {
		return workflowIds.length > 0 ? await this.queryLastFinished(workflowIds, ctx) : [];
	}

	/** `workflowIds` must not be empty, because `IN ()` is not valid SQL. */
	private async queryLastFinished(
		workflowIds: string[],
		ctx: OperationContext,
	): Promise<LastExecutionRow[]> {
		const executions = await this.table
			.managerFor(ctx)
			.createQueryBuilder(ExecutionEntity, 'execution')
			.select(['execution.id', 'execution.workflowId', 'execution.status', 'execution.stoppedAt'])
			.where('execution.workflowId IN (:...workflowIds)', { workflowIds })
			.andWhere(
				(query) =>
					`execution.id = ${query
						.subQuery()
						.select('MAX(latest.id)')
						.from(ExecutionEntity, 'latest')
						.where('latest.workflowId = execution.workflowId')
						.andWhere('latest.status IN (:...statuses)', {
							statuses: [...FINISHED_EXECUTION_STATUSES],
						})
						.andWhere('latest.stoppedAt IS NOT NULL')
						.andWhere('latest.deletedAt IS NULL')
						.getQuery()}`,
			)
			.getMany();
		return executions.filter(isFinished).map(toLastExecutionRow);
	}
}
