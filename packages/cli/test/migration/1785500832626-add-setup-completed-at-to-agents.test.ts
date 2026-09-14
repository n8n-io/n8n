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

const MIGRATION_NAME = 'AddSetupCompletedAtToAgents1785500832626';

describe('AddSetupCompletedAtToAgents Migration', () => {
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

	async function getColumnMeta(context: TestMigrationContext, columnName: string) {
		if (context.isSqlite) {
			const rows: Array<{ name: string; notnull: number }> = await context.queryRunner.query(
				`PRAGMA table_info(${context.escape.tableName('agents')})`,
			);
			return rows.find((r) => r.name === columnName);
		}
		const rows: Array<{ column_name: string; is_nullable: string }> =
			await context.queryRunner.query(
				'SELECT column_name, is_nullable FROM information_schema.columns WHERE table_name = $1 AND column_name = $2',
				[`${context.tablePrefix}agents`, columnName],
			);
		return rows[0];
	}

	describe('up', () => {
		it('should add setupCompletedAt as nullable and leave existing agents unmarked', async () => {
			const projectId = randomUUID();
			const agentId = randomUUID();

			await withContext(async (context) => {
				await insertProject(context, projectId);
				await insertAgent(context, { id: agentId, projectId });
			});

			await runSingleMigration(MIGRATION_NAME);
			dataSource = Container.get(DataSource);

			await withContext(async (context) => {
				const col = await getColumnMeta(context, 'setupCompletedAt');
				expect(col).toBeDefined();
				if (context.isSqlite) {
					expect((col as { notnull: number }).notnull).toBe(0);
				} else {
					expect((col as { is_nullable: string }).is_nullable).toBe('YES');
				}

				const rows = await context.runQuery<Array<{ setupCompletedAt: Date | null }>>(
					`SELECT "setupCompletedAt" FROM ${context.escape.tableName('agents')} WHERE "id" = :id`,
					{ id: agentId },
				);
				expect(rows).toHaveLength(1);
				expect(rows[0].setupCompletedAt).toBeNull();
			});
		});

		it('should preserve rows in tables with CASCADE FKs to agents', async () => {
			// On SQLite the migration recreates `agents` (drop + rename), which would
			// cascade-delete child rows unless FKs are disabled for the migration's
			// duration (withFKsDisabled on the sqlite subclass).
			const projectId = randomUUID();
			const agentId = randomUUID();
			const versionId = randomUUID();

			await withContext(async (context) => {
				await insertProject(context, projectId);
				await insertAgent(context, { id: agentId, projectId });
				await insertAgentHistory(context, { versionId, agentId });
			});

			await runSingleMigration(MIGRATION_NAME);
			dataSource = Container.get(DataSource);

			await withContext(async (context) => {
				const historyRows = await context.runQuery<Array<{ versionId: string }>>(
					`SELECT "versionId" FROM ${context.escape.tableName('agent_history')} WHERE "agentId" = :id`,
					{ id: agentId },
				);
				expect(historyRows).toHaveLength(1);
				expect(historyRows[0].versionId).toBe(versionId);
			});
		});
	});

	describe('down', () => {
		it('should remove the column and preserve child rows', async () => {
			const projectId = randomUUID();
			const agentId = randomUUID();
			const versionId = randomUUID();

			await withContext(async (context) => {
				await insertProject(context, projectId);
				await insertAgent(context, { id: agentId, projectId });
				await insertAgentHistory(context, { versionId, agentId });
			});

			await runSingleMigration(MIGRATION_NAME);
			await undoLastSingleMigration();
			dataSource = Container.get(DataSource);

			await withContext(async (context) => {
				expect(await getColumnMeta(context, 'setupCompletedAt')).toBeUndefined();

				const historyRows = await context.runQuery<Array<{ versionId: string }>>(
					`SELECT "versionId" FROM ${context.escape.tableName('agent_history')} WHERE "agentId" = :id`,
					{ id: agentId },
				);
				expect(historyRows).toHaveLength(1);
			});
		});
	});
});
