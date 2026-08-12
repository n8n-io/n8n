import {
	createTestMigrationContext,
	initDbUpToMigration,
	runSingleMigration,
	type TestMigrationContext,
} from '@n8n/backend-test-utils';
import { DbConnection } from '@n8n/db';
import { Container } from '@n8n/di';
import { DataSource } from '@n8n/typeorm';
import { Cipher } from 'n8n-core';

const MIGRATION_NAME = 'MigrateExternalSecretsToEntityStorage1771500000000';
const EXTERNAL_SECRETS_DB_KEY = 'feature.externalSecrets';

describe('MigrateExternalSecretsToEntityStorage Migration', () => {
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

	async function insertSettingsBlob(context: TestMigrationContext, value: string): Promise<void> {
		const tableName = context.escape.tableName('settings');
		const keyCol = context.escape.columnName('key');
		const valueCol = context.escape.columnName('value');
		const loadOnStartupCol = context.escape.columnName('loadOnStartup');

		await context.runQuery(
			`INSERT INTO ${tableName} (${keyCol}, ${valueCol}, ${loadOnStartupCol}) VALUES (:key, :value, :loadOnStartup)`,
			{ key: EXTERNAL_SECRETS_DB_KEY, value, loadOnStartup: true },
		);
	}

	async function getProviderConnections(
		context: TestMigrationContext,
	): Promise<Array<{ providerKey: string; type: string; encryptedSettings: string }>> {
		const tableName = context.escape.tableName('secrets_provider_connection');
		const providerKeyCol = context.escape.columnName('providerKey');
		const typeCol = context.escape.columnName('type');
		const encryptedSettingsCol = context.escape.columnName('encryptedSettings');

		return await context.runQuery(
			`SELECT ${providerKeyCol} AS "providerKey", ${typeCol} AS "type", ${encryptedSettingsCol} AS "encryptedSettings" FROM ${tableName}`,
		);
	}

	async function insertProviderConnection(
		context: TestMigrationContext,
		providerKey: string,
		type: string,
		encryptedSettings: string,
	): Promise<void> {
		const tableName = context.escape.tableName('secrets_provider_connection');
		const providerKeyCol = context.escape.columnName('providerKey');
		const typeCol = context.escape.columnName('type');
		const encryptedSettingsCol = context.escape.columnName('encryptedSettings');

		await context.runQuery(
			`INSERT INTO ${tableName} (${providerKeyCol}, ${typeCol}, ${encryptedSettingsCol}) VALUES (:providerKey, :type, :encryptedSettings)`,
			{ providerKey, type, encryptedSettings },
		);
	}

	describe('up migration', () => {
		it('should skip when no external secrets settings exist', async () => {
			const context = createTestMigrationContext(dataSource);
			await context.queryRunner.release();

			await runSingleMigration(MIGRATION_NAME);
			dataSource = Container.get(DataSource);

			const postContext = createTestMigrationContext(dataSource);
			const connections = await getProviderConnections(postContext);
			expect(connections).toHaveLength(0);
			await postContext.queryRunner.release();
		});

		it('should migrate connected providers to secrets_provider_connection', async () => {
			const context = createTestMigrationContext(dataSource);

			const settings = {
				awsSecretsManager: {
					connected: true,
					connectedAt: '2024-01-01T00:00:00.000Z',
					settings: { region: 'us-east-1', accessKeyId: 'AKIA...' },
				},
				gcpSecretsManager: {
					connected: true,
					connectedAt: '2024-02-01T00:00:00.000Z',
					settings: { projectId: 'my-project' },
				},
			};

			const encrypted = cipher.encrypt(JSON.stringify(settings));
			await insertSettingsBlob(context, encrypted);
			await context.queryRunner.release();

			await runSingleMigration(MIGRATION_NAME);
			dataSource = Container.get(DataSource);

			const postContext = createTestMigrationContext(dataSource);
			const connections = await getProviderConnections(postContext);

			expect(connections).toHaveLength(2);

			const aws = connections.find((c) => c.providerKey === 'awsSecretsManager');
			expect(aws).toBeDefined();
			expect(aws!.type).toBe('awsSecretsManager');
			const awsDecrypted = JSON.parse(cipher.decrypt(aws!.encryptedSettings));
			expect(awsDecrypted).toEqual({ region: 'us-east-1', accessKeyId: 'AKIA...' });

			const gcp = connections.find((c) => c.providerKey === 'gcpSecretsManager');
			expect(gcp).toBeDefined();
			expect(gcp!.type).toBe('gcpSecretsManager');
			const gcpDecrypted = JSON.parse(cipher.decrypt(gcp!.encryptedSettings));
			expect(gcpDecrypted).toEqual({ projectId: 'my-project' });

			await postContext.queryRunner.release();
		});

		it('should skip disconnected providers', async () => {
			const context = createTestMigrationContext(dataSource);

			const settings = {
				awsSecretsManager: {
					connected: true,
					connectedAt: '2024-01-01T00:00:00.000Z',
					settings: { region: 'us-east-1' },
				},
				gcpSecretsManager: {
					connected: false,
					connectedAt: null,
					settings: { projectId: 'my-project' },
				},
			};

			const encrypted = cipher.encrypt(JSON.stringify(settings));
			await insertSettingsBlob(context, encrypted);
			await context.queryRunner.release();

			await runSingleMigration(MIGRATION_NAME);
			dataSource = Container.get(DataSource);

			const postContext = createTestMigrationContext(dataSource);
			const connections = await getProviderConnections(postContext);

			expect(connections).toHaveLength(1);
			expect(connections[0].providerKey).toBe('awsSecretsManager');

			await postContext.queryRunner.release();
		});

		it('should skip providers that already exist in secrets_provider_connection', async () => {
			const context = createTestMigrationContext(dataSource);

			const existingEncryptedSettings = cipher.encrypt({ region: 'eu-west-1' });
			await insertProviderConnection(
				context,
				'awsSecretsManager',
				'awsSecretsManager',
				existingEncryptedSettings,
			);

			const settings = {
				awsSecretsManager: {
					connected: true,
					connectedAt: '2024-01-01T00:00:00.000Z',
					settings: { region: 'us-east-1' },
				},
			};

			const encrypted = cipher.encrypt(JSON.stringify(settings));
			await insertSettingsBlob(context, encrypted);
			await context.queryRunner.release();

			await runSingleMigration(MIGRATION_NAME);
			dataSource = Container.get(DataSource);

			const postContext = createTestMigrationContext(dataSource);
			const connections = await getProviderConnections(postContext);

			expect(connections).toHaveLength(1);
			// Should still have the original settings, not the migrated ones
			const decrypted = JSON.parse(cipher.decrypt(connections[0].encryptedSettings));
			expect(decrypted).toEqual({ region: 'eu-west-1' });

			await postContext.queryRunner.release();
		});

		it('should skip when settings blob is empty', async () => {
			const context = createTestMigrationContext(dataSource);

			const encrypted = cipher.encrypt(JSON.stringify({}));
			await insertSettingsBlob(context, encrypted);
			await context.queryRunner.release();

			await runSingleMigration(MIGRATION_NAME);
			dataSource = Container.get(DataSource);

			const postContext = createTestMigrationContext(dataSource);
			const connections = await getProviderConnections(postContext);
			expect(connections).toHaveLength(0);
			await postContext.queryRunner.release();
		});

		it('should skip when settings blob cannot be decrypted', async () => {
			const context = createTestMigrationContext(dataSource);

			await insertSettingsBlob(context, 'not-valid-encrypted-data');
			await context.queryRunner.release();

			await runSingleMigration(MIGRATION_NAME);
			dataSource = Container.get(DataSource);

			const postContext = createTestMigrationContext(dataSource);
			const connections = await getProviderConnections(postContext);
			expect(connections).toHaveLength(0);
			await postContext.queryRunner.release();
		});

		it('should handle providers with null settings', async () => {
			const context = createTestMigrationContext(dataSource);

			const settings = {
				awsSecretsManager: {
					connected: true,
					connectedAt: '2024-01-01T00:00:00.000Z',
					settings: null as unknown as Record<string, unknown>,
				},
			};

			const encrypted = cipher.encrypt(JSON.stringify(settings));
			await insertSettingsBlob(context, encrypted);
			await context.queryRunner.release();

			await runSingleMigration(MIGRATION_NAME);
			dataSource = Container.get(DataSource);

			const postContext = createTestMigrationContext(dataSource);
			const connections = await getProviderConnections(postContext);

			expect(connections).toHaveLength(1);
			const decrypted = JSON.parse(cipher.decrypt(connections[0].encryptedSettings));
			expect(decrypted).toEqual({});

			await postContext.queryRunner.release();
		});
	});
});
