import type { MigrationContext, ReversibleMigration } from '../migration-types';

const boardAgentTable = 'task_board_agent';

/**
 * The team of a board: the agents that can take the tasks of the board. Before this table
 * every agent of the project was on every board, so each existing board gets those agents.
 */
export class CreateTaskBoardAgentTable1795003613512 implements ReversibleMigration {
	async up(context: MigrationContext) {
		const { createTable, column } = context.schemaBuilder;
		// The two foreign keys are the key: the table only links a board to an agent.
		await createTable(boardAgentTable)
			.withColumns(column('boardId').varchar(36).primary, column('agentId').varchar(36).primary)
			// The key covers lookups by board. This index covers the cascade from an agent.
			.withCreatedAt.withIndexOn(['agentId'])
			.withForeignKey('boardId', { tableName: 'task_board', columnName: 'id', onDelete: 'CASCADE' })
			.withForeignKey('agentId', { tableName: 'agents', columnName: 'id', onDelete: 'CASCADE' });

		await this.addProjectAgentsToBoards(context);
	}

	async down({ schemaBuilder: { dropTable } }: MigrationContext) {
		await dropTable(boardAgentTable);
	}

	private async addProjectAgentsToBoards({ escape, runQuery }: MigrationContext) {
		const boardId = escape.columnName('boardId');
		const agentId = escape.columnName('agentId');
		const projectId = escape.columnName('projectId');
		const id = escape.columnName('id');
		await runQuery(
			`INSERT INTO ${escape.tableName(boardAgentTable)} (${boardId}, ${agentId})
			 SELECT board.${id}, agent.${id}
			 FROM ${escape.tableName('task_board')} board
			 JOIN ${escape.tableName('agents')} agent ON agent.${projectId} = board.${projectId}`,
		);
	}
}
