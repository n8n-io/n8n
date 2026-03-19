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
import { Cipher } from 'n8n-core';
import { randomUUID } from 'node:crypto';

const MIGRATION_NAME = 'CreateCredentialDependencyTable1773000000000';
const DEPENDENCY_TYPE = 'externalSecretProvider';

type CredentialDependencyRow = {
	credentialId: string;
	dependencyType: string;
	dependencyId: string;
};

describe('CreateCredentialDependencyTable Migration', () => {
	let dataSource: DataSource;
	let cipher: Cipher;

	beforeAll(async () => {
		const dbConnection = Container.get(DbConnection);
		await dbConnection.init();
		dataSource = Container.get(DataSource);
		cipher = Container.get(Cipher);
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

	async function insertProviderConnection(
		context: TestMigrationContext,
		data: { id: number; providerKey: string; type?: string },
	): Promise<void> {
		const tableName = context.escape.tableName('secrets_provider_connection');
		const now = new Date();

		await context.runQuery(
			`INSERT INTO ${tableName} ("id", "providerKey", "type", "encryptedSettings", "isEnabled", "createdAt", "updatedAt")
			 VALUES (:id, :providerKey, :type, :encryptedSettings, :isEnabled, :createdAt, :updatedAt)`,
			{
				id: data.id,
				providerKey: data.providerKey,
				type: data.type ?? data.providerKey,
				encryptedSettings: cipher.encrypt(JSON.stringify({ region: 'us-east-1' })),
				isEnabled: true,
				createdAt: now,
				updatedAt: now,
			},
		);
	}

	async function insertCredential(
		context: TestMigrationContext,
		data: { id: string; encryptedData: string },
	): Promise<void> {
		const tableName = context.escape.tableName('credentials_entity');
		const now = new Date();

		await context.runQuery(
			`INSERT INTO ${tableName} ("id", "name", "data", "type", "createdAt", "updatedAt")
			 VALUES (:id, :name, :data, :type, :createdAt, :updatedAt)`,
			{
				id: data.id,
				name: `cred-${data.id.slice(0, 8)}`,
				data: data.encryptedData,
				type: 'testApi',
				createdAt: now,
				updatedAt: now,
			},
		);
	}

	async function getDependencies(
		context: TestMigrationContext,
	): Promise<CredentialDependencyRow[]> {
		const tableName = context.escape.tableName('credential_dependency');
		return await context.runQuery<CredentialDependencyRow[]>(
			`SELECT "credentialId" AS "credentialId", "dependencyType" AS "dependencyType", "dependencyId" AS "dependencyId"
			 FROM ${tableName}
			 ORDER BY "credentialId", "dependencyId"`,
		);
	}

	describe('up migration', () => {
		it('should create table and backfill dependencies from credential expressions', async () => {
			const context = createTestMigrationContext(dataSource);
			const credentialWithSecretsId = randomUUID();
			const credentialWithoutSecretsId = randomUUID();
			const credentialUnknownProviderId = randomUUID();

			await insertProviderConnection(context, { id: 101, providerKey: 'vault' });
			await insertProviderConnection(context, { id: 102, providerKey: 'aws-secrets-manager' });

			await insertCredential(context, {
				id: credentialWithSecretsId,
				encryptedData: cipher.encrypt(
					JSON.stringify({
						apiKey: '={{ $secrets.vault.primaryKey }}',
						nested: {
							token: "={{ $secrets['aws-secrets-manager']['token'] }}",
						},
						repeated: '={{ $secrets.vault.secondary + ":" + $secrets.vault.third }}',
					}),
				),
			});

			await insertCredential(context, {
				id: credentialWithoutSecretsId,
				encryptedData: cipher.encrypt(JSON.stringify({ apiKey: 'plain-value' })),
			});

			await insertCredential(context, {
				id: credentialUnknownProviderId,
				encryptedData: cipher.encrypt(JSON.stringify({ apiKey: '={{ $secrets.unknown.key }}' })),
			});

			await context.queryRunner.release();

			await runSingleMigration(MIGRATION_NAME);
			dataSource = Container.get(DataSource);

			const postContext = createTestMigrationContext(dataSource);
			const dependencies = await getDependencies(postContext);

			expect(dependencies).toEqual([
				{
					credentialId: credentialWithSecretsId,
					dependencyType: DEPENDENCY_TYPE,
					dependencyId: '101',
				},
				{
					credentialId: credentialWithSecretsId,
					dependencyType: DEPENDENCY_TYPE,
					dependencyId: '102',
				},
			]);

			await postContext.queryRunner.release();
		});

		it('should skip credentials that cannot be decrypted', async () => {
			const context = createTestMigrationContext(dataSource);
			const invalidCredentialId = randomUUID();

			await insertProviderConnection(context, { id: 201, providerKey: 'vault' });
			await insertCredential(context, {
				id: invalidCredentialId,
				encryptedData: 'not-encrypted-data',
			});
			await context.queryRunner.release();

			await runSingleMigration(MIGRATION_NAME);
			dataSource = Container.get(DataSource);

			const postContext = createTestMigrationContext(dataSource);
			const dependencies = await getDependencies(postContext);

			expect(dependencies).toHaveLength(0);
			await postContext.queryRunner.release();
		});
	});

	describe('down migration', () => {
		it('should drop credential_dependency table', async () => {
			await runSingleMigration(MIGRATION_NAME);
			await undoLastSingleMigration();

			const context = createTestMigrationContext(dataSource);
			const dependencyTableName = `${context.tablePrefix}credential_dependency`;
			const hasDependencyTable = await context.queryRunner.hasTable(dependencyTableName);

			expect(hasDependencyTable).toBe(false);
			await context.queryRunner.release();
		});
	});
});
