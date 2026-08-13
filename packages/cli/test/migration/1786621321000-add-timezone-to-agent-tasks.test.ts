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

const MIGRATION_NAME = 'AddTimezoneToAgentTasks1786621321000';

const TASK_TABLES = ['agent_task_definition', 'agent_task_snapshot'] as const;

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

	async function insertProject(context: TestMigrationContext, id: string): Promise<void> {
		const tableName = context.escape.tableName('project');
		await context.runQuery(
			`INSERT INTO ${tableName} ("id", "name", "type", "createdAt", "updatedAt")
			 VALUES (:id, :name, :type, :createdAt, :updatedAt)`,
			{
				id,
				name: `project-${id.slice(0, 8)}`,
				type: 'personal',
				createdAt: new Date(),
				updatedAt: new Date(),
			},
		);
	}

	async function insertAgent(
		context: TestMigrationContext,
		data: { id: string; projectId: string },
	): Promise<void> {
		const tableName = context.escape.tableName('agents');
		await context.runQuery(
			`INSERT INTO ${tableName}
			   ("id", "name", "projectId", "integrations", "tools", "skills", "createdAt", "updatedAt")
			 VALUES (:id, :name, :projectId, :integrations, :tools, :skills, :createdAt, :updatedAt)`,
			{
				id: data.id,
				name: `agent-${data.id.slice(0, 8)}`,
				projectId: data.projectId,
				integrations: '[]',
				tools: '{}',
				skills: '{}',
				createdAt: new Date(),
				updatedAt: new Date(),
			},
		);
	}

	async function insertAgentHistory(
		context: TestMigrationContext,
		data: { versionId: string; agentId: string },
	): Promise<void> {
		const tableName = context.escape.tableName('agent_history');
		await context.runQuery(
			`INSERT INTO ${tableName} ("versionId", "agentId", "author", "createdAt", "updatedAt")
			 VALUES (:versionId, :agentId, :author, :createdAt, :updatedAt)`,
			{
				versionId: data.versionId,
				agentId: data.agentId,
				author: 'Test User',
				createdAt: new Date(),
				updatedAt: new Date(),
			},
		);
	}

	async function insertTaskDefinition(
		context: TestMigrationContext,
		data: { id: string; agentId: string },
	): Promise<void> {
		const tableName = context.escape.tableName('agent_task_definition');
		await context.runQuery(
			`INSERT INTO ${tableName}
			   ("id", "agentId", "name", "objective", "cronExpression", "createdAt", "updatedAt")
			 VALUES (:id, :agentId, :name, :objective, :cronExpression, :createdAt, :updatedAt)`,
			{
				id: data.id,
				agentId: data.agentId,
				name: 'Daily summary',
				objective: 'Summarize messages',
				cronExpression: '0 9 * * *',
				createdAt: new Date(),
				updatedAt: new Date(),
			},
		);
	}

	async function insertTaskSnapshot(
		context: TestMigrationContext,
		data: { versionId: string; taskId: string },
	): Promise<void> {
		const tableName = context.escape.tableName('agent_task_snapshot');
		await context.runQuery(
			`INSERT INTO ${tableName}
			   ("versionId", "taskId", "enabled", "name", "objective", "cronExpression", "createdAt", "updatedAt")
			 VALUES (:versionId, :taskId, :enabled, :name, :objective, :cronExpression, :createdAt, :updatedAt)`,
			{
				versionId: data.versionId,
				taskId: data.taskId,
				enabled: true,
				name: 'Daily summary',
				objective: 'Summarize messages',
				cronExpression: '0 9 * * *',
				createdAt: new Date(),
				updatedAt: new Date(),
			},
		);
	}

	async function getColumnMeta(
		context: TestMigrationContext,
		tableName: string,
		columnName: string,
	) {
		if (context.isSqlite) {
			const rows: Array<{ name: string; notnull: number }> = await context.queryRunner.query(
				`PRAGMA table_info(${context.escape.tableName(tableName)})`,
			);
			return rows.find((row) => row.name === columnName);
		}
		const rows: Array<{ column_name: string; is_nullable: string }> =
			await context.queryRunner.query(
				'SELECT column_name, is_nullable FROM information_schema.columns WHERE table_name = $1 AND column_name = $2',
				[`${context.tablePrefix}${tableName}`, columnName],
			);
		return rows[0];
	}

	/** A project + agent + published version with one draft task and one snapshot. */
	async function seedTasks(): Promise<{ taskId: string; versionId: string }> {
		const projectId = randomUUID();
		const agentId = randomUUID();
		const versionId = randomUUID();
		const taskId = 'task_1';

		await withContext(async (context) => {
			await insertProject(context, projectId);
			await insertAgent(context, { id: agentId, projectId });
			await insertAgentHistory(context, { versionId, agentId });
			await insertTaskDefinition(context, { id: taskId, agentId });
			await insertTaskSnapshot(context, { versionId, taskId });
		});

		return { taskId, versionId };
	}

	describe('up', () => {
		it('adds a nullable timezone to both task tables, leaving existing rows on the instance timezone', async () => {
			const { taskId, versionId } = await seedTasks();

			await runSingleMigration(MIGRATION_NAME);
			dataSource = Container.get(DataSource);

			await withContext(async (context) => {
				for (const table of TASK_TABLES) {
					const column = await getColumnMeta(context, table, 'timezone');
					expect(column).toBeDefined();
					if (context.isSqlite) {
						expect((column as { notnull: number }).notnull).toBe(0);
					} else {
						expect((column as { is_nullable: string }).is_nullable).toBe('YES');
					}
				}

				const definitions = await context.runQuery<
					Array<{ cronExpression: string; timezone: string | null }>
				>(
					`SELECT "cronExpression", "timezone" FROM ${context.escape.tableName('agent_task_definition')} WHERE "id" = :id`,
					{ id: taskId },
				);
				expect(definitions).toHaveLength(1);
				expect(definitions[0].cronExpression).toBe('0 9 * * *');
				expect(definitions[0].timezone).toBeNull();

				const snapshots = await context.runQuery<Array<{ timezone: string | null }>>(
					`SELECT "timezone" FROM ${context.escape.tableName('agent_task_snapshot')} WHERE "versionId" = :versionId`,
					{ versionId },
				);
				expect(snapshots).toHaveLength(1);
				expect(snapshots[0].timezone).toBeNull();
			});
		});

		it('stores a timezone alongside the cron', async () => {
			const { taskId } = await seedTasks();

			await runSingleMigration(MIGRATION_NAME);
			dataSource = Container.get(DataSource);

			await withContext(async (context) => {
				const tableName = context.escape.tableName('agent_task_definition');
				await context.runQuery(`UPDATE ${tableName} SET "timezone" = :timezone WHERE "id" = :id`, {
					timezone: 'Europe/London',
					id: taskId,
				});

				const rows = await context.runQuery<Array<{ timezone: string | null }>>(
					`SELECT "timezone" FROM ${tableName} WHERE "id" = :id`,
					{ id: taskId },
				);
				expect(rows[0].timezone).toBe('Europe/London');
			});
		});
	});

	describe('down', () => {
		it('removes the columns and keeps the task rows', async () => {
			const { taskId, versionId } = await seedTasks();

			await runSingleMigration(MIGRATION_NAME);
			await undoLastSingleMigration();
			dataSource = Container.get(DataSource);

			await withContext(async (context) => {
				for (const table of TASK_TABLES) {
					expect(await getColumnMeta(context, table, 'timezone')).toBeUndefined();
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
});
