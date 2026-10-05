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

const MIGRATION_NAME = 'AllowGitLabPromotionProvider1791197206157';

describe('AllowGitLabPromotionProvider Migration', () => {
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

	async function withContext<T>(run: (context: TestMigrationContext) => Promise<T>): Promise<T> {
		const context = createTestMigrationContext(dataSource);
		try {
			return await run(context);
		} finally {
			await context.queryRunner.release();
		}
	}

	async function insertProvider(context: TestMigrationContext, type: string): Promise<string> {
		const id = randomUUID();
		await context.runQuery(
			`INSERT INTO ${context.escape.tableName('promotion_provider')}
			   ("id", "name", "type", "authType", "config", "auth", "createdAt", "updatedAt")
			 VALUES (:id, :type, :type, 'token', :config, 'encrypted', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
			{
				id,
				type,
				config: JSON.stringify({
					schemaVersion: 1,
					...(type === 'gitlab' && { baseUrl: 'https://gitlab.example.com' }),
				}),
			},
		);
		return id;
	}

	/** Adds a project connection with an Apply config, so the provider has dependents. */
	async function insertConnection(context: TestMigrationContext, providerId: string) {
		const id = randomUUID();
		await context.runQuery(
			`INSERT INTO ${context.escape.tableName('promotion_connection')}
			   ("id", "name", "providerId", "scope", "target", "createdAt", "updatedAt")
			 VALUES (:id, 'Deployments', :providerId, 'projects', :target, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
			{
				id,
				providerId,
				target: JSON.stringify({ schemaVersion: 1, remoteUrl: 'https://example.com/repo.git' }),
			},
		);
		await context.runQuery(
			`INSERT INTO ${context.escape.tableName('promotion_config')}
			   ("id", "connectionId", "name", "direction", "settings", "createdAt", "updatedAt")
			 VALUES (:configId, :id, 'Apply', 'apply', :settings, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
			{
				configId: randomUUID(),
				id,
				settings: JSON.stringify({ schemaVersion: 1, branchName: 'main' }),
			},
		);
		return id;
	}

	async function ids(context: TestMigrationContext, table: string): Promise<string[]> {
		const rows = (await context.queryRunner.query(
			`SELECT "id" FROM ${context.escape.tableName(table)}`,
		)) as Array<{ id: string }>;
		return rows.map((row) => row.id).sort();
	}

	describe('up', () => {
		it('accepts a GitLab provider and still rejects an unknown type', async () => {
			await withContext(async (context) => {
				await expect(insertProvider(context, 'gitlab')).rejects.toThrow();
			});

			await runSingleMigration(MIGRATION_NAME);

			await withContext(async (context) => {
				await expect(insertProvider(context, 'gitlab')).resolves.toBeDefined();
				await expect(insertProvider(context, 'github')).rejects.toThrow();
			});
		});

		it('keeps existing providers, connections, and configs', async () => {
			const before = await withContext(async (context) => {
				const providerId = await insertProvider(context, 'git');
				const connectionId = await insertConnection(context, providerId);
				return { providerId, connectionId };
			});

			await runSingleMigration(MIGRATION_NAME);

			await withContext(async (context) => {
				expect(await ids(context, 'promotion_provider')).toEqual([before.providerId]);
				expect(await ids(context, 'promotion_connection')).toEqual([before.connectionId]);
				expect(await ids(context, 'promotion_config')).toHaveLength(1);
			});
		});
	});

	describe('down', () => {
		it('converts GitLab providers to Git and keeps their connections and credentials', async () => {
			await runSingleMigration(MIGRATION_NAME);
			const kept = await withContext(async (context) => {
				const gitProviderId = await insertProvider(context, 'git');
				const gitConnectionId = await insertConnection(context, gitProviderId);
				const gitLabProviderId = await insertProvider(context, 'gitlab');
				const gitLabConnectionId = await insertConnection(context, gitLabProviderId);
				return { gitProviderId, gitConnectionId, gitLabProviderId, gitLabConnectionId };
			});

			await undoLastSingleMigration();

			await withContext(async (context) => {
				expect(await ids(context, 'promotion_provider')).toEqual(
					[kept.gitProviderId, kept.gitLabProviderId].sort(),
				);
				expect(await ids(context, 'promotion_connection')).toEqual(
					[kept.gitConnectionId, kept.gitLabConnectionId].sort(),
				);
				expect(await ids(context, 'promotion_config')).toHaveLength(2);
				const rows = await context.runQuery<Array<{ type: string; auth: string; config: unknown }>>(
					`SELECT "type", "auth", "config" FROM ${context.escape.tableName('promotion_provider')} WHERE "id" = :id`,
					{ id: kept.gitLabProviderId },
				);
				expect(rows[0]).toMatchObject({ type: 'git', auth: 'encrypted' });
				const config = rows[0].config;
				expect(typeof config === 'string' ? JSON.parse(config) : config).toEqual({
					schemaVersion: 1,
				});
				await expect(insertProvider(context, 'gitlab')).rejects.toThrow();
			});
		});
	});
});
