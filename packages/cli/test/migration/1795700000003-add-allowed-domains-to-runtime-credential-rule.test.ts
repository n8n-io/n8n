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

const MIGRATION_NAME = 'AddAllowedDomainsToRuntimeCredentialRule1795700000003';
const TABLE = 'runtime_credential_rule';

describe('AddAllowedDomainsToRuntimeCredentialRule migration', () => {
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

	async function columnNames(context: TestMigrationContext): Promise<string[]> {
		if (context.isSqlite) {
			const rows: Array<{ name: string }> = await context.queryRunner.query(
				`PRAGMA table_info(${context.escape.tableName(TABLE)})`,
			);
			return rows.map((row) => row.name);
		}
		const rows: Array<{ column_name: string }> = await context.queryRunner.query(
			'SELECT column_name FROM information_schema.columns WHERE table_name = $1',
			[`${context.tablePrefix}${TABLE}`],
		);
		return rows.map((row) => row.column_name);
	}

	async function insertRule(context: TestMigrationContext, alias: string): Promise<void> {
		const now = new Date();
		await context.runQuery(
			`INSERT INTO ${context.escape.tableName(TABLE)}
			   ("alias", "nodeType", "path", "credentialType", "transform", "createdAt", "updatedAt")
			 VALUES (:alias, 'n8n-nodes-base.webhook', 'headers.authorization', 'httpHeaderAuth', 'bearer', :now, :now)`,
			{ alias, now },
		);
	}

	async function readAllowedDomains(
		context: TestMigrationContext,
		alias: string,
	): Promise<string | null> {
		const rows = await context.runQuery<Array<{ allowedDomains: string | null }>>(
			`SELECT "allowedDomains" FROM ${context.escape.tableName(TABLE)} WHERE "alias" = :alias`,
			{ alias },
		);
		return rows[0].allowedDomains;
	}

	it('adds a nullable allowedDomains column and keeps existing rules unrestricted', async () => {
		await withContext(async (context) => await insertRule(context, 'before'));

		await runSingleMigration(MIGRATION_NAME);
		dataSource = Container.get(DataSource);

		await withContext(async (context) => {
			expect(await columnNames(context)).toContain('allowedDomains');
			expect(await readAllowedDomains(context, 'before')).toBeNull();
		});
	});

	it('stores a list of domains', async () => {
		await runSingleMigration(MIGRATION_NAME);
		dataSource = Container.get(DataSource);

		await withContext(async (context) => {
			await insertRule(context, 'after');
			await context.runQuery(
				`UPDATE ${context.escape.tableName(TABLE)} SET "allowedDomains" = :value WHERE "alias" = :alias`,
				{ value: 'api.example.com, *.example.org', alias: 'after' },
			);
			expect(await readAllowedDomains(context, 'after')).toBe('api.example.com, *.example.org');
		});
	});

	it('drops the column on down, keeps the rows, and applies again cleanly', async () => {
		await withContext(async (context) => await insertRule(context, 'kept'));
		await runSingleMigration(MIGRATION_NAME);
		dataSource = Container.get(DataSource);

		await undoLastSingleMigration();
		dataSource = Container.get(DataSource);

		await withContext(async (context) => {
			expect(await columnNames(context)).not.toContain('allowedDomains');
			const rows = await context.runQuery<Array<{ alias: string }>>(
				`SELECT "alias" FROM ${context.escape.tableName(TABLE)}`,
			);
			expect(rows).toEqual([{ alias: 'kept' }]);
		});

		await runSingleMigration(MIGRATION_NAME);
		dataSource = Container.get(DataSource);

		await withContext(async (context) => {
			expect(await columnNames(context)).toContain('allowedDomains');
		});
	});
});
