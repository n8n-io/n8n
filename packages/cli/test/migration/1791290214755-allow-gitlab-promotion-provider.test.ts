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

const migrationName = 'AllowGitLabPromotionProvider1791290214755';

describe('AllowGitLabPromotionProvider migration', () => {
	let dataSource: DataSource;

	beforeAll(async () => {
		await Container.get(DbConnection).init();
		dataSource = Container.get(DataSource);
	});

	beforeEach(async () => {
		await withContext(async ({ queryRunner }) => await queryRunner.clearDatabase());
		await initDbUpToMigration(migrationName);
	});

	afterAll(async () => {
		await Container.get(DbConnection).close();
	});

	async function withContext<T>(run: (context: TestMigrationContext) => Promise<T>): Promise<T> {
		const context = createTestMigrationContext(dataSource);
		try {
			return await run(context);
		} finally {
			await context.queryRunner.release();
		}
	}

	async function insertProvider(
		context: TestMigrationContext,
		type: string,
		authType: 'token' | 'ssh-key' = 'token',
	) {
		const id = randomUUID();
		const config =
			authType === 'ssh-key'
				? { schemaVersion: 1, publicKey: 'ssh-ed25519 TEST-KEY', keyType: 'ed25519' }
				: { schemaVersion: 1, ...(type === 'gitlab' && { baseUrl: 'https://gitlab.example.com' }) };
		const { escape, runQuery } = context;
		await runQuery(
			`INSERT INTO ${escape.tableName('promotion_provider')}
			 (${['id', 'name', 'type', 'authType', 'config', 'auth', 'createdAt', 'updatedAt'].map(escape.columnName).join(', ')})
			 VALUES (:id, :name, :type, :authType, :config, :auth, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
			{
				id,
				name: `${type} ${authType}`,
				type,
				authType,
				config: JSON.stringify(config),
				auth: `encrypted-${id}`,
			},
		);
		return id;
	}

	async function insertDependents(context: TestMigrationContext, providerId: string) {
		const { escape, runQuery } = context;
		const connectionId = randomUUID();
		const projectId = randomUUID();
		await runQuery(
			`INSERT INTO ${escape.tableName('project')}
			 (${['id', 'name', 'type', 'createdAt', 'updatedAt'].map(escape.columnName).join(', ')})
			 VALUES (:projectId, 'Deployment project', 'team', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
			{ projectId },
		);
		await runQuery(
			`INSERT INTO ${escape.tableName('promotion_connection')}
			 (${['id', 'name', 'providerId', 'scope', 'target', 'createdAt', 'updatedAt'].map(escape.columnName).join(', ')})
			 VALUES (:connectionId, 'Deployments', :providerId, 'projects', :target, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
			{
				connectionId,
				providerId,
				target: JSON.stringify({
					schemaVersion: 1,
					remoteUrl: 'https://example.com/workflows.git',
				}),
			},
		);
		await runQuery(
			`INSERT INTO ${escape.tableName('promotion_connection_project')}
			 (${['projectId', 'connectionId', 'createdAt', 'updatedAt'].map(escape.columnName).join(', ')})
			 VALUES (:projectId, :connectionId, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
			{ projectId, connectionId },
		);
		for (const direction of ['apply', 'promote']) {
			const settings =
				direction === 'apply'
					? { schemaVersion: 1, branchName: 'production' }
					: { schemaVersion: 1, baseBranchName: 'main', createBranchOnPromotion: true };
			await runQuery(
				`INSERT INTO ${escape.tableName('promotion_config')}
				 (${['id', 'connectionId', 'name', 'direction', 'settings', 'createdAt', 'updatedAt'].map(escape.columnName).join(', ')})
				 VALUES (:id, :connectionId, :direction, :direction, :settings, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
				{ id: randomUUID(), connectionId, direction, settings: JSON.stringify(settings) },
			);
		}
		return connectionId;
	}

	async function snapshot(context: TestMigrationContext) {
		const read = async (table: string) =>
			await context.runQuery<Array<Record<string, unknown>>>(
				`SELECT * FROM ${context.escape.tableName(table)} ORDER BY 1`,
			);
		return {
			providers: await read('promotion_provider'),
			connections: await read('promotion_connection'),
			configs: await read('promotion_config'),
			projectLinks: await read('promotion_connection_project'),
		};
	}

	it('allows GitLab providers only after the migration and rejects other types', async () => {
		await withContext(async (context) => {
			await expect(insertProvider(context, 'gitlab')).rejects.toThrow();
		});

		await runSingleMigration(migrationName);

		await withContext(async (context) => {
			await expect(insertProvider(context, 'gitlab')).resolves.toBeDefined();
			await expect(insertProvider(context, 'git')).resolves.toBeDefined();
			await expect(insertProvider(context, 'github')).rejects.toThrow();
		});
	});

	it('preserves existing token and SSH providers with all their dependent rows', async () => {
		const before = await withContext(async (context) => {
			for (const authType of ['token', 'ssh-key'] as const) {
				await insertDependents(context, await insertProvider(context, 'git', authType));
			}
			return await snapshot(context);
		});

		await runSingleMigration(migrationName);

		expect(await withContext(snapshot)).toEqual(before);
	});

	it('keeps the authentication type constraint and connection foreign key', async () => {
		await runSingleMigration(migrationName);

		await withContext(async (context) => {
			const providerId = await insertProvider(context, 'git');
			const connectionId = await insertDependents(context, providerId);
			await expect(
				context.runQuery(
					`UPDATE ${context.escape.tableName('promotion_provider')} SET ${context.escape.columnName('authType')} = 'unknown' WHERE ${context.escape.columnName('id')} = :providerId`,
					{ providerId },
				),
			).rejects.toThrow();
			await expect(
				context.runQuery(
					`UPDATE ${context.escape.tableName('promotion_connection')} SET ${context.escape.columnName('providerId')} = :missingId WHERE ${context.escape.columnName('id')} = :connectionId`,
					{ missingId: randomUUID(), connectionId },
				),
			).rejects.toThrow();
		});
	});

	it('downgrades GitLab providers without changing credentials, connections, project links, or branch configs', async () => {
		await runSingleMigration(migrationName);
		const { before, gitLabProviderId } = await withContext(async (context) => {
			await insertDependents(context, await insertProvider(context, 'git', 'ssh-key'));
			const gitLabProviderId = await insertProvider(context, 'gitlab');
			await insertDependents(context, gitLabProviderId);
			return { before: await snapshot(context), gitLabProviderId };
		});

		await undoLastSingleMigration();

		const after = await withContext(snapshot);
		expect(after.connections).toEqual(before.connections);
		expect(after.configs).toEqual(before.configs);
		expect(after.projectLinks).toEqual(before.projectLinks);
		expect(after.providers).toEqual(
			before.providers.map((provider) =>
				provider.id === gitLabProviderId
					? {
							...provider,
							type: 'git',
							config:
								typeof provider.config === 'string' ? '{"schemaVersion":1}' : { schemaVersion: 1 },
						}
					: provider,
			),
		);
		await withContext(async (context) => {
			await expect(insertProvider(context, 'gitlab')).rejects.toThrow();
			await expect(
				context.runQuery(
					`UPDATE ${context.escape.tableName('promotion_connection')} SET ${context.escape.columnName('providerId')} = :missingId WHERE ${context.escape.columnName('providerId')} = :providerId`,
					{ missingId: randomUUID(), providerId: gitLabProviderId },
				),
			).rejects.toThrow();
		});
	});

	it('can apply again after a downgrade without losing existing rows', async () => {
		await withContext(async (context) => {
			await insertDependents(context, await insertProvider(context, 'git'));
		});
		const before = await withContext(snapshot);

		await runSingleMigration(migrationName);
		await undoLastSingleMigration();
		await runSingleMigration(migrationName);

		expect(await withContext(snapshot)).toEqual(before);
		await withContext(async (context) => {
			await expect(insertProvider(context, 'gitlab')).resolves.toBeDefined();
		});
	});
});
