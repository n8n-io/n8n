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
const RENAMED_IDS_KEY = 'instanceAi.renamedCredentialIds';

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
		await insertAssignment(context, credential.assignedTo, credential.id);
	}

	async function insertAssignment(
		context: TestMigrationContext,
		credentialUseId: string,
		credentialId: string,
	): Promise<void> {
		const assignments = context.escape.tableName('instance_credential_assignment');
		const now = new Date();
		await context.runQuery(
			`INSERT INTO ${assignments} ("credentialUseId", "credentialId", "createdAt", "updatedAt")
			 VALUES (:credentialUseId, :credentialId, :createdAt, :updatedAt)`,
			{ credentialUseId, credentialId, createdAt: now, updatedAt: now },
		);
	}

	async function seed(credentials: CredentialSeed[]): Promise<void> {
		const context = createTestMigrationContext(dataSource);
		for (const credential of credentials) {
			await insertCredential(context, credential);
		}
		await context.queryRunner.release();
	}

	/** Moves the Instance AI credential use from its current credential to another one. */
	async function reassign(credentialUseId: string, credentialId: string): Promise<void> {
		const context = createTestMigrationContext(dataSource);
		const assignments = context.escape.tableName('instance_credential_assignment');
		await context.runQuery(
			`DELETE FROM ${assignments} WHERE "credentialUseId" = :credentialUseId`,
			{ credentialUseId },
		);
		await insertAssignment(context, credentialUseId, credentialId);
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

	async function getRenamedIdsRecord(): Promise<string[] | undefined> {
		const context = createTestMigrationContext(dataSource);
		const settings = context.escape.tableName('settings');
		const rows: Array<{ value: string }> = await context.runQuery(
			`SELECT "value" AS "value" FROM ${settings} WHERE "key" = :key`,
			{ key: RENAMED_IDS_KEY },
		);
		await context.queryRunner.release();
		return rows[0] ? (JSON.parse(rows[0].value) as string[]) : undefined;
	}

	it('renames the credentials assigned to the Instance AI credential uses and records them', async () => {
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
		expect((await getRenamedIdsRecord())?.sort()).toEqual(
			[model, search, daytonaSandbox, n8nSandbox].sort(),
		);
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
		expect(await getRenamedIdsRecord()).toEqual([]);
	});

	it('restores only the renamed rows on rollback, even after the assignment moved', async () => {
		const renamed = randomUUID();
		const createdByNewVersion = randomUUID();
		const namedByAdmin = randomUUID();
		await seed([
			{
				id: renamed,
				name: 'AI Assistant model',
				usageScope: 'instance',
				assignedTo: 'instance-ai:model',
			},
			// An admin created this one with the new name by hand; `up` never touched it.
			{ id: namedByAdmin, name: 'n8n Assistant model', usageScope: 'instance' },
		]);

		await runSingleMigration(MIGRATION_NAME);
		expect(await getName(renamed)).toBe('n8n Assistant model');

		// After the upgrade an admin replaced the connection: the new version
		// created its successor under the new name and moved the assignment to it.
		await seed([{ id: createdByNewVersion, name: 'n8n Assistant model', usageScope: 'instance' }]);
		await reassign('instance-ai:model', createdByNewVersion);

		await undoLastSingleMigration();

		expect(await getName(renamed)).toBe('AI Assistant model');
		expect(await getName(createdByNewVersion)).toBe('n8n Assistant model');
		expect(await getName(namedByAdmin)).toBe('n8n Assistant model');
		expect(await getRenamedIdsRecord()).toBeUndefined();
	});
});
