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
import { generateNanoId } from '@n8n/utils/generate-nano-id';
import { randomUUID } from 'node:crypto';

const MIGRATION_NAME = 'CreateScimTokenTable1792408455181';
const SCIM_LABEL = 'SCIM Provisioning API Key';

type ScimTokenRow = { token: string; createdById: string | null };
type ApiKeyRow = { userId: string; apiKey: string; audience: string; label: string };

describe('CreateScimTokenTable migration', () => {
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
		await Container.get(DbConnection).init();
		dataSource = Container.get(DataSource);
	});

	beforeEach(async () => {
		await withContext(async (context) => {
			await context.queryRunner.clearDatabase();
		});
		await initDbUpToMigration(MIGRATION_NAME);
		dataSource = Container.get(DataSource);
		await withContext(grantScimManageToAdmins);
	});

	afterAll(async () => {
		await Container.get(DbConnection).close();
	});

	/** Startup syncs role scopes, not migrations, so seed the one this migration reads. */
	async function grantScimManageToAdmins(context: TestMigrationContext) {
		const { escape, runQuery } = context;
		const slug = escape.columnName('slug');
		await runQuery(
			`INSERT INTO ${escape.tableName('scope')} (${slug}, ${escape.columnName('displayName')}, ${escape.columnName('description')})
			 VALUES ('scim:manage', 'Manage SCIM', 'Manage SCIM') ON CONFLICT DO NOTHING`,
		);
		await runQuery(
			`INSERT INTO ${escape.tableName('role_scope')} (${escape.columnName('roleSlug')}, ${escape.columnName('scopeSlug')})
			 VALUES ('global:admin', 'scim:manage') ON CONFLICT DO NOTHING`,
		);
	}

	/** SQLite stores timestamps as text. Seed them in that format so they sort as in production. */
	const timestamp = (context: TestMigrationContext, iso: string) =>
		context.isSqlite ? iso.replace('T', ' ').replace('Z', '') : new Date(iso);

	async function insertUser(
		context: TestMigrationContext,
		{ role = 'global:admin', disabled = false }: { role?: string; disabled?: boolean } = {},
	) {
		const id = randomUUID();
		const { escape, runQuery } = context;
		const col = (name: string) => escape.columnName(name);
		await runQuery(
			`INSERT INTO ${escape.tableName('user')} (${col('id')}, ${col('email')}, ${col('firstName')}, ${col('lastName')}, ${col('password')}, ${col('roleSlug')}, ${col('disabled')})
			 VALUES (:id, :email, 'Test', 'User', 'hashed', :role, :disabled)`,
			{ id, email: `${id}@test.com`, role, disabled },
		);
		return id;
	}

	async function insertApiKey(
		context: TestMigrationContext,
		{
			userId,
			apiKey,
			createdAt,
			audience = 'scim-api',
			label = SCIM_LABEL,
		}: { userId: string; apiKey: string; createdAt: string; audience?: string; label?: string },
	) {
		const { escape, runQuery } = context;
		const col = (name: string) => escape.columnName(name);
		await runQuery(
			`INSERT INTO ${escape.tableName('user_api_keys')} (${col('id')}, ${col('userId')}, ${col('label')}, ${col('apiKey')}, ${col('scopes')}, ${col('audience')}, ${col('createdAt')}, ${col('updatedAt')})
			 VALUES (:id, :userId, :label, :apiKey, '[]', :audience, :createdAt, :createdAt)`,
			{
				id: generateNanoId(),
				userId,
				label,
				apiKey,
				audience,
				createdAt: timestamp(context, createdAt),
			},
		);
	}

	async function getScimTokens(context: TestMigrationContext) {
		const { escape, runQuery } = context;
		const col = (name: string) => escape.columnName(name);
		return await runQuery<ScimTokenRow[]>(
			`SELECT ${col('token')} AS ${col('token')}, ${col('createdById')} AS ${col('createdById')} FROM ${escape.tableName('scim_token')}`,
		);
	}

	async function getApiKeys(context: TestMigrationContext) {
		const { escape, runQuery } = context;
		const col = (name: string) => escape.columnName(name);
		return await runQuery<ApiKeyRow[]>(
			`SELECT ${col('userId')} AS ${col('userId')}, ${col('apiKey')} AS ${col('apiKey')}, ${col('audience')} AS ${col('audience')}, ${col('label')} AS ${col('label')}
			 FROM ${escape.tableName('user_api_keys')}`,
		);
	}

	it('keeps only the newest SCIM key that still authenticates', async () => {
		const { newestAdmin, olderAdmin } = await withContext(async (context) => {
			const olderAdmin = await insertUser(context);
			const newestAdmin = await insertUser(context);
			const disabledAdmin = await insertUser(context, { disabled: true });
			const member = await insertUser(context, { role: 'global:member' });

			await insertApiKey(context, {
				userId: olderAdmin,
				apiKey: 'older-admin-token',
				createdAt: '2026-01-01T00:00:00.000Z',
			});
			await insertApiKey(context, {
				userId: newestAdmin,
				apiKey: 'newest-admin-token',
				createdAt: '2026-02-01T00:00:00.000Z',
			});
			// The previous check rejected these two keys, so neither can win.
			await insertApiKey(context, {
				userId: disabledAdmin,
				apiKey: 'disabled-admin-token',
				createdAt: '2026-03-01T00:00:00.000Z',
			});
			await insertApiKey(context, {
				userId: member,
				apiKey: 'member-token',
				createdAt: '2026-04-01T00:00:00.000Z',
			});
			await insertApiKey(context, {
				userId: olderAdmin,
				apiKey: 'public-api-token',
				createdAt: '2026-05-01T00:00:00.000Z',
				audience: 'public-api',
				label: 'My key',
			});

			return { newestAdmin, olderAdmin };
		});

		await runSingleMigration(MIGRATION_NAME);

		await withContext(async (context) => {
			expect(await getScimTokens(context)).toEqual([
				{ token: 'newest-admin-token', createdById: newestAdmin },
			]);
			expect(await getApiKeys(context)).toEqual([
				{ userId: olderAdmin, apiKey: 'public-api-token', audience: 'public-api', label: 'My key' },
			]);
		});
	});

	it('creates no token when no SCIM key authenticates', async () => {
		await withContext(async (context) => {
			const disabledAdmin = await insertUser(context, { disabled: true });
			await insertApiKey(context, {
				userId: disabledAdmin,
				apiKey: 'disabled-admin-token',
				createdAt: '2026-01-01T00:00:00.000Z',
			});
		});

		await runSingleMigration(MIGRATION_NAME);

		await withContext(async (context) => {
			expect(await getScimTokens(context)).toEqual([]);
			expect(await getApiKeys(context)).toEqual([]);
		});
	});

	it('allows one token for the instance', async () => {
		await runSingleMigration(MIGRATION_NAME);

		await withContext(async (context) => {
			const table = context.escape.tableName('scim_token');
			const token = context.escape.columnName('token');
			const slot = context.escape.columnName('slot');

			await context.runQuery(`INSERT INTO ${table} (${token}) VALUES ('first')`);
			await expect(
				context.runQuery(`INSERT INTO ${table} (${token}) VALUES ('second')`),
			).rejects.toThrow(/unique/i);
			await expect(
				context.runQuery(`INSERT INTO ${table} (${token}, ${slot}) VALUES ('second', 'other')`),
			).rejects.toThrow(/check constraint/i);
		});
	});

	it('keeps the token when its creator is deleted', async () => {
		const admin = await withContext(async (context) => {
			const id = await insertUser(context);
			await insertApiKey(context, {
				userId: id,
				apiKey: 'admin-token',
				createdAt: '2026-01-01T00:00:00.000Z',
			});
			return id;
		});

		await runSingleMigration(MIGRATION_NAME);

		await withContext(async (context) => {
			await context.runQuery(
				`DELETE FROM ${context.escape.tableName('user')} WHERE ${context.escape.columnName('id')} = :id`,
				{ id: admin },
			);
			expect(await getScimTokens(context)).toEqual([{ token: 'admin-token', createdById: null }]);
		});
	});

	it('gives the token back to its creator on revert', async () => {
		const admin = await withContext(async (context) => {
			const id = await insertUser(context);
			await insertApiKey(context, {
				userId: id,
				apiKey: 'admin-token',
				createdAt: '2026-01-01T00:00:00.000Z',
			});
			return id;
		});
		await runSingleMigration(MIGRATION_NAME);

		await undoLastSingleMigration();
		dataSource = Container.get(DataSource);

		await withContext(async (context) => {
			expect(await getApiKeys(context)).toEqual([
				{ userId: admin, apiKey: 'admin-token', audience: 'scim-api', label: SCIM_LABEL },
			]);
			const table = context.escape.tableName('scim_token');
			await expect(context.runQuery(`SELECT 1 FROM ${table}`)).rejects.toThrow();
		});
	});
});
