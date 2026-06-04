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

const MIGRATION_NAME = 'AddResourceToOAuthAuthorizationCodes1784000000024';

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

describe('AddResourceToOAuthAuthorizationCodes Migration', () => {
	let dataSource: DataSource;
	jest.setTimeout(20_000);

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

	async function insertUser(context: TestMigrationContext, id: string): Promise<void> {
		const tableName = context.escape.tableName('user');
		await context.runQuery(
			`INSERT INTO ${tableName} ("id", "email", "firstName", "lastName", "password", "roleSlug", "createdAt", "updatedAt")
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

	async function insertClient(context: TestMigrationContext, id: string): Promise<void> {
		const tableName = context.escape.tableName('oauth_clients');
		await context.runQuery(
			`INSERT INTO ${tableName} ("id", "name", "redirectUris", "grantTypes", "createdAt", "updatedAt")
			 VALUES (:id, :name, :redirectUris, :grantTypes, :createdAt, :updatedAt)`,
			{
				id,
				name: 'Test Client',
				redirectUris: JSON.stringify(['http://localhost']),
				grantTypes: JSON.stringify(['authorization_code']),
				createdAt: new Date(),
				updatedAt: new Date(),
			},
		);
	}

	async function insertAuthCode(
		context: TestMigrationContext,
		code: string,
		clientId: string,
		userId: string,
	): Promise<void> {
		const tableName = context.escape.tableName('oauth_authorization_codes');
		await context.runQuery(
			`INSERT INTO ${tableName} ("code", "clientId", "userId", "redirectUri", "codeChallenge", "codeChallengeMethod", "expiresAt", "used", "createdAt", "updatedAt")
			 VALUES (:code, :clientId, :userId, :redirectUri, :codeChallenge, :codeChallengeMethod, :expiresAt, :used, :createdAt, :updatedAt)`,
			{
				code,
				clientId,
				userId,
				redirectUri: 'http://localhost',
				codeChallenge: 'challenge',
				codeChallengeMethod: 'S256',
				expiresAt: Date.now() + 60000,
				used: false,
				createdAt: new Date(),
				updatedAt: new Date(),
			},
		);
	}

	async function getColumnMeta(
		context: TestMigrationContext,
		columnName: string,
	): Promise<SqliteColumnInfo | PgColumnInfo | undefined> {
		if (context.isSqlite) {
			const rows = (await context.queryRunner.query(
				`PRAGMA table_info(${context.escape.tableName('oauth_authorization_codes')})`,
			)) as SqliteColumnInfo[];
			return rows.find((r) => r.name === columnName);
		}
		const rows = (await context.queryRunner.query(
			'SELECT column_name, is_nullable, column_default FROM information_schema.columns WHERE table_name = $1 AND column_name = $2',
			[`${context.tablePrefix}oauth_authorization_codes`, columnName],
		)) as PgColumnInfo[];
		return rows[0];
	}

	describe('up', () => {
		it('should add resource column as nullable', async () => {
			await withContext(async (context) => {
				const colBefore = await getColumnMeta(context, 'resource');
				expect(colBefore).toBeUndefined();
			});

			await runSingleMigration(MIGRATION_NAME);
			dataSource = Container.get(DataSource);

			await withContext(async (context) => {
				const col = await getColumnMeta(context, 'resource');
				expect(col).toBeDefined();
				if (context.isSqlite) {
					expect((col as SqliteColumnInfo).notnull).toBe(0);
				} else {
					expect((col as PgColumnInfo).is_nullable).toBe('YES');
				}
			});
		});

		it('should default to NULL for existing rows', async () => {
			const userId = randomUUID();
			const clientId = randomUUID();
			const code = 'test-auth-code';

			await withContext(async (context) => {
				await insertUser(context, userId);
				await insertClient(context, clientId);
				await insertAuthCode(context, code, clientId, userId);
			});

			await runSingleMigration(MIGRATION_NAME);
			dataSource = Container.get(DataSource);

			await withContext(async (context) => {
				const tableName = context.escape.tableName('oauth_authorization_codes');
				const rows = await context.runQuery<Array<{ resource: string | null }>>(
					`SELECT "resource" FROM ${tableName} WHERE "code" = :code`,
					{ code },
				);
				expect(rows).toHaveLength(1);
				expect(rows[0].resource).toBeNull();
			});
		});

		it('should support inserting with a resource value post-migration', async () => {
			const userId = randomUUID();
			const clientId = randomUUID();
			const code = 'new-auth-code';
			const testResource = 'https://n8n.example.com/mcp-server/http';

			await withContext(async (context) => {
				await insertUser(context, userId);
				await insertClient(context, clientId);
			});

			await runSingleMigration(MIGRATION_NAME);
			dataSource = Container.get(DataSource);

			await withContext(async (context) => {
				const tableName = context.escape.tableName('oauth_authorization_codes');
				await context.runQuery(
					`INSERT INTO ${tableName} ("code", "clientId", "userId", "redirectUri", "codeChallenge", "codeChallengeMethod", "expiresAt", "used", "resource", "createdAt", "updatedAt")
					 VALUES (:code, :clientId, :userId, :redirectUri, :codeChallenge, :codeChallengeMethod, :expiresAt, :used, :resource, :createdAt, :updatedAt)`,
					{
						code,
						clientId,
						userId,
						redirectUri: 'http://localhost',
						codeChallenge: 'challenge',
						codeChallengeMethod: 'S256',
						expiresAt: Date.now() + 60000,
						used: false,
						resource: testResource,
						createdAt: new Date(),
						updatedAt: new Date(),
					},
				);

				const rows = await context.runQuery<Array<{ resource: string | null }>>(
					`SELECT "resource" FROM ${tableName} WHERE "code" = :code`,
					{ code },
				);
				expect(rows).toHaveLength(1);
				expect(rows[0].resource).toBe(testResource);
			});
		});
	});

	describe('down', () => {
		it('should drop the resource column', async () => {
			await runSingleMigration(MIGRATION_NAME);
			await undoLastSingleMigration();
			dataSource = Container.get(DataSource);

			await withContext(async (context) => {
				const col = await getColumnMeta(context, 'resource');
				expect(col).toBeUndefined();
			});
		});
	});
});
