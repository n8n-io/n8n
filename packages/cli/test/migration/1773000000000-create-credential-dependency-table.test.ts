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
		cipher = Container.get(Cipher);
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

	async function insertProviderConnection(
		context: TestMigrationContext,
		data: { providerKey: string; type?: string },
	): Promise<void> {
		const tableName = context.escape.tableName('secrets_provider_connection');
		const now = new Date();

		await context.runQuery(
			`INSERT INTO ${tableName} ("providerKey", "type", "encryptedSettings", "isEnabled", "createdAt", "updatedAt")
			 VALUES (:providerKey, :type, :encryptedSettings, :isEnabled, :createdAt, :updatedAt)`,
			{
				providerKey: data.providerKey,
				type: data.type ?? data.providerKey,
				encryptedSettings: cipher.encrypt(JSON.stringify({ region: 'us-east-1' })),
				isEnabled: true,
				createdAt: now,
				updatedAt: now,
			},
		);
	}

	async function getProviderIdByKey(
		context: TestMigrationContext,
		providerKey: string,
	): Promise<string | undefined> {
		const tableName = context.escape.tableName('secrets_provider_connection');
		const rows = await context.runQuery<Array<{ id: number }>>(
			`SELECT "id" AS "id" FROM ${tableName} WHERE "providerKey" = :providerKey`,
			{ providerKey },
		);

		return rows[0]?.id.toString();
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
			const credentialWithSecretsId = randomUUID();
			const credentialWithoutSecretsId = randomUUID();
			const credentialUnknownProviderId = randomUUID();

			const { vaultProviderId, awsProviderId } = await withContext(async (context) => {
				await insertProviderConnection(context, { providerKey: 'vault' });
				await insertProviderConnection(context, { providerKey: 'aws-secrets-manager' });

				const vaultProviderId = await getProviderIdByKey(context, 'vault');
				const awsProviderId = await getProviderIdByKey(context, 'aws-secrets-manager');
				expect(vaultProviderId).toBeDefined();
				expect(awsProviderId).toBeDefined();

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

				return { vaultProviderId, awsProviderId };
			});

			await runSingleMigration(MIGRATION_NAME);
			dataSource = Container.get(DataSource);

			const dependencies = await withContext(async (context) => await getDependencies(context));

			expect(dependencies).toHaveLength(2);
			expect(dependencies).toEqual(
				expect.arrayContaining([
					{
						credentialId: credentialWithSecretsId,
						dependencyType: DEPENDENCY_TYPE,
						dependencyId: vaultProviderId!,
					},
					{
						credentialId: credentialWithSecretsId,
						dependencyType: DEPENDENCY_TYPE,
						dependencyId: awsProviderId!,
					},
				]),
			);
		});

		it('should skip credentials that cannot be decrypted', async () => {
			const invalidCredentialId = randomUUID();

			await withContext(async (context) => {
				await insertProviderConnection(context, { providerKey: 'vault' });
				await insertCredential(context, {
					id: invalidCredentialId,
					encryptedData: 'not-encrypted-data',
				});
			});

			await runSingleMigration(MIGRATION_NAME);
			dataSource = Container.get(DataSource);

			const dependencies = await withContext(async (context) => await getDependencies(context));

			expect(dependencies).toHaveLength(0);
		});
	});

	describe('down migration', () => {
		it('should drop credential_dependency table', async () => {
			await runSingleMigration(MIGRATION_NAME);
			await undoLastSingleMigration();

			await withContext(async (context) => {
				const dependencyTableName = `${context.tablePrefix}credential_dependency`;
				const hasDependencyTable = await context.queryRunner.hasTable(dependencyTableName);
				expect(hasDependencyTable).toBe(false);
			});
		});
	});
});
