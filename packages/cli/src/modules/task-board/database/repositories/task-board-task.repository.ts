import { BaseRepository, OperationContext, TransactionRunner } from '@n8n/db';
import { Service } from '@n8n/di';
import { DataSource, In } from '@n8n/typeorm';

import { TaskBoardTaskEntity } from '../entities/task-board-task.entity';

class TaskBoardTaskTable extends BaseRepository<TaskBoardTaskEntity> {
	constructor(dataSource: DataSource, transactionRunner: TransactionRunner) {
		super(TaskBoardTaskEntity, dataSource.manager, transactionRunner);
	}
}

export type NewTaskBoardTaskRow = Pick<
	TaskBoardTaskEntity,
	| 'boardId'
	| 'columnId'
	| 'taskNumber'
	| 'title'
	| 'description'
	| 'assigneeType'
	| 'assigneeId'
	| 'createdByType'
	| 'createdById'
	| 'position'
>;

export type TaskBoardTaskChanges = Partial<
	Pick<
		TaskBoardTaskEntity,
		'title' | 'description' | 'columnId' | 'position' | 'assigneeType' | 'assigneeId'
	>
>;

@Service()
export class TaskBoardTaskRepository {
	private readonly table: TaskBoardTaskTable;

	constructor(dataSource: DataSource, transactionRunner: TransactionRunner) {
		this.table = new TaskBoardTaskTable(dataSource, transactionRunner);
	}

	async findByBoardId(boardId: string, ctx: OperationContext = {}) {
		return await this.table.managerFor(ctx).find(TaskBoardTaskEntity, {
			where: { boardId },
			order: { position: 'ASC', taskNumber: 'ASC' },
		});
	}

	async findById(taskId: string, ctx: OperationContext = {}) {
		return await this.table.managerFor(ctx).findOneBy(TaskBoardTaskEntity, { id: taskId });
	}

	/** The number of tasks on each board. A board without tasks is absent from the map. */
	async countByBoardIds(boardIds: string[], ctx: OperationContext = {}) {
		const counts = new Map<string, number>();
		if (boardIds.length === 0) return counts;

		const rows = await this.table
			.managerFor(ctx)
			.createQueryBuilder(TaskBoardTaskEntity, 'task')
			.select('task.boardId', 'boardId')
			.addSelect('COUNT(task.id)', 'count')
			.where({ boardId: In(boardIds) })
			.groupBy('task.boardId')
			.getRawMany<{ boardId: string; count: string | number }>();

		for (const row of rows) counts.set(row.boardId, Number(row.count));
		return counts;
	}

	/** The next sequential number on the board. Call it in the transaction that inserts the task. */
	async findNextNumber(boardId: string, ctx: OperationContext) {
		const row = await this.table
			.managerFor(ctx)
			.createQueryBuilder(TaskBoardTaskEntity, 'task')
			.select('MAX(task.taskNumber)', 'max')
			.where({ boardId })
			.getRawOne<{ max: string | number | null }>();
		return Number(row?.max ?? 0) + 1;
	}

	/** The position after the last task in the column. */
	async findNextPosition(columnId: string, ctx: OperationContext) {
		const row = await this.table
			.managerFor(ctx)
			.createQueryBuilder(TaskBoardTaskEntity, 'task')
			.select('MAX(task.position)', 'max')
			.where({ columnId })
			.getRawOne<{ max: string | number | null }>();
		return row?.max === null || row?.max === undefined ? 0 : Number(row.max) + 1;
	}

	/** `save`, not `insert`: the `@BeforeInsert` id generator only runs on an entity instance. */
	async insertTask(row: NewTaskBoardTaskRow, ctx: OperationContext) {
		return await this.table.managerFor(ctx).save(TaskBoardTaskEntity, this.table.create(row));
	}

	async updateTask(taskId: string, changes: TaskBoardTaskChanges, ctx: OperationContext) {
		await this.table.managerFor(ctx).update(TaskBoardTaskEntity, { id: taskId }, changes);
	}
}
