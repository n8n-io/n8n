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

const MIGRATION_NAME = 'AddWakeColumnsToAgentBackgroundJob1788332569510';
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

	async function seedLegacyJob(): Promise<string> {
		const projectId = randomUUID();
		const agentId = randomUUID();
		const jobId = randomUUID();
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
				`INSERT INTO ${escape.tableName('agent_background_job')}
				   ("id", "kind", "status", "parentAgentId", "parentThreadId", "title", "subAgentId", "childThreadId", "settledAt", "createdAt", "updatedAt")
				 VALUES (:jobId, 'subagent', 'completed', :agentId, 'thread-1', 'Research', :subAgentId, 'child-thread-1', :now, :now, :now)`,
				{ jobId, agentId, subAgentId: randomUUID(), now },
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
			return rows;
		}
		const rows: Array<{
			column_name: string;
			is_nullable: string;
			character_maximum_length: number | null;
		}> = await context.queryRunner.query(
			' SELECT column_name, is_nullable, character_maximum_length FROM information_schema.columns WHERE table_name = $1',
			[`${context.tablePrefix}agent_background_job`],
		);
		return rows;
	}

	it('adds nullable columns and preserves legacy rows', async () => {
		const jobId = await seedLegacyJob();
		await runSingleMigration(MIGRATION_NAME);
		dataSource = Container.get(DataSource);

		await withContext(async (context) => {
			const columns = await columnMetadata(context);
			for (const name of COLUMNS) {
				const column = columns.find((entry) =>
					context.isSqlite
						? Reflect.get(entry, 'name') === name
						: Reflect.get(entry, 'column_name') === name,
				);
				expect(column).toBeDefined();
				if (!column) throw new Error(`Missing ${name} column`);
				expect(
					context.isSqlite ? Reflect.get(column, 'notnull') : Reflect.get(column, 'is_nullable'),
				).toBe(context.isSqlite ? 0 : 'YES');
			}

			const rows = await context.runQuery<
				Array<{
					notifiedAt: Date | null;
					parentResourceId: string | null;
					parentPrincipalHash: string | null;
				}>
			>(
				`SELECT "notifiedAt", "parentResourceId", "parentPrincipalHash"
				 FROM ${context.escape.tableName('agent_background_job')} WHERE "id" = :jobId`,
				{ jobId },
			);
			expect(rows).toEqual([
				{ notifiedAt: null, parentResourceId: null, parentPrincipalHash: null },
			]);
		});
	});

	it('accepts a 255-character resource id', async () => {
		const jobId = await seedLegacyJob();
		await runSingleMigration(MIGRATION_NAME);
		dataSource = Container.get(DataSource);
		const resourceId = 'r'.repeat(255);

		await withContext(async ({ escape, runQuery }) => {
			await runQuery(
				`UPDATE ${escape.tableName('agent_background_job')} SET "parentResourceId" = :resourceId WHERE "id" = :jobId`,
				{ resourceId, jobId },
			);
			const rows = await runQuery<Array<{ parentResourceId: string }>>(
				`SELECT "parentResourceId" FROM ${escape.tableName('agent_background_job')} WHERE "id" = :jobId`,
				{ jobId },
			);
			expect(rows[0]?.parentResourceId).toHaveLength(255);
		});
	});

	it('drops the columns and preserves existing jobs', async () => {
		const jobId = await seedLegacyJob();
		await runSingleMigration(MIGRATION_NAME);
		await undoLastSingleMigration();
		dataSource = Container.get(DataSource);

		await withContext(async (context) => {
			const columns = await columnMetadata(context);
			for (const name of COLUMNS) {
				expect(
					columns.some((entry) =>
						context.isSqlite
							? Reflect.get(entry, 'name') === name
							: Reflect.get(entry, 'column_name') === name,
					),
				).toBe(false);
			}
			const rows = await context.runQuery<Array<{ id: string }>>(
				`SELECT "id" FROM ${context.escape.tableName('agent_background_job')} WHERE "id" = :jobId`,
				{ jobId },
			);
			expect(rows).toEqual([{ id: jobId }]);
		});
	});
});
