import {
	createTestMigrationContext,
	initDbUpToMigration,
	runSingleMigration,
	type TestMigrationContext,
} from '@n8n/backend-test-utils';
import { DbConnection } from '@n8n/db';
import { Container } from '@n8n/di';
import { DataSource } from '@n8n/typeorm';
import { jsonParse } from 'n8n-workflow';

const MIGRATION_NAME = 'BackfillPreScopingOAuthGrantScopes1784000000047';

// Must match the frozen launch scope set inlined in the migration.
const FULL_SCOPES = [
	'workflow:read',
	'workflow:write',
	'workflow:execute',
	'execution:read',
	'credential:read',
	'dataTable:read',
	'dataTable:write',
	'project:read',
	'tag:read',
];

// user.id is uuid on Postgres, so the fixture id must be a valid UUID.
const USER_ID = 'b3e7a9c1-4f2d-4e8b-9a6c-1d2e3f4a5b6c';
const CLIENT_ID = 'migration-test-client';

describe('BackfillPreScopingOAuthGrantScopes Migration', () => {
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

	async function seedUserAndClient(context: TestMigrationContext): Promise<void> {
		const userTable = context.escape.tableName('user');
		await context.runQuery(`INSERT INTO ${userTable} (id, email) VALUES (:id, :email)`, {
			id: USER_ID,
			email: 'migration-test@example.com',
		});

		const clientTable = context.escape.tableName('oauth_clients');
		const redirectUris = context.escape.columnName('redirectUris');
		const grantTypes = context.escape.columnName('grantTypes');
		await context.runQuery(
			`INSERT INTO ${clientTable} (id, name, ${redirectUris}, ${grantTypes}) VALUES (:id, :name, :redirectUris, :grantTypes)`,
			{
				id: CLIENT_ID,
				name: 'Migration Test Client',
				redirectUris: JSON.stringify(['https://example.com/callback']),
				grantTypes: JSON.stringify(['authorization_code', 'refresh_token']),
			},
		);
	}

	/** Omitting `scope` makes the column default apply — exactly how pre-scoping rows were created. */
	async function insertRefreshToken(
		context: TestMigrationContext,
		token: string,
		scope?: string,
	): Promise<void> {
		const table = context.escape.tableName('oauth_refresh_tokens');
		const clientId = context.escape.columnName('clientId');
		const userId = context.escape.columnName('userId');
		const expiresAt = context.escape.columnName('expiresAt');
		const columns = `token, ${clientId}, ${userId}, ${expiresAt}`;
		if (scope === undefined) {
			await context.runQuery(
				`INSERT INTO ${table} (${columns}) VALUES (:token, :clientId, :userId, :expiresAt)`,
				{ token, clientId: CLIENT_ID, userId: USER_ID, expiresAt: 4102444800000 },
			);
		} else {
			await context.runQuery(
				`INSERT INTO ${table} (${columns}, scope) VALUES (:token, :clientId, :userId, :expiresAt, :scope)`,
				{ token, clientId: CLIENT_ID, userId: USER_ID, expiresAt: 4102444800000, scope },
			);
		}
	}

	async function insertAuthorizationCode(
		context: TestMigrationContext,
		code: string,
		scope?: string,
	): Promise<void> {
		const table = context.escape.tableName('oauth_authorization_codes');
		const clientId = context.escape.columnName('clientId');
		const userId = context.escape.columnName('userId');
		const redirectUri = context.escape.columnName('redirectUri');
		const codeChallenge = context.escape.columnName('codeChallenge');
		const codeChallengeMethod = context.escape.columnName('codeChallengeMethod');
		const expiresAt = context.escape.columnName('expiresAt');
		const columns = `code, ${clientId}, ${userId}, ${redirectUri}, ${codeChallenge}, ${codeChallengeMethod}, ${expiresAt}`;
		const parameters = {
			code,
			clientId: CLIENT_ID,
			userId: USER_ID,
			redirectUri: 'https://example.com/callback',
			codeChallenge: 'challenge',
			codeChallengeMethod: 'S256',
			expiresAt: 4102444800000,
		};
		if (scope === undefined) {
			await context.runQuery(
				`INSERT INTO ${table} (${columns}) VALUES (:code, :clientId, :userId, :redirectUri, :codeChallenge, :codeChallengeMethod, :expiresAt)`,
				parameters,
			);
		} else {
			await context.runQuery(
				`INSERT INTO ${table} (${columns}, scope) VALUES (:code, :clientId, :userId, :redirectUri, :codeChallenge, :codeChallengeMethod, :expiresAt, :scope)`,
				{ ...parameters, scope },
			);
		}
	}

	async function getScopes(
		context: TestMigrationContext,
		tableName: string,
		keyColumn: string,
		key: string,
	): Promise<string[]> {
		const table = context.escape.tableName(tableName);
		const keyCol = context.escape.columnName(keyColumn);
		const rows = await context.runQuery<Array<{ scope: string | string[] }>>(
			`SELECT scope FROM ${table} WHERE ${keyCol} = :key`,
			{ key },
		);
		const { scope } = rows[0];
		return typeof scope === 'string' ? jsonParse<string[]>(scope) : scope;
	}

	it('backfills existing consents with the frozen full scope set', async () => {
		const context = createTestMigrationContext(dataSource);
		await seedUserAndClient(context);
		const table = context.escape.tableName('oauth_user_consents');
		const userId = context.escape.columnName('userId');
		const clientId = context.escape.columnName('clientId');
		const grantedAt = context.escape.columnName('grantedAt');
		await context.runQuery(
			`INSERT INTO ${table} (${userId}, ${clientId}, ${grantedAt}) VALUES (:userId, :clientId, :grantedAt)`,
			{ userId: USER_ID, clientId: CLIENT_ID, grantedAt: 1700000000000 },
		);
		await context.queryRunner.release();

		await runSingleMigration(MIGRATION_NAME);
		dataSource = Container.get(DataSource);

		const postContext = createTestMigrationContext(dataSource);
		const scopes = await getScopes(postContext, 'oauth_user_consents', 'userId', USER_ID);
		expect(scopes).toEqual(FULL_SCOPES);
		await postContext.queryRunner.release();
	});

	it('rejects consent inserts without a scope after the migration', async () => {
		await runSingleMigration(MIGRATION_NAME);
		dataSource = Container.get(DataSource);

		const postContext = createTestMigrationContext(dataSource);
		await seedUserAndClient(postContext);
		const table = postContext.escape.tableName('oauth_user_consents');
		const userId = postContext.escape.columnName('userId');
		const clientId = postContext.escape.columnName('clientId');
		const grantedAt = postContext.escape.columnName('grantedAt');
		await expect(
			postContext.runQuery(
				`INSERT INTO ${table} (${userId}, ${clientId}, ${grantedAt}) VALUES (:userId, :clientId, :grantedAt)`,
				{ userId: USER_ID, clientId: CLIENT_ID, grantedAt: 1700000000000 },
			),
		).rejects.toThrow();
		await postContext.queryRunner.release();
	});

	it('rewrites sentinel-scoped refresh tokens and authorization codes to the full scope set', async () => {
		const context = createTestMigrationContext(dataSource);
		await seedUserAndClient(context);
		await insertRefreshToken(context, 'sentinel-token');
		await insertAuthorizationCode(context, 'sentinel-code');
		await context.queryRunner.release();

		await runSingleMigration(MIGRATION_NAME);
		dataSource = Container.get(DataSource);

		const postContext = createTestMigrationContext(dataSource);
		expect(await getScopes(postContext, 'oauth_refresh_tokens', 'token', 'sentinel-token')).toEqual(
			FULL_SCOPES,
		);
		expect(
			await getScopes(postContext, 'oauth_authorization_codes', 'code', 'sentinel-code'),
		).toEqual(FULL_SCOPES);
		await postContext.queryRunner.release();
	});

	it('leaves explicitly scoped rows untouched', async () => {
		const context = createTestMigrationContext(dataSource);
		await seedUserAndClient(context);
		await insertRefreshToken(context, 'scoped-token', JSON.stringify(['workflow:read']));
		await insertAuthorizationCode(context, 'unscoped-code', JSON.stringify([]));
		await context.queryRunner.release();

		await runSingleMigration(MIGRATION_NAME);
		dataSource = Container.get(DataSource);

		const postContext = createTestMigrationContext(dataSource);
		expect(await getScopes(postContext, 'oauth_refresh_tokens', 'token', 'scoped-token')).toEqual([
			'workflow:read',
		]);
		expect(
			await getScopes(postContext, 'oauth_authorization_codes', 'code', 'unscoped-code'),
		).toEqual([]);
		await postContext.queryRunner.release();
	});

	it('rewrites every sentinel row across batch boundaries', async () => {
		const context = createTestMigrationContext(dataSource);
		await seedUserAndClient(context);
		// More rows than one runInBatches page (100) to catch pagination bugs
		// that skip rows when pages shift mid-scan.
		for (let i = 0; i < 120; i++) {
			await insertRefreshToken(context, `bulk-token-${String(i).padStart(3, '0')}`);
		}
		await context.queryRunner.release();

		await runSingleMigration(MIGRATION_NAME);
		dataSource = Container.get(DataSource);

		const postContext = createTestMigrationContext(dataSource);
		const table = postContext.escape.tableName('oauth_refresh_tokens');
		const rows = await postContext.runQuery<Array<{ scope: string | string[] }>>(
			`SELECT scope FROM ${table}`,
		);
		expect(rows).toHaveLength(120);
		for (const row of rows) {
			const scopes = typeof row.scope === 'string' ? jsonParse<string[]>(row.scope) : row.scope;
			expect(scopes).toEqual(FULL_SCOPES);
		}
		await postContext.queryRunner.release();
	});

	it('deletes all access tokens', async () => {
		const context = createTestMigrationContext(dataSource);
		await seedUserAndClient(context);
		const table = context.escape.tableName('oauth_access_tokens');
		const clientId = context.escape.columnName('clientId');
		const userId = context.escape.columnName('userId');
		await context.runQuery(
			`INSERT INTO ${table} (token, ${clientId}, ${userId}) VALUES (:token, :clientId, :userId)`,
			{ token: 'access-token-1', clientId: CLIENT_ID, userId: USER_ID },
		);
		await context.runQuery(
			`INSERT INTO ${table} (token, ${clientId}, ${userId}) VALUES (:token, :clientId, :userId)`,
			{ token: 'access-token-2', clientId: CLIENT_ID, userId: USER_ID },
		);
		await context.queryRunner.release();

		await runSingleMigration(MIGRATION_NAME);
		dataSource = Container.get(DataSource);

		const postContext = createTestMigrationContext(dataSource);
		const rows = await postContext.runQuery<Array<{ token: string }>>(
			`SELECT token FROM ${postContext.escape.tableName('oauth_access_tokens')}`,
		);
		expect(rows).toHaveLength(0);
		await postContext.queryRunner.release();
	});
});
