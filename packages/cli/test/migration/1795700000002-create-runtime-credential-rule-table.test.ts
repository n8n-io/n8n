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

const MIGRATION_NAME = 'CreateRuntimeCredentialRuleTable1795700000002';
const TABLE = 'runtime_credential_rule';

describe('CreateRuntimeCredentialRuleTable migration', () => {
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

	async function seedCredential(): Promise<string> {
		const credentialId = randomUUID();
		const now = new Date();
		await withContext(async ({ escape, runQuery }) => {
			await runQuery(
				`INSERT INTO ${escape.tableName('credentials_entity')}
				   ("id", "name", "data", "type", "createdAt", "updatedAt")
				 VALUES (:credentialId, 'Reporting DB', 'encrypted', 'testApi', :now, :now)`,
				{ credentialId, now },
			);
		});
		return credentialId;
	}

	async function countCredentials(context: TestMigrationContext, id: string): Promise<number> {
		const rows = await context.runQuery<Array<{ count: number | string }>>(
			`SELECT COUNT(*) AS "count" FROM ${context.escape.tableName('credentials_entity')} WHERE "id" = :id`,
			{ id },
		);
		return Number(rows[0]?.count ?? 0);
	}

	async function tableExists(context: TestMigrationContext): Promise<boolean> {
		if (context.isSqlite) {
			const rows: unknown[] = await context.queryRunner.query(
				"SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?",
				[`${context.tablePrefix}${TABLE}`],
			);
			return rows.length > 0;
		}
		const rows: unknown[] = await context.queryRunner.query(
			'SELECT table_name FROM information_schema.tables WHERE table_name = $1',
			[`${context.tablePrefix}${TABLE}`],
		);
		return rows.length > 0;
	}

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

	async function insertRule(
		context: TestMigrationContext,
		alias: string,
		transform: string | null,
	): Promise<void> {
		const now = new Date();
		await context.runQuery(
			`INSERT INTO ${context.escape.tableName(TABLE)}
			   ("alias", "nodeType", "path", "credentialType", "transform", "createdAt", "updatedAt")
			 VALUES (:alias, 'n8n-nodes-base.webhook', 'headers.authorization', 'httpHeaderAuth', :transform, :now, :now)`,
			{ alias, transform, now },
		);
	}

	it('creates the table with the expected columns', async () => {
		await runSingleMigration(MIGRATION_NAME);
		dataSource = Container.get(DataSource);

		await withContext(async (context) => {
			expect(await tableExists(context)).toBe(true);
			expect(await columnNames(context)).toEqual(
				expect.arrayContaining([
					'id',
					'alias',
					'nodeType',
					'path',
					'credentialType',
					'transform',
					'createdAt',
					'updatedAt',
				]),
			);
		});
	});

	it('inserts and reads a rule with a generated id', async () => {
		await runSingleMigration(MIGRATION_NAME);
		dataSource = Container.get(DataSource);

		await withContext(async (context) => {
			await insertRule(context, 'crm', 'bearer');

			const rows = await context.runQuery<
				Array<{ id: number | string; alias: string; nodeType: string; transform: string | null }>
			>(
				`SELECT "id", "alias", "nodeType", "transform" FROM ${context.escape.tableName(TABLE)} WHERE "alias" = :alias`,
				{ alias: 'crm' },
			);
			expect(rows).toHaveLength(1);
			expect(Number(rows[0].id)).toBeGreaterThan(0);
			expect(rows[0].nodeType).toBe('n8n-nodes-base.webhook');
			expect(rows[0].transform).toBe('bearer');
		});
	});

	it('accepts a null transform', async () => {
		await runSingleMigration(MIGRATION_NAME);
		dataSource = Container.get(DataSource);

		await withContext(async (context) => {
			await insertRule(context, 'no-transform', null);

			const rows = await context.runQuery<Array<{ transform: string | null }>>(
				`SELECT "transform" FROM ${context.escape.tableName(TABLE)} WHERE "alias" = :alias`,
				{ alias: 'no-transform' },
			);
			expect(rows).toEqual([{ transform: null }]);
		});
	});

	it('rejects a duplicate alias', async () => {
		await runSingleMigration(MIGRATION_NAME);
		dataSource = Container.get(DataSource);

		await withContext(async (context) => {
			await insertRule(context, 'crm', 'bearer');
			await expect(insertRule(context, 'crm', null)).rejects.toThrow();
		});
	});

	it('drops the table on down and applies again cleanly', async () => {
		await runSingleMigration(MIGRATION_NAME);
		dataSource = Container.get(DataSource);

		await undoLastSingleMigration();
		dataSource = Container.get(DataSource);

		await withContext(async (context) => {
			expect(await tableExists(context)).toBe(false);
		});

		await runSingleMigration(MIGRATION_NAME);
		dataSource = Container.get(DataSource);

		await withContext(async (context) => {
			expect(await tableExists(context)).toBe(true);
		});
	});

	it('leaves credentials untouched on up and down', async () => {
		const credentialId = await seedCredential();

		await runSingleMigration(MIGRATION_NAME);
		dataSource = Container.get(DataSource);
		await withContext(async (context) => {
			expect(await countCredentials(context, credentialId)).toBe(1);
		});

		await undoLastSingleMigration();
		dataSource = Container.get(DataSource);
		await withContext(async (context) => {
			expect(await countCredentials(context, credentialId)).toBe(1);
		});
	});
});
