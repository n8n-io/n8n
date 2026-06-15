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
import { jsonParse } from 'n8n-workflow';
import { nanoid } from 'nanoid';
import { randomUUID } from 'node:crypto';

const MIGRATION_NAME = 'AddScopeColumnToOAuthTables1784000000026';

const LEGACY_SCOPES = ['tool:listWorkflows', 'tool:getWorkflowDetails'];

interface SqliteColumnInfo {
	name: string;
	notnull: number;
}

interface PgColumnInfo {
	column_name: string;
	is_nullable: string;
}

describe('AddScopeColumnToOAuthTables Migration', () => {
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

	async function insertAuthorizationCode(
		context: TestMigrationContext,
		code: string,
		clientId: string,
		userId: string,
	) {
		const table = context.escape.tableName('oauth_authorization_codes');
		await context.runQuery(
			`INSERT INTO ${table} ("code", "clientId", "userId", "redirectUri", "codeChallenge", "codeChallengeMethod", "expiresAt", "createdAt", "updatedAt")
			 VALUES (:code, :clientId, :userId, :redirectUri, :codeChallenge, :codeChallengeMethod, :expiresAt, :createdAt, :updatedAt)`,
			{
				code,
				clientId,
				userId,
				redirectUri: 'https://example.com/callback',
				codeChallenge: 'challenge',
				codeChallengeMethod: 'S256',
				expiresAt: Date.now() + 60_000,
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

	function readScope(raw: string | string[] | null): string[] | null {
		if (raw === null) return null;
		return typeof raw === 'string' ? jsonParse<string[]>(raw) : raw;
	}

	describe('up', () => {
		it('should add a NOT NULL scope column to both OAuth tables', async () => {
			await runSingleMigration(MIGRATION_NAME);
			const context = createTestMigrationContext(dataSource);

			for (const table of ['oauth_authorization_codes', 'oauth_refresh_tokens']) {
				const col = await getColumnMeta(context, table, 'scope');
				expect(col).toBeDefined();
				if (context.isSqlite) {
					expect((col as SqliteColumnInfo).notnull).toBe(1);
				} else {
					expect((col as PgColumnInfo).is_nullable).toBe('NO');
				}
			}

			await context.queryRunner.release();
		});

		it('should apply the default scopes to existing authorization codes', async () => {
			const context = createTestMigrationContext(dataSource);
			const userId = randomUUID();
			const clientId = nanoid(16);
			const code = nanoid();
			await insertUser(context, userId);
			await insertClient(context, clientId);
			await insertAuthorizationCode(context, code, clientId, userId);
			await context.queryRunner.release();

			await runSingleMigration(MIGRATION_NAME);

			const postContext = createTestMigrationContext(dataSource);
			const table = postContext.escape.tableName('oauth_authorization_codes');
			const rows: Array<{ scope: string | string[] | null }> = await postContext.runQuery(
				`SELECT ${postContext.escape.columnName('scope')} FROM ${table} WHERE ${postContext.escape.columnName('code')} = :code`,
				{ code },
			);
			expect(readScope(rows[0].scope)).toEqual(LEGACY_SCOPES);

			await postContext.queryRunner.release();
		});

		it('should apply the default scopes to existing refresh tokens', async () => {
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
			const rows: Array<{ scope: string | string[] | null }> = await postContext.runQuery(
				`SELECT ${postContext.escape.columnName('scope')} FROM ${table} WHERE ${postContext.escape.columnName('token')} = :token`,
				{ token },
			);
			expect(readScope(rows[0].scope)).toEqual(LEGACY_SCOPES);

			await postContext.queryRunner.release();
		});
	});

	describe('down', () => {
		it('should remove the scope column from both OAuth tables', async () => {
			await runSingleMigration(MIGRATION_NAME);
			await undoLastSingleMigration();

			const context = createTestMigrationContext(dataSource);
			expect(await getColumnMeta(context, 'oauth_authorization_codes', 'scope')).toBeUndefined();
			expect(await getColumnMeta(context, 'oauth_refresh_tokens', 'scope')).toBeUndefined();
			await context.queryRunner.release();
		});
	});
});
