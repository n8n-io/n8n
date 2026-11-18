import { BaseRepository, OperationContext, TransactionRunner } from '@n8n/db';
import { Service } from '@n8n/di';
import { DataSource } from '@n8n/typeorm';

import { TaskBoardAgentEntity } from '../entities/task-board-agent.entity';

class TaskBoardAgentTable extends BaseRepository<TaskBoardAgentEntity> {
	constructor(dataSource: DataSource, transactionRunner: TransactionRunner) {
		super(TaskBoardAgentEntity, dataSource.manager, transactionRunner);
	}
}

/** The team of a board: the agents that can take its tasks. */
@Service()
export class TaskBoardAgentRepository {
	private readonly table: TaskBoardAgentTable;

	constructor(dataSource: DataSource, transactionRunner: TransactionRunner) {
		this.table = new TaskBoardAgentTable(dataSource, transactionRunner);
	}

	async findAgentIdsByBoardId(boardId: string, ctx: OperationContext = {}): Promise<string[]> {
		const rows = await this.table.managerFor(ctx).findBy(TaskBoardAgentEntity, { boardId });
		return rows.map((row) => row.agentId);
	}

	/** Does nothing when the agent is already on the board. */
	async addAgent(boardId: string, agentId: string, ctx: OperationContext = {}) {
		await this.table
			.managerFor(ctx)
			.createQueryBuilder()
			.insert()
			.into(TaskBoardAgentEntity)
			.values({ boardId, agentId })
			.orIgnore()
			.execute();
	}
}
