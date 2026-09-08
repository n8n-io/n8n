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
	/** Instance AI credential use this credential is assigned to, if any. */
	assignedTo?: string;
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
		const credentials = context.escape.tableName('credentials_entity');
		const now = new Date();
		await context.runQuery(
			`INSERT INTO ${credentials} ("id", "name", "data", "type", "usageScope", "createdAt", "updatedAt")
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
		if (!credential.assignedTo) return;

		const assignments = context.escape.tableName('instance_credential_assignment');
		await context.runQuery(
			`INSERT INTO ${assignments} ("credentialUseId", "credentialId", "createdAt", "updatedAt")
			 VALUES (:credentialUseId, :credentialId, :createdAt, :updatedAt)`,
			{
				credentialUseId: credential.assignedTo,
				credentialId: credential.id,
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

	async function clearAssignment(credentialUseId: string): Promise<void> {
		const context = createTestMigrationContext(dataSource);
		const assignments = context.escape.tableName('instance_credential_assignment');
		await context.runQuery(
			`DELETE FROM ${assignments} WHERE "credentialUseId" = :credentialUseId`,
			{ credentialUseId },
		);
		await context.queryRunner.release();
	}

	async function getName(id: string): Promise<string | undefined> {
		const context = createTestMigrationContext(dataSource);
		const credentials = context.escape.tableName('credentials_entity');
		const rows: Array<{ name: string }> = await context.runQuery(
			`SELECT "name" AS "name" FROM ${credentials} WHERE "id" = :id`,
			{ id },
		);
		await context.queryRunner.release();
		return rows[0]?.name;
	}

	it('renames the credentials assigned to the Instance AI credential uses', async () => {
		const model = randomUUID();
		const search = randomUUID();
		const daytonaSandbox = randomUUID();
		const n8nSandbox = randomUUID();
		await seed([
			{
				id: model,
				name: 'AI Assistant model',
				usageScope: 'instance',
				assignedTo: 'instance-ai:model',
			},
			{
				id: search,
				name: 'AI Assistant web search',
				usageScope: 'instance',
				assignedTo: 'instance-ai:search',
			},
			{
				id: daytonaSandbox,
				name: 'AI Assistant sandbox',
				usageScope: 'instance',
				assignedTo: 'instance-ai:sandbox:daytona',
			},
			{
				id: n8nSandbox,
				name: 'AI Assistant sandbox',
				usageScope: 'instance',
				assignedTo: 'instance-ai:sandbox:n8n',
			},
		]);

		await runSingleMigration(MIGRATION_NAME);

		expect(await getName(model)).toBe('n8n Assistant model');
		expect(await getName(search)).toBe('n8n Assistant web search');
		expect(await getName(daytonaSandbox)).toBe('n8n Assistant sandbox');
		expect(await getName(n8nSandbox)).toBe('n8n Assistant sandbox');
	});

	it('leaves credentials that Instance AI does not use untouched', async () => {
		const unassignedInstanceCredential = randomUUID();
		const projectCredential = randomUUID();
		const assignedWithOwnName = randomUUID();
		await seed([
			{ id: unassignedInstanceCredential, name: 'AI Assistant model', usageScope: 'instance' },
			{ id: projectCredential, name: 'AI Assistant model', usageScope: 'project' },
			{
				id: assignedWithOwnName,
				name: 'My provider key',
				usageScope: 'instance',
				assignedTo: 'instance-ai:model',
			},
		]);

		await runSingleMigration(MIGRATION_NAME);

		expect(await getName(unassignedInstanceCredential)).toBe('AI Assistant model');
		expect(await getName(projectCredential)).toBe('AI Assistant model');
		expect(await getName(assignedWithOwnName)).toBe('My provider key');
	});

	it('restores the old names on rollback, even after the assignment was replaced', async () => {
		const renamed = randomUUID();
		const createdByNewVersion = randomUUID();
		const projectCredential = randomUUID();
		await seed([
			{
				id: renamed,
				name: 'AI Assistant model',
				usageScope: 'instance',
				assignedTo: 'instance-ai:model',
			},
			{ id: projectCredential, name: 'n8n Assistant model', usageScope: 'project' },
		]);

		await runSingleMigration(MIGRATION_NAME);
		expect(await getName(renamed)).toBe('n8n Assistant model');

		// An admin replaced the connection after the upgrade: the renamed row lost
		// its assignment and the new version created its successor under the new name.
		await clearAssignment('instance-ai:model');
		await seed([{ id: createdByNewVersion, name: 'n8n Assistant model', usageScope: 'instance' }]);

		await undoLastSingleMigration();

		expect(await getName(renamed)).toBe('AI Assistant model');
		expect(await getName(createdByNewVersion)).toBe('AI Assistant model');
		expect(await getName(projectCredential)).toBe('n8n Assistant model');
	});
});
