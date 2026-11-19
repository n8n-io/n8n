import { BaseRepository, OperationContext, TransactionRunner } from '@n8n/db';
import { Service } from '@n8n/di';
import { DataSource, In } from '@n8n/typeorm';

import { TaskBoardEntity } from '../entities/task-board.entity';

class TaskBoardTable extends BaseRepository<TaskBoardEntity> {
	constructor(dataSource: DataSource, transactionRunner: TransactionRunner) {
		super(TaskBoardEntity, dataSource.manager, transactionRunner);
	}
}

export type NewTaskBoardRow = Pick<
	TaskBoardEntity,
	'projectId' | 'name' | 'description' | 'templateKey' | 'workflowId'
>;

@Service()
export class TaskBoardRepository {
	private readonly table: TaskBoardTable;

	constructor(dataSource: DataSource, transactionRunner: TransactionRunner) {
		this.table = new TaskBoardTable(dataSource, transactionRunner);
	}

	async findByProjectIds(projectIds: string[], ctx: OperationContext = {}) {
		if (projectIds.length === 0) return [];
		return await this.table.managerFor(ctx).find(TaskBoardEntity, {
			where: { projectId: In(projectIds) },
			order: { createdAt: 'ASC' },
		});
	}

	async findById(boardId: string, ctx: OperationContext = {}) {
		return await this.table.managerFor(ctx).findOneBy(TaskBoardEntity, { id: boardId });
	}

	/** `save`, not `insert`: the `@BeforeInsert` id generator only runs on an entity instance. */
	async insertBoard(row: NewTaskBoardRow, ctx: OperationContext = {}) {
		return await this.table.managerFor(ctx).save(TaskBoardEntity, this.table.create(row));
	}

	async setWorkflowId(boardId: string, workflowId: string | null, ctx: OperationContext = {}) {
		await this.table.managerFor(ctx).update(TaskBoardEntity, { id: boardId }, { workflowId });
	}

	/** The foreign keys delete the columns, tasks and comments of the board. */
	async deleteBoard(boardId: string, ctx: OperationContext = {}) {
		await this.table.managerFor(ctx).delete(TaskBoardEntity, { id: boardId });
	}
}
