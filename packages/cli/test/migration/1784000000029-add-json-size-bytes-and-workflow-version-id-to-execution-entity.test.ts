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

const MIGRATION_NAME = 'AddJsonSizeBytesAndWorkflowVersionIdToExecutionEntity1784000000029';

interface SqliteColumnInfo {
	name: string;
	notnull: number;
	dflt_value: string | null;
}

interface PgColumnInfo {
	column_name: string;
	is_nullable: string;
	column_default: string | null;
}

describe('AddJsonSizeBytesAndWorkflowVersionIdToExecutionEntity Migration', () => {
	let dataSource: DataSource;

	beforeAll(async () => {
		const dbConnection = Container.get(DbConnection);
		await dbConnection.init();
		dataSource = Container.get(DataSource);
	});

	beforeEach(async () => {
		const context = createTestMigrationContext(dataSource);
		await context.queryRunner.clearDatabase();
		await context.queryRunner.release();
		await initDbUpToMigration(MIGRATION_NAME);
	});

	afterAll(async () => {
		const dbConnection = Container.get(DbConnection);
		await dbConnection.close();
	});

	async function getColumnMeta(
		context: TestMigrationContext,
		columnName: string,
	): Promise<SqliteColumnInfo | PgColumnInfo | undefined> {
		if (context.isSqlite) {
			const rows = (await context.queryRunner.query(
				`PRAGMA table_info(${context.escape.tableName('execution_entity')})`,
			)) as SqliteColumnInfo[];
			return rows.find((r) => r.name === columnName);
		}
		const rows = (await context.queryRunner.query(
			'SELECT column_name, is_nullable, column_default FROM information_schema.columns WHERE table_name = $1 AND column_name = $2',
			[`${context.tablePrefix}execution_entity`, columnName],
		)) as PgColumnInfo[];
		return rows[0];
	}

	function expectNullable(
		col: SqliteColumnInfo | PgColumnInfo | undefined,
		context: TestMigrationContext,
	) {
		expect(col).toBeDefined();
		if (context.isSqlite) {
			expect((col as SqliteColumnInfo).notnull).toBe(0);
		} else {
			expect((col as PgColumnInfo).is_nullable).toBe('YES');
		}
	}

	function expectNotNullDefaultZero(
		col: SqliteColumnInfo | PgColumnInfo | undefined,
		context: TestMigrationContext,
	) {
		expect(col).toBeDefined();
		if (context.isSqlite) {
			expect((col as SqliteColumnInfo).notnull).toBe(1);
			expect((col as SqliteColumnInfo).dflt_value).toContain('0');
		} else {
			expect((col as PgColumnInfo).is_nullable).toBe('NO');
			expect((col as PgColumnInfo).column_default).toContain('0');
		}
	}

	describe('up', () => {
		it('should add jsonSizeBytes as NOT NULL default 0 and workflowVersionId as nullable', async () => {
			await runSingleMigration(MIGRATION_NAME);
			const context = createTestMigrationContext(dataSource);

			expectNotNullDefaultZero(await getColumnMeta(context, 'jsonSizeBytes'), context);
			expectNullable(await getColumnMeta(context, 'workflowVersionId'), context);

			await context.queryRunner.release();
		});

		it('should set a column comment on jsonSizeBytes (Postgres only)', async () => {
			await runSingleMigration(MIGRATION_NAME);
			const context = createTestMigrationContext(dataSource);

			// SQLite has no column comments; only assert on Postgres.
			if (!context.isPostgres) {
				await context.queryRunner.release();
				return;
			}

			const rows = (await context.queryRunner.query(
				`SELECT pgd.description
				 FROM pg_description pgd
				 JOIN pg_class c ON c.oid = pgd.objoid
				 JOIN pg_attribute a ON a.attrelid = c.oid AND a.attnum = pgd.objsubid
				 WHERE c.relname = $1 AND a.attname = $2`,
				[`${context.tablePrefix}execution_entity`, 'jsonSizeBytes'],
			)) as Array<{ description: string }>;

			expect(rows[0]?.description).toContain('excludes binary data');

			await context.queryRunner.release();
		});
	});

	describe('down', () => {
		it('should remove both columns', async () => {
			await runSingleMigration(MIGRATION_NAME);
			await undoLastSingleMigration();

			const context = createTestMigrationContext(dataSource);
			expect(await getColumnMeta(context, 'jsonSizeBytes')).toBeUndefined();
			expect(await getColumnMeta(context, 'workflowVersionId')).toBeUndefined();
			await context.queryRunner.release();
		});
	});
});
