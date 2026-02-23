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

const MIGRATION_NAME = 'RemoveIsEnabledFlagExternalSecrets1771862675638';

describe('RemoveIsEnabledFlagExternalSecrets Migration', () => {
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

	async function insertProviderConnection(
		context: TestMigrationContext,
		providerKey: string,
		type: string,
		encryptedSettings: string,
		isEnabled: boolean,
	): Promise<void> {
		const tableName = context.escape.tableName('secrets_provider_connection');
		const providerKeyCol = context.escape.columnName('providerKey');
		const typeCol = context.escape.columnName('type');
		const encryptedSettingsCol = context.escape.columnName('encryptedSettings');
		const isEnabledCol = context.escape.columnName('isEnabled');

		await context.runQuery(
			`INSERT INTO ${tableName} (${providerKeyCol}, ${typeCol}, ${encryptedSettingsCol}, ${isEnabledCol}) VALUES (:providerKey, :type, :encryptedSettings, :isEnabled)`,
			{ providerKey, type, encryptedSettings, isEnabled },
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

	describe('up', () => {
		it('should preserve existing rows after dropping the column', async () => {
			const context = createTestMigrationContext(dataSource);
			await insertProviderConnection(
				context,
				'awsSecretsManager',
				'awsSecretsManager',
				'encrypted-data',
				true,
			);
			await context.queryRunner.release();

			await runSingleMigration(MIGRATION_NAME);

			const postContext = createTestMigrationContext(dataSource);
			const connections = await getProviderConnections(postContext);

			expect(connections).toHaveLength(1);
			expect(connections[0].providerKey).toBe('awsSecretsManager');
			expect(connections[0].type).toBe('awsSecretsManager');
			expect(connections[0].encryptedSettings).toBe('encrypted-data');

			await postContext.queryRunner.release();
		});
	});

	describe('down', () => {
		it('should default existing rows to isEnabled=true after rollback', async () => {
			const context = createTestMigrationContext(dataSource);
			await insertProviderConnection(context, 'vault', 'vault', 'encrypted-vault', false);
			await context.queryRunner.release();

			await runSingleMigration(MIGRATION_NAME);
			await undoLastSingleMigration();

			const postContext = createTestMigrationContext(dataSource);
			const tableName = postContext.escape.tableName('secrets_provider_connection');
			const providerKeyCol = postContext.escape.columnName('providerKey');
			const isEnabledCol = postContext.escape.columnName('isEnabled');

			const rows: Array<{ providerKey: string; isEnabled: boolean | number }> =
				await postContext.runQuery(
					`SELECT ${providerKeyCol} AS "providerKey", ${isEnabledCol} AS "isEnabled" FROM ${tableName}`,
				);

			expect(rows).toHaveLength(1);
			expect(rows[0].providerKey).toBe('vault');
			expect(Boolean(rows[0].isEnabled)).toBe(true);

			await postContext.queryRunner.release();
		});
	});
});
