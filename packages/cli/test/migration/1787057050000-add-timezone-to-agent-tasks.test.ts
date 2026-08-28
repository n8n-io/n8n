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
import { randomUUID } from 'node:crypto';

const MIGRATION_NAME = 'AddTimezoneToAgentTasks1787057050000';

const TASK_TABLES = ['agent_task_definition', 'agent_task_snapshot'] as const;

/**
 * Both tables are recreated on SQLite to take the new column, so what these
 * cases pin is that rows written before the migration survive it — in both
 * directions — and land on the instance timezone (null).
 */
describe('AddTimezoneToAgentTasks Migration', () => {
	let dataSource: DataSource;

	async function withContext<T>(fn: (context: TestMigrationContext) => Promise<T>): Promise<T> {
		const context = createTestMigrationContext(dataSource);
		try {
			return await fn(context);
		} finally {
			await context.queryRunner.release();
		}
	}

	beforeAll(async () => {
		const dbConnection = Container.get(DbConnection);
		await dbConnection.init();
		dataSource = Container.get(DataSource);
	});

	beforeEach(async () => {
		await withContext(async (context) => {
			await context.queryRunner.clearDatabase();
		});
		await initDbUpToMigration(MIGRATION_NAME);
	});

	afterAll(async () => {
		const dbConnection = Container.get(DbConnection);
		await dbConnection.close();
	});

	/** A project + agent + published version carrying one draft task and one snapshot. */
	async function seedTasks(): Promise<{ taskId: string; versionId: string }> {
		const projectId = randomUUID();
		const agentId = randomUUID();
		const versionId = randomUUID();
		const taskId = 'task_1';
		const now = new Date();

		await withContext(async ({ escape, runQuery }) => {
			await runQuery(
				`INSERT INTO ${escape.tableName('project')} ("id", "name", "type", "createdAt", "updatedAt")
				 VALUES (:projectId, 'Project', 'personal', :now, :now)`,
				{ projectId, now },
			);
			await runQuery(
				`INSERT INTO ${escape.tableName('agents')}
				   ("id", "name", "projectId", "integrations", "tools", "skills", "createdAt", "updatedAt")
				 VALUES (:agentId, 'Agent', :projectId, '[]', '{}', '{}', :now, :now)`,
				{ agentId, projectId, now },
			);
			await runQuery(
				`INSERT INTO ${escape.tableName('agent_history')} ("versionId", "agentId", "author", "createdAt", "updatedAt")
				 VALUES (:versionId, :agentId, 'Test User', :now, :now)`,
				{ versionId, agentId, now },
			);
			await runQuery(
				`INSERT INTO ${escape.tableName('agent_task_definition')}
				   ("id", "agentId", "name", "objective", "cronExpression", "createdAt", "updatedAt")
				 VALUES (:taskId, :agentId, 'Daily summary', 'Summarize', '0 9 * * *', :now, :now)`,
				{ taskId, agentId, now },
			);
			await runQuery(
				`INSERT INTO ${escape.tableName('agent_task_snapshot')}
				   ("versionId", "taskId", "enabled", "name", "objective", "cronExpression", "createdAt", "updatedAt")
				 VALUES (:versionId, :taskId, :enabled, 'Daily summary', 'Summarize', '0 9 * * *', :now, :now)`,
				{ versionId, taskId, enabled: true, now },
			);
		});

		return { taskId, versionId };
	}

	async function hasTimezoneColumn(
		context: TestMigrationContext,
		tableName: string,
	): Promise<boolean> {
		if (context.isSqlite) {
			const rows: Array<{ name: string }> = await context.queryRunner.query(
				`PRAGMA table_info(${context.escape.tableName(tableName)})`,
			);
			return rows.some((row) => row.name === 'timezone');
		}
		const rows: unknown[] = await context.queryRunner.query(
			'SELECT column_name FROM information_schema.columns WHERE table_name = $1 AND column_name = $2',
			[`${context.tablePrefix}${tableName}`, 'timezone'],
		);
		return rows.length === 1;
	}

	it('adds the column to both task tables, leaving existing rows on the instance timezone', async () => {
		const { taskId, versionId } = await seedTasks();

		await runSingleMigration(MIGRATION_NAME);
		dataSource = Container.get(DataSource);

		await withContext(async (context) => {
			for (const table of TASK_TABLES) {
				expect(await hasTimezoneColumn(context, table)).toBe(true);
			}

			const definitions = await context.runQuery<
				Array<{ cronExpression: string; timezone: string | null }>
			>(
				`SELECT "cronExpression", "timezone" FROM ${context.escape.tableName('agent_task_definition')} WHERE "id" = :id`,
				{ id: taskId },
			);
			expect(definitions).toEqual([{ cronExpression: '0 9 * * *', timezone: null }]);

			const snapshots = await context.runQuery<Array<{ timezone: string | null }>>(
				`SELECT "timezone" FROM ${context.escape.tableName('agent_task_snapshot')} WHERE "versionId" = :versionId`,
				{ versionId },
			);
			expect(snapshots).toEqual([{ timezone: null }]);
		});
	});

	it('reverts by dropping the column and keeping the task rows', async () => {
		const { taskId, versionId } = await seedTasks();

		await runSingleMigration(MIGRATION_NAME);
		await undoLastSingleMigration();
		dataSource = Container.get(DataSource);

		await withContext(async (context) => {
			for (const table of TASK_TABLES) {
				expect(await hasTimezoneColumn(context, table)).toBe(false);
			}

			const definitions = await context.runQuery<Array<{ id: string }>>(
				`SELECT "id" FROM ${context.escape.tableName('agent_task_definition')} WHERE "id" = :id`,
				{ id: taskId },
			);
			expect(definitions).toHaveLength(1);

			const snapshots = await context.runQuery<Array<{ taskId: string }>>(
				`SELECT "taskId" FROM ${context.escape.tableName('agent_task_snapshot')} WHERE "versionId" = :versionId`,
				{ versionId },
			);
			expect(snapshots).toHaveLength(1);
		});
	});
});
