import type { TaskBoardColumnRole } from '@n8n/api-types';
import { BaseRepository, OperationContext, TransactionRunner } from '@n8n/db';
import { Service } from '@n8n/di';
import { DataSource } from '@n8n/typeorm';

import { TaskBoardColumnEntity } from '../entities/task-board-column.entity';

class TaskBoardColumnTable extends BaseRepository<TaskBoardColumnEntity> {
	constructor(dataSource: DataSource, transactionRunner: TransactionRunner) {
		super(TaskBoardColumnEntity, dataSource.manager, transactionRunner);
	}
}

export type NewTaskBoardColumnRow = {
	name: string;
	role: TaskBoardColumnRole | null;
};

@Service()
export class TaskBoardColumnRepository {
	private readonly table: TaskBoardColumnTable;

	constructor(dataSource: DataSource, transactionRunner: TransactionRunner) {
		this.table = new TaskBoardColumnTable(dataSource, transactionRunner);
	}

	/** The columns of the board, from left to right. */
	async findByBoardId(boardId: string, ctx: OperationContext = {}) {
		return await this.table.managerFor(ctx).find(TaskBoardColumnEntity, {
			where: { boardId },
			order: { position: 'ASC' },
		});
	}

	/** Inserts the columns in the given order, so their positions start at 0. */
	async insertColumns(boardId: string, columns: NewTaskBoardColumnRow[], ctx: OperationContext) {
		const entities = columns.map((column, position) =>
			this.table.create({ boardId, name: column.name, role: column.role, position }),
		);
		return await this.table.managerFor(ctx).save(TaskBoardColumnEntity, entities);
	}
}
