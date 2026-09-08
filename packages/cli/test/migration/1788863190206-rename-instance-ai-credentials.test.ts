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

const MIGRATION_NAME = 'RenameInstanceAiCredentials1788863190206';

type CredentialSeed = {
	id: string;
	name: string;
	usageScope: 'instance' | 'project';
};

describe('RenameInstanceAiCredentials Migration', () => {
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

	async function insertCredential(
		context: TestMigrationContext,
		credential: CredentialSeed,
	): Promise<void> {
		const tableName = context.escape.tableName('credentials_entity');
		const now = new Date();
		await context.runQuery(
			`INSERT INTO ${tableName} ("id", "name", "data", "type", "usageScope", "createdAt", "updatedAt")
			 VALUES (:id, :name, :data, :type, :usageScope, :createdAt, :updatedAt)`,
			{
				id: credential.id,
				name: credential.name,
				data: 'encrypted',
				type: 'openAiApi',
				usageScope: credential.usageScope,
				createdAt: now,
				updatedAt: now,
			},
		);
	}

	async function seed(credentials: CredentialSeed[]): Promise<void> {
		const context = createTestMigrationContext(dataSource);
		for (const credential of credentials) {
			await insertCredential(context, credential);
		}
		await context.queryRunner.release();
	}

	async function getName(id: string): Promise<string | undefined> {
		const context = createTestMigrationContext(dataSource);
		const tableName = context.escape.tableName('credentials_entity');
		const rows: Array<{ name: string }> = await context.runQuery(
			`SELECT "name" AS "name" FROM ${tableName} WHERE "id" = :id`,
			{ id },
		);
		await context.queryRunner.release();
		return rows[0]?.name;
	}

	it('renames instance credentials that carry the old product name', async () => {
		const model = randomUUID();
		const search = randomUUID();
		const sandbox = randomUUID();
		await seed([
			{ id: model, name: 'AI Assistant model', usageScope: 'instance' },
			{ id: search, name: 'AI Assistant web search', usageScope: 'instance' },
			{ id: sandbox, name: 'AI Assistant sandbox', usageScope: 'instance' },
		]);

		await runSingleMigration(MIGRATION_NAME);
		dataSource = Container.get(DataSource);

		expect(await getName(model)).toBe('n8n Assistant model');
		expect(await getName(search)).toBe('n8n Assistant web search');
		expect(await getName(sandbox)).toBe('n8n Assistant sandbox');
	});

	it('leaves project credentials and other instance credentials untouched', async () => {
		const projectCredential = randomUUID();
		const otherInstanceCredential = randomUUID();
		await seed([
			{ id: projectCredential, name: 'AI Assistant model', usageScope: 'project' },
			{ id: otherInstanceCredential, name: 'My provider key', usageScope: 'instance' },
		]);

		await runSingleMigration(MIGRATION_NAME);
		dataSource = Container.get(DataSource);

		expect(await getName(projectCredential)).toBe('AI Assistant model');
		expect(await getName(otherInstanceCredential)).toBe('My provider key');
	});

	it('restores the old names on rollback', async () => {
		const model = randomUUID();
		await seed([{ id: model, name: 'AI Assistant model', usageScope: 'instance' }]);

		await runSingleMigration(MIGRATION_NAME);
		dataSource = Container.get(DataSource);
		expect(await getName(model)).toBe('n8n Assistant model');

		await undoLastSingleMigration();
		dataSource = Container.get(DataSource);

		expect(await getName(model)).toBe('AI Assistant model');
	});
});
