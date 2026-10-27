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

const MIGRATION_NAME = 'AddAvailableInMcpToAgents1784897791636';

describe('AddAvailableInMcpToAgents Migration', () => {
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
			const rows: Array<{ name: string; notnull: number; dflt_value: string | null }> =
				await context.queryRunner.query(`PRAGMA table_info(${context.escape.tableName('agents')})`);
			return rows.find((r) => r.name === columnName);
		}
		const rows: Array<{
			column_name: string;
			is_nullable: string;
			column_default: string | null;
		}> = await context.queryRunner.query(
			'SELECT column_name, is_nullable, column_default FROM information_schema.columns WHERE table_name = $1 AND column_name = $2',
			[`${context.tablePrefix}agents`, columnName],
		);
		return rows[0];
	}

	describe('up', () => {
		it('should add availableInMCP as NOT NULL with default false', async () => {
			await runSingleMigration(MIGRATION_NAME);
			dataSource = Container.get(DataSource);

			await withContext(async (context) => {
				const col = await getColumnMeta(context, 'availableInMCP');
				expect(col).toBeDefined();
				if (context.isSqlite) {
					expect((col as { notnull: number }).notnull).toBe(1);
				} else {
					expect((col as { is_nullable: string }).is_nullable).toBe('NO');
				}
			});
		});

		it('should backfill false on existing agents', async () => {
			const projectId = randomUUID();
			const agentId = randomUUID();

			await withContext(async (context) => {
				await insertProject(context, projectId);
				await insertAgent(context, { id: agentId, projectId });
			});

			await runSingleMigration(MIGRATION_NAME);
			dataSource = Container.get(DataSource);

			await withContext(async (context) => {
				const rows = await context.runQuery<Array<{ availableInMCP: boolean | number }>>(
					`SELECT "availableInMCP" FROM ${context.escape.tableName('agents')} WHERE "id" = :id`,
					{ id: agentId },
				);
				expect(rows).toHaveLength(1);
				expect(Boolean(rows[0].availableInMCP)).toBe(false);
			});
		});

		it('should default availableInMCP to false on inserts that omit it', async () => {
			await runSingleMigration(MIGRATION_NAME);
			dataSource = Container.get(DataSource);

			const projectId = randomUUID();
			const agentId = randomUUID();

			await withContext(async (context) => {
				await insertProject(context, projectId);
				await insertAgent(context, { id: agentId, projectId });

				const rows = await context.runQuery<Array<{ availableInMCP: boolean | number }>>(
					`SELECT "availableInMCP" FROM ${context.escape.tableName('agents')} WHERE "id" = :id`,
					{ id: agentId },
				);
				expect(Boolean(rows[0].availableInMCP)).toBe(false);
			});
		});

		it('should preserve rows in tables with CASCADE FKs to agents', async () => {
			// On SQLite the migration recreates `agents` (drop + rename), which
			// would cascade-delete child rows unless FKs are disabled for the
			// migration's duration (withFKsDisabled on the sqlite subclass).
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
				const agentRows = await context.runQuery<Array<{ id: string }>>(
					`SELECT "id" FROM ${context.escape.tableName('agents')} WHERE "id" = :id`,
					{ id: agentId },
				);
				expect(agentRows).toHaveLength(1);

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
				expect(await getColumnMeta(context, 'availableInMCP')).toBeUndefined();

				const historyRows = await context.runQuery<Array<{ versionId: string }>>(
					`SELECT "versionId" FROM ${context.escape.tableName('agent_history')} WHERE "agentId" = :id`,
					{ id: agentId },
				);
				expect(historyRows).toHaveLength(1);
			});
		});
	});
});
