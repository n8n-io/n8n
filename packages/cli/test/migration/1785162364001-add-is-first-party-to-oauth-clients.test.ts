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
import { nanoid } from 'nanoid';
import { randomUUID } from 'node:crypto';

const MIGRATION_NAME = 'AddIsFirstPartyToOAuthClients1785162364001';

interface SqliteColumnInfo {
	name: string;
	notnull: number;
}

interface PgColumnInfo {
	column_name: string;
	is_nullable: string;
}

describe('AddIsFirstPartyToOAuthClients Migration', () => {
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

	async function insertUser(context: TestMigrationContext, id: string) {
		const table = context.escape.tableName('user');
		await context.runQuery(
			`INSERT INTO ${table} ("id", "email", "firstName", "lastName", "password", "roleSlug", "createdAt", "updatedAt")
			 VALUES (:id, :email, :firstName, :lastName, :password, :roleSlug, :createdAt, :updatedAt)`,
			{
				id,
				email: `${id}@test.com`,
				firstName: 'Test',
				lastName: 'User',
				password: 'hashed',
				roleSlug: 'global:member',
				createdAt: new Date(),
				updatedAt: new Date(),
			},
		);
	}

	async function insertClient(context: TestMigrationContext, id: string) {
		const table = context.escape.tableName('oauth_clients');
		await context.runQuery(
			`INSERT INTO ${table} ("id", "name", "redirectUris", "grantTypes", "createdAt", "updatedAt")
			 VALUES (:id, :name, :redirectUris, :grantTypes, :createdAt, :updatedAt)`,
			{
				id,
				name: 'Test Client',
				redirectUris: JSON.stringify(['https://example.com/callback']),
				grantTypes: JSON.stringify(['authorization_code']),
				createdAt: new Date(),
				updatedAt: new Date(),
			},
		);
	}

	async function insertRefreshToken(
		context: TestMigrationContext,
		token: string,
		clientId: string,
		userId: string,
	) {
		const table = context.escape.tableName('oauth_refresh_tokens');
		await context.runQuery(
			`INSERT INTO ${table} ("token", "clientId", "userId", "expiresAt", "createdAt", "updatedAt")
			 VALUES (:token, :clientId, :userId, :expiresAt, :createdAt, :updatedAt)`,
			{
				token,
				clientId,
				userId,
				expiresAt: Date.now() + 60_000,
				createdAt: new Date(),
				updatedAt: new Date(),
			},
		);
	}

	async function getColumnMeta(
		context: TestMigrationContext,
		table: string,
		columnName: string,
	): Promise<SqliteColumnInfo | PgColumnInfo | undefined> {
		if (context.isSqlite) {
			const rows = (await context.queryRunner.query(
				`PRAGMA table_info(${context.escape.tableName(table)})`,
			)) as SqliteColumnInfo[];
			return rows.find((r) => r.name === columnName);
		}
		const rows = (await context.queryRunner.query(
			'SELECT column_name, is_nullable FROM information_schema.columns WHERE table_name = $1 AND column_name = $2',
			[`${context.tablePrefix}${table}`, columnName],
		)) as PgColumnInfo[];
		return rows[0];
	}

	describe('up', () => {
		it('should add a NOT NULL isFirstParty column to oauth_clients', async () => {
			await runSingleMigration(MIGRATION_NAME);
			const context = createTestMigrationContext(dataSource);

			const col = await getColumnMeta(context, 'oauth_clients', 'isFirstParty');
			expect(col).toBeDefined();
			if (context.isSqlite) {
				expect((col as SqliteColumnInfo).notnull).toBe(1);
			} else {
				expect((col as PgColumnInfo).is_nullable).toBe('NO');
			}

			await context.queryRunner.release();
		});

		it('should preserve rows in tables that cascade from oauth_clients', async () => {
			// oauth_clients has inbound ON DELETE CASCADE FKs. On SQLite the column
			// add recreates the table (drop + rename); without disabling foreign
			// keys the drop would cascade and wipe referencing rows.
			const context = createTestMigrationContext(dataSource);
			const userId = randomUUID();
			const clientId = nanoid(16);
			const token = nanoid();
			await insertUser(context, userId);
			await insertClient(context, clientId);
			await insertRefreshToken(context, token, clientId, userId);
			await context.queryRunner.release();

			await runSingleMigration(MIGRATION_NAME);

			const postContext = createTestMigrationContext(dataSource);
			const table = postContext.escape.tableName('oauth_refresh_tokens');
			const rows: Array<{ token: string }> = await postContext.runQuery(
				`SELECT ${postContext.escape.columnName('token')} FROM ${table} WHERE ${postContext.escape.columnName('token')} = :token`,
				{ token },
			);
			expect(rows).toHaveLength(1);

			await postContext.queryRunner.release();
		});
	});

	describe('down', () => {
		it('should remove the isFirstParty column from oauth_clients', async () => {
			await runSingleMigration(MIGRATION_NAME);
			await undoLastSingleMigration();

			const context = createTestMigrationContext(dataSource);
			expect(await getColumnMeta(context, 'oauth_clients', 'isFirstParty')).toBeUndefined();
			await context.queryRunner.release();
		});
	});
});
