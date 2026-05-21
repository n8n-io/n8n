import { randomUUID } from 'node:crypto';

import {
	createTestMigrationContext,
	initDbUpToMigration,
	runSingleMigration,
	type TestMigrationContext,
} from '@n8n/backend-test-utils';
import { DbConnection } from '@n8n/db';
import { Container } from '@n8n/di';
import { DataSource } from '@n8n/typeorm';

const MIGRATION_NAME = 'RemoveInsightsReadScopeFromMemberApiKeys1784000000009';

describe('RemoveInsightsReadScopeFromMemberApiKeys Migration', () => {
	let dataSource: DataSource;

	beforeEach(async () => {
		const dbConnection = Container.get(DbConnection);
		await dbConnection.init();
		dataSource = Container.get(DataSource);
		const context = createTestMigrationContext(dataSource);
		await context.queryRunner.clearDatabase();
		await context.queryRunner.release();
		await initDbUpToMigration(MIGRATION_NAME);
	});

	afterEach(async () => {
		const dbConnection = Container.get(DbConnection);
		await dbConnection.close();
	});

	async function insertUser(
		context: TestMigrationContext,
		opts: { id: string; roleSlug: string },
	): Promise<void> {
		const tableName = context.escape.tableName('user');
		await context.runQuery(
			`INSERT INTO ${tableName} ("id", "email", "firstName", "lastName", "password", "roleSlug", "createdAt", "updatedAt") VALUES (:id, :email, :firstName, :lastName, :password, :roleSlug, :createdAt, :updatedAt)`,
			{
				id: opts.id,
				email: `${opts.id}@example.com`,
				firstName: 'Test',
				lastName: 'User',
				password: 'hashed',
				roleSlug: opts.roleSlug,
				createdAt: new Date(),
				updatedAt: new Date(),
			},
		);
	}

	async function insertApiKey(
		context: TestMigrationContext,
		opts: { id: string; userId: string; scopes: string[] },
	): Promise<void> {
		const tableName = context.escape.tableName('user_api_keys');
		await context.runQuery(
			`INSERT INTO ${tableName} ("id", "userId", "label", "scopes", "apiKey", "audience", "createdAt", "updatedAt") VALUES (:id, :userId, :label, :scopes, :apiKey, :audience, :createdAt, :updatedAt)`,
			{
				id: opts.id,
				userId: opts.userId,
				label: 'test key',
				scopes: JSON.stringify(opts.scopes),
				apiKey: `n8n_api_${opts.id}`,
				audience: 'public-api',
				createdAt: new Date(),
				updatedAt: new Date(),
			},
		);
	}

	async function getApiKeyScopes(context: TestMigrationContext, id: string): Promise<string[]> {
		const tableName = context.escape.tableName('user_api_keys');
		const scopesExpr = context.isPostgres ? '"scopes"::text' : '"scopes"';
		const rows = await context.runQuery<Array<{ scopes: string }>>(
			`SELECT ${scopesExpr} AS scopes FROM ${tableName} WHERE "id" = :id`,
			{ id },
		);
		if (!rows[0]?.scopes) return [];
		return JSON.parse(rows[0].scopes) as string[];
	}

	it('does nothing when no API keys exist', async () => {
		await runSingleMigration(MIGRATION_NAME);
		// Migration should complete without error when there are no matching rows
	});

	it('removes insights:read from a member key that has it alongside other scopes', async () => {
		const context = createTestMigrationContext(dataSource);
		const userId = randomUUID();
		const keyId = randomUUID();

		await insertUser(context, { id: userId, roleSlug: 'global:member' });
		await insertApiKey(context, {
			id: keyId,
			userId,
			scopes: ['insights:read', 'workflow:read', 'tag:list'],
		});

		await context.queryRunner.release();
		await runSingleMigration(MIGRATION_NAME);
		dataSource = Container.get(DataSource);

		const postContext = createTestMigrationContext(dataSource);
		const scopes = await getApiKeyScopes(postContext, keyId);
		expect(scopes).not.toContain('insights:read');
		expect(scopes).toContain('workflow:read');
		expect(scopes).toContain('tag:list');
		await postContext.queryRunner.release();
	});

	it('leaves an admin key with insights:read untouched', async () => {
		const context = createTestMigrationContext(dataSource);
		const userId = randomUUID();
		const keyId = randomUUID();

		await insertUser(context, { id: userId, roleSlug: 'global:admin' });
		await insertApiKey(context, {
			id: keyId,
			userId,
			scopes: ['insights:read', 'workflow:read'],
		});

		await context.queryRunner.release();
		await runSingleMigration(MIGRATION_NAME);
		dataSource = Container.get(DataSource);

		const postContext = createTestMigrationContext(dataSource);
		const scopes = await getApiKeyScopes(postContext, keyId);
		expect(scopes).toContain('insights:read');
		expect(scopes).toContain('workflow:read');
		await postContext.queryRunner.release();
	});

	it('leaves an owner key with insights:read untouched', async () => {
		const context = createTestMigrationContext(dataSource);
		const userId = randomUUID();
		const keyId = randomUUID();

		await insertUser(context, { id: userId, roleSlug: 'global:owner' });
		await insertApiKey(context, {
			id: keyId,
			userId,
			scopes: ['insights:read', 'workflow:read'],
		});

		await context.queryRunner.release();
		await runSingleMigration(MIGRATION_NAME);
		dataSource = Container.get(DataSource);

		const postContext = createTestMigrationContext(dataSource);
		const scopes = await getApiKeyScopes(postContext, keyId);
		expect(scopes).toContain('insights:read');
		expect(scopes).toContain('workflow:read');
		await postContext.queryRunner.release();
	});

	it('leaves a member key that does not have insights:read untouched', async () => {
		const context = createTestMigrationContext(dataSource);
		const userId = randomUUID();
		const keyId = randomUUID();

		await insertUser(context, { id: userId, roleSlug: 'global:member' });
		await insertApiKey(context, {
			id: keyId,
			userId,
			scopes: ['workflow:read', 'tag:list'],
		});

		await context.queryRunner.release();
		await runSingleMigration(MIGRATION_NAME);
		dataSource = Container.get(DataSource);

		const postContext = createTestMigrationContext(dataSource);
		const scopes = await getApiKeyScopes(postContext, keyId);
		expect(scopes).toEqual(['workflow:read', 'tag:list']);
		await postContext.queryRunner.release();
	});

	it('produces an empty scopes array when insights:read was the only scope', async () => {
		const context = createTestMigrationContext(dataSource);
		const userId = randomUUID();
		const keyId = randomUUID();

		await insertUser(context, { id: userId, roleSlug: 'global:member' });
		await insertApiKey(context, {
			id: keyId,
			userId,
			scopes: ['insights:read'],
		});

		await context.queryRunner.release();
		await runSingleMigration(MIGRATION_NAME);
		dataSource = Container.get(DataSource);

		const postContext = createTestMigrationContext(dataSource);
		const scopes = await getApiKeyScopes(postContext, keyId);
		expect(scopes).toEqual([]);
		await postContext.queryRunner.release();
	});
});
