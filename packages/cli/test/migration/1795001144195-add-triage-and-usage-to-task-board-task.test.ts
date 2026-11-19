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

const migration = 'AddTriageAndUsageToTaskBoardTask1795001144195';

// SQLite returns a JSON column as text, Postgres returns the parsed value.
const fromJson = (value: unknown): unknown =>
	typeof value === 'string' ? JSON.parse(value) : value;

describe('Task board task triage and usage migration', () => {
	let dataSource: DataSource;

	beforeAll(async () => {
		await Container.get(DbConnection).init();
		dataSource = Container.get(DataSource);
	});

	beforeEach(async () => {
		await withContext(async ({ queryRunner }) => await queryRunner.clearDatabase());
		await initDbUpToMigration(migration);
		await withContext(async ({ escape, runQuery }) => {
			const insert = async (table: string, row: Record<string, string | number>) =>
				await runQuery(
					`INSERT INTO ${escape.tableName(table)} (${Object.keys(row).map(escape.columnName).join(', ')}) VALUES (${Object.keys(
						row,
					)
						.map((key) => `:${key}`)
						.join(', ')})`,
					row,
				);
			await insert('project', { id: 'project-1', name: 'Project', type: 'team' });
			await insert('task_board', { id: 'board-1', projectId: 'project-1', name: 'Board' });
			await insert('task_board_column', {
				id: 'column-1',
				boardId: 'board-1',
				name: 'Todo',
				position: 0,
			});
			await insert('task_board_task', {
				id: 'task-1',
				boardId: 'board-1',
				columnId: 'column-1',
				number: 1,
				title: 'Task',
				createdByType: 'user',
				createdById: 'user-1',
				position: 0,
			});
			await insert('task_board_comment', {
				id: 'comment-1',
				taskId: 'task-1',
				authorType: 'user',
				authorId: 'user-1',
				body: 'Comment',
			});
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

	const selectComments = async ({ escape, runQuery }: TestMigrationContext) =>
		await runQuery(
			`SELECT ${escape.columnName('id')} FROM ${escape.tableName('task_board_comment')}`,
		);

	it('gives an existing task empty defaults and keeps its comments', async () => {
		await runSingleMigration(migration);

		await withContext(async (context) => {
			const { escape, runQuery } = context;
			const [task] = await runQuery<
				Array<{ severity: string | null; tags: unknown; handoffCount: number; agentUsage: unknown }>
			>(
				`SELECT ${['severity', 'tags', 'handoffCount', 'agentUsage'].map(escape.columnName).join(', ')} FROM ${escape.tableName('task_board_task')}`,
			);

			expect(task.severity).toBeNull();
			expect(fromJson(task.tags)).toEqual([]);
			expect(task.handoffCount).toBe(0);
			expect(fromJson(task.agentUsage)).toEqual([]);
			expect(await selectComments(context)).toEqual([{ id: 'comment-1' }]);
		});
	});

	it('accepts only a known severity', async () => {
		await runSingleMigration(migration);

		await withContext(async ({ escape, runQuery }) => {
			const setSeverity = async (severity: string) =>
				await runQuery(
					`UPDATE ${escape.tableName('task_board_task')} SET ${escape.columnName('severity')} = :severity`,
					{ severity },
				);

			await setSeverity('critical');
			await expect(setSeverity('urgent')).rejects.toThrow();
		});
	});

	it('removes the columns on revert and keeps the comments', async () => {
		await runSingleMigration(migration);
		await undoLastSingleMigration();

		await withContext(async (context) => {
			const { queryRunner, tablePrefix } = context;
			const table = await queryRunner.getTable(`${tablePrefix}task_board_task`);

			for (const column of ['severity', 'tags', 'handoffCount', 'agentUsage']) {
				expect(table?.findColumnByName(column)).toBeUndefined();
			}
			expect(await selectComments(context)).toEqual([{ id: 'comment-1' }]);
		});
	});
});
