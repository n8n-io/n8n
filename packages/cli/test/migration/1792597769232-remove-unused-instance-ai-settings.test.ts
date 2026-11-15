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

const migrationName = 'RemoveUnusedInstanceAiSettings1792597769232';
const instanceAiSettingsKey = 'instanceAi.settings';

function parseRecord(value: string | Record<string, unknown>): Record<string, unknown> {
	return typeof value === 'string' ? JSON.parse(value) : value;
}

describe('RemoveUnusedInstanceAiSettings migration', () => {
	let dataSource: DataSource;

	async function withContext<T>(fn: (context: TestMigrationContext) => Promise<T>): Promise<T> {
		const context = createTestMigrationContext(dataSource);
		try {
			return await fn(context);
		} finally {
			await context.queryRunner.release();
		}
	}

	beforeAll(async () => {
		await Container.get(DbConnection).init();
		dataSource = Container.get(DataSource);
	});

	beforeEach(async () => {
		await withContext(async (context) => await context.queryRunner.clearDatabase());
		await initDbUpToMigration(migrationName);
		dataSource = Container.get(DataSource);
	}, 60_000);

	afterAll(async () => {
		await Container.get(DbConnection).close();
	});

	it('removes unused admin and user settings while preserving other values', async () => {
		const userId = randomUUID();
		await withContext(async ({ escape, runQuery }) => {
			await runQuery(
				`INSERT INTO ${escape.tableName('settings')} ("key", "value", "loadOnStartup")
				 VALUES (:key, :value, :loadOnStartup)`,
				{
					key: instanceAiSettingsKey,
					value: JSON.stringify({
						enabled: true,
						localGatewayDisabled: true,
						permissions: {
							readFilesystem: 'always_allow',
							createWorkflow: 'blocked',
						},
					}),
					loadOnStartup: true,
				},
			);
			await runQuery(
				`INSERT INTO ${escape.tableName('user')} ("id", "email", "settings")
				 VALUES (:id, :email, :settings)`,
				{
					id: userId,
					email: `${userId}@example.com`,
					settings: JSON.stringify({
						isOnboarded: true,
						instanceAi: {
							credentialId: 'credential-id',
							localGatewayDisabled: true,
						},
					}),
				},
			);
		});

		await runSingleMigration(migrationName);
		dataSource = Container.get(DataSource);

		await withContext(async ({ escape, runQuery }) => {
			const [adminRow] = await runQuery<Array<{ value: string | Record<string, unknown> }>>(
				`SELECT ${escape.columnName('value')} AS value
				 FROM ${escape.tableName('settings')}
				 WHERE ${escape.columnName('key')} = :key`,
				{ key: instanceAiSettingsKey },
			);
			expect(parseRecord(adminRow.value)).toEqual({
				enabled: true,
				permissions: { createWorkflow: 'blocked' },
			});

			const [userRow] = await runQuery<Array<{ settings: string | Record<string, unknown> }>>(
				`SELECT ${escape.columnName('settings')} AS settings
				 FROM ${escape.tableName('user')}
				 WHERE ${escape.columnName('id')} = :id`,
				{ id: userId },
			);
			expect(parseRecord(userRow.settings)).toEqual({
				isOnboarded: true,
				instanceAi: { credentialId: 'credential-id' },
			});
		});
	});

	it('leaves settings unchanged when the unused keys are absent', async () => {
		const userId = randomUUID();
		const adminSettings = {
			enabled: true,
			permissions: { createWorkflow: 'always_allow' },
		};
		const userSettings = {
			isOnboarded: true,
			instanceAi: { modelName: 'test-model' },
		};
		await withContext(async ({ escape, runQuery }) => {
			await runQuery(
				`INSERT INTO ${escape.tableName('settings')} ("key", "value", "loadOnStartup")
				 VALUES (:key, :value, :loadOnStartup)`,
				{
					key: instanceAiSettingsKey,
					value: JSON.stringify(adminSettings),
					loadOnStartup: true,
				},
			);
			await runQuery(
				`INSERT INTO ${escape.tableName('user')} ("id", "email", "settings")
				 VALUES (:id, :email, :settings)`,
				{
					id: userId,
					email: `${userId}@example.com`,
					settings: JSON.stringify(userSettings),
				},
			);
		});

		await runSingleMigration(migrationName);
		dataSource = Container.get(DataSource);

		await withContext(async ({ escape, runQuery }) => {
			const [adminRow] = await runQuery<Array<{ value: string | Record<string, unknown> }>>(
				`SELECT ${escape.columnName('value')} AS value
				 FROM ${escape.tableName('settings')}
				 WHERE ${escape.columnName('key')} = :key`,
				{ key: instanceAiSettingsKey },
			);
			expect(parseRecord(adminRow.value)).toEqual(adminSettings);

			const [userRow] = await runQuery<Array<{ settings: string | Record<string, unknown> }>>(
				`SELECT ${escape.columnName('settings')} AS settings
				 FROM ${escape.tableName('user')}
				 WHERE ${escape.columnName('id')} = :id`,
				{ id: userId },
			);
			expect(parseRecord(userRow.settings)).toEqual(userSettings);
		});
	});

	it('skips malformed admin settings and still cleans user settings', async () => {
		const userId = randomUUID();
		await withContext(async ({ escape, runQuery }) => {
			await runQuery(
				`INSERT INTO ${escape.tableName('settings')} ("key", "value", "loadOnStartup")
				 VALUES (:key, :value, :loadOnStartup)`,
				{
					key: instanceAiSettingsKey,
					value: '{invalid',
					loadOnStartup: true,
				},
			);
			await runQuery(
				`INSERT INTO ${escape.tableName('user')} ("id", "email", "settings")
				 VALUES (:id, :email, :settings)`,
				{
					id: userId,
					email: `${userId}@example.com`,
					settings: JSON.stringify({
						instanceAi: { modelName: 'test-model', localGatewayDisabled: false },
					}),
				},
			);
		});

		await runSingleMigration(migrationName);
		dataSource = Container.get(DataSource);

		await withContext(async ({ escape, runQuery }) => {
			const [adminRow] = await runQuery<Array<{ value: string }>>(
				`SELECT ${escape.columnName('value')} AS value
				 FROM ${escape.tableName('settings')}
				 WHERE ${escape.columnName('key')} = :key`,
				{ key: instanceAiSettingsKey },
			);
			expect(adminRow.value).toBe('{invalid');

			const [userRow] = await runQuery<Array<{ settings: string | Record<string, unknown> }>>(
				`SELECT ${escape.columnName('settings')} AS settings
				 FROM ${escape.tableName('user')}
				 WHERE ${escape.columnName('id')} = :id`,
				{ id: userId },
			);
			expect(parseRecord(userRow.settings)).toEqual({
				instanceAi: { modelName: 'test-model' },
			});
		});
	});
});
