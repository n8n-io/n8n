import { BaseRepository, OperationContext, TransactionRunner } from '@n8n/db';
import { Service } from '@n8n/di';
import { DataSource } from '@n8n/typeorm';

import { TaskBoardCommentEntity } from '../entities/task-board-comment.entity';

class TaskBoardCommentTable extends BaseRepository<TaskBoardCommentEntity> {
	constructor(dataSource: DataSource, transactionRunner: TransactionRunner) {
		super(TaskBoardCommentEntity, dataSource.manager, transactionRunner);
	}
}

export type NewTaskBoardCommentRow = Pick<
	TaskBoardCommentEntity,
	'taskId' | 'authorType' | 'authorId' | 'body'
>;

@Service()
export class TaskBoardCommentRepository {
	private readonly table: TaskBoardCommentTable;

	constructor(dataSource: DataSource, transactionRunner: TransactionRunner) {
		this.table = new TaskBoardCommentTable(dataSource, transactionRunner);
	}

	/** The comments of the task, oldest first. */
	async findByTaskId(taskId: string, ctx: OperationContext = {}) {
		return await this.table.managerFor(ctx).find(TaskBoardCommentEntity, {
			where: { taskId },
			order: { createdAt: 'ASC', id: 'ASC' },
		});
	}

	/** `save`, not `insert`: the `@BeforeInsert` id generator only runs on an entity instance. */
	async insertComment(row: NewTaskBoardCommentRow, ctx: OperationContext = {}) {
		return await this.table.managerFor(ctx).save(TaskBoardCommentEntity, this.table.create(row));
	}
}
