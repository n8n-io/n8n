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

const MIGRATION_NAME = 'AddWakeColumnsToAgentBackgroundJob1788527465971';
const COLUMNS = ['notifiedAt', 'parentResourceId', 'parentPrincipalHash'] as const;

describe('AddWakeColumnsToAgentBackgroundJob migration', () => {
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
		await withContext(async (context) => await context.queryRunner.clearDatabase());
		await initDbUpToMigration(MIGRATION_NAME);
	});

	afterAll(async () => {
		await Container.get(DbConnection).close();
	});

	async function seedAgent(): Promise<string> {
		const projectId = randomUUID();
		const agentId = randomUUID();
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
		});
		return agentId;
	}

	/** A row in the pre-migration shape, without parent identity. */
	async function seedLegacyJob(agentId: string): Promise<string> {
		const jobId = randomUUID();
		const now = new Date();
		await withContext(async ({ escape, runQuery }) => {
			await runQuery(
				`INSERT INTO ${escape.tableName('agent_background_job')}
				   ("id", "kind", "status", "parentAgentId", "parentThreadId", "title", "subAgentId", "childThreadId", "settledAt", "createdAt", "updatedAt")
				 VALUES (:jobId, 'subagent', 'completed', :agentId, 'thread-1', 'Research', :subAgentId, 'child-thread-1', :now, :now, :now)`,
				{ jobId, agentId, subAgentId: randomUUID(), now },
			);
		});
		return jobId;
	}

	/** A row in the post-migration shape, with parent identity. */
	async function seedJob(agentId: string, parentResourceId = 'draft-chat:user-1'): Promise<string> {
		const jobId = randomUUID();
		const now = new Date();
		await withContext(async ({ escape, runQuery }) => {
			await runQuery(
				`INSERT INTO ${escape.tableName('agent_background_job')}
				   ("id", "kind", "status", "parentAgentId", "parentThreadId", "parentResourceId", "parentPrincipalHash", "title", "subAgentId", "childThreadId", "settledAt", "createdAt", "updatedAt")
				 VALUES (:jobId, 'subagent', 'completed', :agentId, 'thread-1', :parentResourceId, 'principal-hash', 'Research', :subAgentId, 'child-thread-1', :now, :now, :now)`,
				{ jobId, agentId, parentResourceId, subAgentId: randomUUID(), now },
			);
		});
		return jobId;
	}

	async function columnMetadata(context: TestMigrationContext) {
		if (context.isSqlite) {
			const rows: Array<{ name: string; notnull: number; type: string }> =
				await context.queryRunner.query(
					`PRAGMA table_info(${context.escape.tableName('agent_background_job')})`,
				);
			return rows.map((row) => ({
				name: row.name,
				nullable: row.notnull === 0,
				width: row.type,
			}));
		}
		const rows: Array<{
			column_name: string;
			is_nullable: string;
			character_maximum_length: number | null;
		}> = await context.queryRunner.query(
			' SELECT column_name, is_nullable, character_maximum_length FROM information_schema.columns WHERE table_name = $1',
			[`${context.tablePrefix}agent_background_job`],
		);
		return rows.map((row) => ({
			name: row.column_name,
			nullable: row.is_nullable === 'YES',
			width: row.character_maximum_length,
		}));
	}

	async function indexDefinitions(context: TestMigrationContext): Promise<string[]> {
		if (context.isSqlite) {
			const rows = (await context.queryRunner.query(
				`SELECT sql FROM sqlite_master WHERE type = 'index' AND tbl_name = ${context.escape.tableName('agent_background_job')}`,
			)) as Array<{ sql: string | null }>;
			return rows.map((row) => row.sql ?? '');
		}
		const rows = (await context.queryRunner.query(
			'SELECT indexdef FROM pg_indexes WHERE tablename = $1',
			[`${context.tablePrefix}agent_background_job`],
		)) as Array<{ indexdef: string }>;
		return rows.map((row) => row.indexdef);
	}

	async function countJobs(context: TestMigrationContext): Promise<number> {
		const rows = await context.runQuery<Array<{ count: number | string }>>(
			`SELECT COUNT(*) AS "count" FROM ${context.escape.tableName('agent_background_job')}`,
		);
		return Number(rows[0]?.count ?? 0);
	}

	it('adds the columns and removes rows that carry no parent identity', async () => {
		const agentId = await seedAgent();
		await seedLegacyJob(agentId);
		await runSingleMigration(MIGRATION_NAME);
		dataSource = Container.get(DataSource);

		await withContext(async (context) => {
			expect(await countJobs(context)).toBe(0);

			const columns = await columnMetadata(context);
			const byName = new Map(columns.map((column) => [column.name, column]));
			for (const name of COLUMNS) expect(byName.has(name)).toBe(true);

			expect(byName.get('notifiedAt')?.nullable).toBe(true);
			expect(byName.get('parentResourceId')).toMatchObject({
				nullable: false,
				width: context.isSqlite ? 'varchar(255)' : 255,
			});
			expect(byName.get('parentPrincipalHash')).toMatchObject({
				nullable: false,
				width: context.isSqlite ? 'varchar(64)' : 64,
			});

			// The table is recreated on SQLite; the partial unique index that keeps
			// one tracker per workflow execution must survive, and the pending-mail
			// index must exist.
			const indexes = await indexDefinitions(context);
			expect(
				indexes.some(
					(definition) =>
						/UNIQUE/i.test(definition) &&
						definition.includes('childExecutionId') &&
						/IS NOT NULL/i.test(definition),
				),
			).toBe(true);
			expect(
				indexes.some(
					(definition) =>
						definition.includes('parentThreadId') && /notifiedAt.*IS NULL/i.test(definition),
				),
			).toBe(true);
		});
	});

	it('accepts a 255-character resource id and rejects a missing identity', async () => {
		const agentId = await seedAgent();
		await runSingleMigration(MIGRATION_NAME);
		dataSource = Container.get(DataSource);

		const jobId = await seedJob(agentId, 'r'.repeat(255));
		await withContext(async ({ escape, runQuery }) => {
			const rows = await runQuery<Array<{ parentResourceId: string }>>(
				`SELECT "parentResourceId" FROM ${escape.tableName('agent_background_job')} WHERE "id" = :jobId`,
				{ jobId },
			);
			expect(rows[0]?.parentResourceId).toHaveLength(255);
		});

		await expect(seedLegacyJob(agentId)).rejects.toThrow();
	});

	it('drops the columns and preserves existing jobs', async () => {
		const agentId = await seedAgent();
		await runSingleMigration(MIGRATION_NAME);
		dataSource = Container.get(DataSource);
		const jobId = await seedJob(agentId);

		await undoLastSingleMigration();
		dataSource = Container.get(DataSource);

		await withContext(async (context) => {
			const columns = await columnMetadata(context);
			for (const name of COLUMNS) {
				expect(columns.some((column) => column.name === name)).toBe(false);
			}
			const rows = await context.runQuery<Array<{ id: string }>>(
				`SELECT "id" FROM ${context.escape.tableName('agent_background_job')} WHERE "id" = :jobId`,
				{ jobId },
			);
			expect(rows).toEqual([{ id: jobId }]);
			const indexes = await indexDefinitions(context);
			expect(indexes.some((definition) => definition.includes('notifiedAt'))).toBe(false);
		});
	});
});
