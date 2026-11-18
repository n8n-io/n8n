import {
	createTestMigrationContext,
	initDbUpToMigration,
	runSingleMigration,
	undoLastSingleMigration,
	type TestMigrationContext,
} from '@n8n/backend-test-utils';
import { DbConnection } from '@n8n/db';
import { Container } from '@n8n/di';
import { DataSource } from '@n8n/typeorm';

const migration = 'CreateTaskBoardAgentTable1795003613512';

describe('Task board agent table migration', () => {
	let dataSource: DataSource;

	beforeAll(async () => {
		await Container.get(DbConnection).init();
		dataSource = Container.get(DataSource);
	});

	beforeEach(async () => {
		await withContext(async ({ queryRunner }) => await queryRunner.clearDatabase());
		await initDbUpToMigration(migration);
		await withContext(async ({ escape, runQuery }) => {
			const insert = async (table: string, row: Record<string, string>) =>
				await runQuery(
					`INSERT INTO ${escape.tableName(table)} (${Object.keys(row).map(escape.columnName).join(', ')}) VALUES (${Object.keys(
						row,
					)
						.map((key) => `:${key}`)
						.join(', ')})`,
					row,
				);
			await insert('project', { id: 'project-1', name: 'Project 1', type: 'team' });
			await insert('project', { id: 'project-2', name: 'Project 2', type: 'team' });
			await insert('task_board', { id: 'board-1', projectId: 'project-1', name: 'Board 1' });
			await insert('task_board', { id: 'board-2', projectId: 'project-1', name: 'Board 2' });
			await insert('task_board', { id: 'board-3', projectId: 'project-2', name: 'Board 3' });
			await insert('agents', { id: 'agent-1', projectId: 'project-1', name: 'Agent 1' });
			await insert('agents', { id: 'agent-2', projectId: 'project-1', name: 'Agent 2' });
		});
	});

	afterAll(async () => {
		await Container.get(DbConnection).close();
	});

	async function withContext<T>(run: (context: TestMigrationContext) => Promise<T>): Promise<T> {
		const context = createTestMigrationContext(dataSource);

		try {
			return await run(context);
		} finally {
			await context.queryRunner.release();
		}
	}

	const selectBoardAgents = async ({ escape, runQuery }: TestMigrationContext) => {
		const boardId = escape.columnName('boardId');
		const agentId = escape.columnName('agentId');
		return await runQuery(
			`SELECT ${boardId}, ${agentId} FROM ${escape.tableName('task_board_agent')} ORDER BY ${boardId}, ${agentId}`,
		);
	};

	it('puts the agents of a project on each existing board of that project', async () => {
		await runSingleMigration(migration);

		await withContext(async (context) => {
			expect(await selectBoardAgents(context)).toEqual([
				{ boardId: 'board-1', agentId: 'agent-1' },
				{ boardId: 'board-1', agentId: 'agent-2' },
				{ boardId: 'board-2', agentId: 'agent-1' },
				{ boardId: 'board-2', agentId: 'agent-2' },
			]);
		});
	});

	it('removes the agent from the board when the agent is deleted', async () => {
		await runSingleMigration(migration);

		await withContext(async (context) => {
			const { escape, runQuery } = context;
			await runQuery(
				`DELETE FROM ${escape.tableName('agents')} WHERE ${escape.columnName('id')} = 'agent-1'`,
			);

			expect(await selectBoardAgents(context)).toEqual([
				{ boardId: 'board-1', agentId: 'agent-2' },
				{ boardId: 'board-2', agentId: 'agent-2' },
			]);
		});
	});

	it('removes the table on revert', async () => {
		await runSingleMigration(migration);
		await undoLastSingleMigration();

		await withContext(async ({ queryRunner, tablePrefix }) => {
			expect(await queryRunner.getTable(`${tablePrefix}task_board_agent`)).toBeUndefined();
		});
	});
});
