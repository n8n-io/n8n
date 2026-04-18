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

const MIGRATION_NAME = 'AddExecutionDeduplicationKey1778000000000';

describe('AddExecutionDeduplicationKey Migration', () => {
	let dataSource: DataSource;

	beforeEach(async () => {
		const dbConnection = Container.get(DbConnection);
		await dbConnection.init();
		dataSource = Container.get(DataSource);
		const ctx = createTestMigrationContext(dataSource);
		await ctx.queryRunner.clearDatabase();
		await ctx.queryRunner.release();
		await initDbUpToMigration(MIGRATION_NAME);
	});

	afterEach(async () => {
		const dbConnection = Container.get(DbConnection);
		await dbConnection.close();
	});

	async function insertWorkflow(ctx: TestMigrationContext): Promise<string> {
		const table = ctx.escape.tableName('workflow_entity');
		const now = new Date();
		const id = randomUUID();
		await ctx.runQuery(
			`INSERT INTO ${table} (${ctx.escape.columnName('id')}, ${ctx.escape.columnName('name')}, ${ctx.escape.columnName('active')}, ${ctx.escape.columnName('nodes')}, ${ctx.escape.columnName('connections')}, ${ctx.escape.columnName('versionId')}, ${ctx.escape.columnName('createdAt')}, ${ctx.escape.columnName('updatedAt')}) VALUES (:id, :name, :active, :nodes, :connections, :versionId, :createdAt, :updatedAt)`,
			{
				id,
				name: `Workflow ${id}`,
				active: false,
				nodes: '[]',
				connections: '{}',
				versionId: randomUUID(),
				createdAt: now,
				updatedAt: now,
			},
		);
		return id;
	}

	async function insertExecution(
		ctx: TestMigrationContext,
		workflowId: string,
		deduplicationKey: string | null,
	): Promise<void> {
		const table = ctx.escape.tableName('execution_entity');
		const now = new Date();
		await ctx.runQuery(
			`INSERT INTO ${table} (${ctx.escape.columnName('finished')}, ${ctx.escape.columnName('mode')}, ${ctx.escape.columnName('status')}, ${ctx.escape.columnName('createdAt')}, ${ctx.escape.columnName('startedAt')}, ${ctx.escape.columnName('stoppedAt')}, ${ctx.escape.columnName('storedAt')}, ${ctx.escape.columnName('workflowId')}, ${ctx.escape.columnName('deduplicationKey')}) VALUES (:finished, :mode, :status, :createdAt, :startedAt, :stoppedAt, :storedAt, :workflowId, :deduplicationKey)`,
			{
				finished: false,
				mode: 'trigger',
				status: 'new',
				createdAt: now,
				startedAt: now,
				stoppedAt: now,
				storedAt: 'db',
				workflowId,
				deduplicationKey,
			},
		);
	}

	describe('up', () => {
		it('should add deduplicationKey as a nullable varchar(255) column', async () => {
			await runSingleMigration(MIGRATION_NAME);
			const ctx = createTestMigrationContext(dataSource);

			if (ctx.isSqlite) {
				const rows: Array<{
					name: string;
					type: string;
					notnull: number;
				}> = await ctx.queryRunner.query(
					`PRAGMA table_info(${ctx.escape.tableName('execution_entity')})`,
				);
				const column = rows.find((r) => r.name === 'deduplicationKey');
				expect(column).toBeDefined();
				expect(column?.notnull).toBe(0);
				expect(column?.type.toLowerCase()).toContain('varchar');
			} else {
				const rows: Array<{
					column_name: string;
					is_nullable: string;
					data_type: string;
					character_maximum_length: number | null;
				}> = await ctx.runQuery(
					'SELECT column_name, is_nullable, data_type, character_maximum_length FROM information_schema.columns WHERE table_name = :tableName AND column_name = :columnName',
					{
						tableName: `${ctx.tablePrefix}execution_entity`,
						columnName: 'deduplicationKey',
					},
				);
				expect(rows).toHaveLength(1);
				expect(rows[0].is_nullable).toBe('YES');
				expect(rows[0].data_type).toBe('character varying');
				expect(rows[0].character_maximum_length).toBe(255);
			}

			await ctx.queryRunner.release();
		});

		it('should create a unique index on deduplicationKey', async () => {
			await runSingleMigration(MIGRATION_NAME);
			const ctx = createTestMigrationContext(dataSource);
			const tableName = ctx.escape.tableName('execution_entity');

			if (ctx.isSqlite) {
				const indexes: Array<{ name: string; unique: number }> = await ctx.queryRunner.query(
					`PRAGMA index_list(${tableName})`,
				);
				const uniqueIndex = indexes.find(
					(idx) => idx.name.includes('deduplicationKey') && idx.unique === 1,
				);
				expect(uniqueIndex).toBeDefined();
			} else {
				const actualTableName = `${ctx.tablePrefix}execution_entity`;
				const rows: Array<{ indisunique: boolean }> = await ctx.runQuery(
					`SELECT ix.indisunique
					 FROM pg_class t
					 JOIN pg_index ix ON t.oid = ix.indrelid
					 JOIN pg_class i ON i.oid = ix.indexrelid
					 JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = ANY(ix.indkey)
					 WHERE t.relname = :tableName AND a.attname = :columnName`,
					{ tableName: actualTableName, columnName: 'deduplicationKey' },
				);
				expect(rows.length).toBeGreaterThan(0);
				expect(rows.some((r) => r.indisunique)).toBe(true);
			}

			await ctx.queryRunner.release();
		});

		it('should reject two rows with the same non-null deduplicationKey', async () => {
			await runSingleMigration(MIGRATION_NAME);
			const ctx = createTestMigrationContext(dataSource);
			const workflowId = await insertWorkflow(ctx);

			await insertExecution(ctx, workflowId, 'shared-key');
			await expect(insertExecution(ctx, workflowId, 'shared-key')).rejects.toThrow();

			await ctx.queryRunner.release();
		});

		it('should allow multiple rows with NULL deduplicationKey', async () => {
			await runSingleMigration(MIGRATION_NAME);
			const ctx = createTestMigrationContext(dataSource);
			const workflowId = await insertWorkflow(ctx);

			await insertExecution(ctx, workflowId, null);
			await insertExecution(ctx, workflowId, null);
			await insertExecution(ctx, workflowId, null);

			const rows: Array<{ count: string | number }> = await ctx.runQuery(
				`SELECT COUNT(*) AS count FROM ${ctx.escape.tableName('execution_entity')} WHERE ${ctx.escape.columnName('deduplicationKey')} IS NULL`,
			);
			expect(Number(rows[0].count)).toBe(3);

			await ctx.queryRunner.release();
		});
	});

	describe('down', () => {
		it('should drop the unique index and the deduplicationKey column', async () => {
			await runSingleMigration(MIGRATION_NAME);
			await undoLastSingleMigration();

			const ctx = createTestMigrationContext(dataSource);
			const tableName = ctx.escape.tableName('execution_entity');

			if (ctx.isSqlite) {
				const cols: Array<{ name: string }> = await ctx.queryRunner.query(
					`PRAGMA table_info(${tableName})`,
				);
				expect(cols.map((c) => c.name)).not.toContain('deduplicationKey');

				const indexes: Array<{ name: string }> = await ctx.queryRunner.query(
					`PRAGMA index_list(${tableName})`,
				);
				expect(indexes.some((i) => i.name.includes('deduplicationKey'))).toBe(false);
			} else {
				const colRows: Array<{ column_name: string }> = await ctx.runQuery(
					'SELECT column_name FROM information_schema.columns WHERE table_name = :tableName AND column_name = :columnName',
					{
						tableName: `${ctx.tablePrefix}execution_entity`,
						columnName: 'deduplicationKey',
					},
				);
				expect(colRows).toHaveLength(0);

				const idxRows: Array<{ indexname: string }> = await ctx.runQuery(
					`SELECT i.relname AS indexname
					 FROM pg_class t
					 JOIN pg_index ix ON t.oid = ix.indrelid
					 JOIN pg_class i ON i.oid = ix.indexrelid
					 JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = ANY(ix.indkey)
					 WHERE t.relname = :tableName AND a.attname = :columnName`,
					{
						tableName: `${ctx.tablePrefix}execution_entity`,
						columnName: 'deduplicationKey',
					},
				);
				expect(idxRows).toHaveLength(0);
			}

			await ctx.queryRunner.release();
		});
	});
});
