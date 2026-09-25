import {
	createTestMigrationContext,
	initDbUpToMigration,
	runSingleMigration,
	type TestMigrationContext,
} from '@n8n/backend-test-utils';
import { DbConnection } from '@n8n/db';
import { Container } from '@n8n/di';
import { DataSource } from '@n8n/typeorm';
import { randomUUID } from 'node:crypto';
import { jsonParse } from 'n8n-workflow';

const MIGRATION_NAME = 'AddProjectManageMembersScopeToCustomRoles1787140858009';

const MANAGE_MEMBERS_SCOPE = 'project:manageMembers';
const UPDATE_SCOPE = 'project:update';

describe('AddProjectManageMembersScopeToApiKeys Migration', () => {
	let dataSource: DataSource;

	beforeEach(async () => {
		const dbConnection = Container.get(DbConnection);
		await dbConnection.init();

		dataSource = Container.get(DataSource);
		const context = createTestMigrationContext(dataSource);
		await context.queryRunner.clearDatabase();
		await initDbUpToMigration(MIGRATION_NAME);
	});

	afterEach(async () => {
		const dbConnection = Container.get(DbConnection);
		await dbConnection.close();
	});

	async function insertUser(context: TestMigrationContext, id: string): Promise<void> {
		const table = context.escape.tableName('user');
		const idColumn = context.escape.columnName('id');
		const emailColumn = context.escape.columnName('email');
		const roleSlugColumn = context.escape.columnName('roleSlug');

		await context.runQuery(
			`INSERT INTO ${table} (${idColumn}, ${emailColumn}, ${roleSlugColumn}) VALUES (:id, :email, :roleSlug)`,
			{ id, email: `${id}@example.com`, roleSlug: 'global:owner' },
		);
	}

	async function insertApiKey(
		context: TestMigrationContext,
		{ id, userId, scopes }: { id: string; userId: string; scopes: string[] },
	): Promise<void> {
		const table = context.escape.tableName('user_api_keys');
		const idColumn = context.escape.columnName('id');
		const userIdColumn = context.escape.columnName('userId');
		const labelColumn = context.escape.columnName('label');
		const apiKeyColumn = context.escape.columnName('apiKey');
		const scopesColumn = context.escape.columnName('scopes');

		await context.runQuery(
			`INSERT INTO ${table} (${idColumn}, ${userIdColumn}, ${labelColumn}, ${apiKeyColumn}, ${scopesColumn}) VALUES (:id, :userId, :label, :apiKey, :scopes)`,
			{
				id,
				userId,
				label: `label-${id}`,
				apiKey: `key-${id}`,
				scopes: JSON.stringify(scopes),
			},
		);
	}

	async function scopesOfApiKey(context: TestMigrationContext, id: string): Promise<string[]> {
		const table = context.escape.tableName('user_api_keys');
		const idColumn = context.escape.columnName('id');
		const scopesColumn = context.escape.columnName('scopes');

		const rows = await context.runQuery<Array<{ scopes: string | string[] }>>(
			`SELECT ${scopesColumn} AS "scopes" FROM ${table} WHERE ${idColumn} = :id`,
			{ id },
		);

		// Postgres returns the json column already parsed; SQLite returns text.
		const { scopes } = rows[0];
		return (typeof scopes === 'string' ? jsonParse<string[]>(scopes) : scopes).sort();
	}

	it('grants project:manageMembers to keys that carry project:update', async () => {
		const context = createTestMigrationContext(dataSource);
		const userId = randomUUID();
		const keyId = randomUUID();
		await insertUser(context, userId);
		await insertApiKey(context, {
			id: keyId,
			userId,
			scopes: ['workflow:read', UPDATE_SCOPE],
		});
		await context.queryRunner.release();

		await runSingleMigration(MIGRATION_NAME);
		dataSource = Container.get(DataSource);

		const postContext = createTestMigrationContext(dataSource);
		expect(await scopesOfApiKey(postContext, keyId)).toEqual([
			MANAGE_MEMBERS_SCOPE,
			UPDATE_SCOPE,
			'workflow:read',
		]);
		await postContext.queryRunner.release();
	});

	it('leaves keys without project:update untouched', async () => {
		const context = createTestMigrationContext(dataSource);
		const userId = randomUUID();
		const keyId = randomUUID();
		await insertUser(context, userId);
		await insertApiKey(context, {
			id: keyId,
			userId,
			scopes: ['workflow:read'],
		});
		await context.queryRunner.release();

		await runSingleMigration(MIGRATION_NAME);
		dataSource = Container.get(DataSource);

		const postContext = createTestMigrationContext(dataSource);
		expect(await scopesOfApiKey(postContext, keyId)).toEqual(['workflow:read']);
		await postContext.queryRunner.release();
	});

	it('does not duplicate project:manageMembers when the key already has it', async () => {
		const context = createTestMigrationContext(dataSource);
		const userId = randomUUID();
		const keyId = randomUUID();
		await insertUser(context, userId);
		await insertApiKey(context, {
			id: keyId,
			userId,
			scopes: [UPDATE_SCOPE, MANAGE_MEMBERS_SCOPE],
		});
		await context.queryRunner.release();

		await runSingleMigration(MIGRATION_NAME);
		dataSource = Container.get(DataSource);

		const postContext = createTestMigrationContext(dataSource);
		expect(await scopesOfApiKey(postContext, keyId)).toEqual([MANAGE_MEMBERS_SCOPE, UPDATE_SCOPE]);
		await postContext.queryRunner.release();
	});

	it('skips a key with an empty scope list without failing', async () => {
		const context = createTestMigrationContext(dataSource);
		const userId = randomUUID();
		const keyId = randomUUID();
		await insertUser(context, userId);
		await insertApiKey(context, { id: keyId, userId, scopes: [] });
		await context.queryRunner.release();

		await runSingleMigration(MIGRATION_NAME);
		dataSource = Container.get(DataSource);

		const postContext = createTestMigrationContext(dataSource);
		expect(await scopesOfApiKey(postContext, keyId)).toEqual([]);
		await postContext.queryRunner.release();
	});
});
