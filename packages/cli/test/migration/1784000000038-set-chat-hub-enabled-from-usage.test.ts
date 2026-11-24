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

const MIGRATION_NAME = 'SetChatHubEnabledFromUsage1784000000038';
const CHAT_ENABLED_KEY = 'chat.access.enabled';

describe('SetChatHubEnabledFromUsage Migration', () => {
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

	async function insertUser(context: TestMigrationContext, id: string): Promise<void> {
		const tableName = context.escape.tableName('user');
		await context.runQuery(
			`INSERT INTO ${tableName} ("id", "email", "firstName", "lastName", "password", "roleSlug", "createdAt", "updatedAt") VALUES (:id, :email, :firstName, :lastName, :password, :roleSlug, :createdAt, :updatedAt)`,
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

	async function insertSession(context: TestMigrationContext, ownerId: string): Promise<void> {
		const tableName = context.escape.tableName('chat_hub_sessions');
		const now = new Date();
		await context.runQuery(
			`INSERT INTO ${tableName} ("id", "title", "ownerId", "lastMessageAt", "createdAt", "updatedAt") VALUES (:id, :title, :ownerId, :lastMessageAt, :createdAt, :updatedAt)`,
			{
				id: randomUUID(),
				title: 'Test Session',
				ownerId,
				lastMessageAt: now,
				createdAt: now,
				updatedAt: now,
			},
		);
	}

	async function insertSetting(context: TestMigrationContext, value: string): Promise<void> {
		const tableName = context.escape.tableName('settings');
		const keyCol = context.escape.columnName('key');
		const valueCol = context.escape.columnName('value');
		const loadCol = context.escape.columnName('loadOnStartup');
		await context.runQuery(
			`INSERT INTO ${tableName} (${keyCol}, ${valueCol}, ${loadCol}) VALUES (:key, :value, :load)`,
			{ key: CHAT_ENABLED_KEY, value, load: true },
		);
	}

	async function getStoredValue(): Promise<string | undefined> {
		const context = createTestMigrationContext(dataSource);
		const tableName = context.escape.tableName('settings');
		const keyCol = context.escape.columnName('key');
		const valueCol = context.escape.columnName('value');
		const rows: Array<{ value: string }> = await context.runQuery(
			`SELECT ${valueCol} AS value FROM ${tableName} WHERE ${keyCol} = :key`,
			{ key: CHAT_ENABLED_KEY },
		);
		await context.queryRunner.release();
		return rows[0]?.value;
	}

	it("writes 'true' when Chat Hub usage exists and no setting is stored", async () => {
		const context = createTestMigrationContext(dataSource);
		const userId = randomUUID();
		await insertUser(context, userId);
		await insertSession(context, userId);
		await context.queryRunner.release();

		await runSingleMigration(MIGRATION_NAME);
		dataSource = Container.get(DataSource);

		expect(await getStoredValue()).toBe('true');
	});

	it("writes an explicit 'false' when there is no usage", async () => {
		await runSingleMigration(MIGRATION_NAME);
		dataSource = Container.get(DataSource);

		expect(await getStoredValue()).toBe('false');
	});

	it("does not overwrite an existing 'false' setting even when usage exists", async () => {
		const context = createTestMigrationContext(dataSource);
		const userId = randomUUID();
		await insertUser(context, userId);
		await insertSession(context, userId);
		await insertSetting(context, 'false');
		await context.queryRunner.release();

		await runSingleMigration(MIGRATION_NAME);
		dataSource = Container.get(DataSource);

		expect(await getStoredValue()).toBe('false');
	});

	it("does not duplicate an existing 'true' setting", async () => {
		const context = createTestMigrationContext(dataSource);
		const userId = randomUUID();
		await insertUser(context, userId);
		await insertSession(context, userId);
		await insertSetting(context, 'true');
		await context.queryRunner.release();

		await runSingleMigration(MIGRATION_NAME);
		dataSource = Container.get(DataSource);

		expect(await getStoredValue()).toBe('true');
	});
});
