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

const MIGRATION_NAME = 'CreatePromotionsTables1788759351166';

const PROVIDER_TABLE = 'promotion_provider';
const CONNECTION_TABLE = 'promotion_connection';
const LINK_TABLE = 'promotion_connection_project';
const CONFIG_TABLE = 'promotion_config';

describe('CreatePromotionsTables migration', () => {
	let dataSource: DataSource;

	beforeAll(async () => {
		const dbConnection = Container.get(DbConnection);
		await dbConnection.init();
		dataSource = Container.get(DataSource);
		const context = createTestMigrationContext(dataSource);
		await context.queryRunner.clearDatabase();
		await context.queryRunner.release();
		await initDbUpToMigration(MIGRATION_NAME);
		await runSingleMigration(MIGRATION_NAME);
	});

	afterAll(async () => {
		await Container.get(DbConnection).close();
	});

	async function insertProvider(
		context: TestMigrationContext,
		id: string,
		overrides: { type?: string; authType?: string } = {},
	) {
		const now = new Date();
		await context.runQuery(
			`INSERT INTO ${context.escape.tableName(PROVIDER_TABLE)}
			 ("id", "name", "type", "authType", "config", "auth", "createdAt", "updatedAt")
			 VALUES (:id, :name, :type, :authType, :config, :auth, :createdAt, :updatedAt)`,
			{
				id,
				name: 'Provider',
				type: overrides.type ?? 'git',
				authType: overrides.authType ?? 'ssh-key',
				config: JSON.stringify({
					schemaVersion: 1,
					publicKey: 'ssh-ed25519 KEY',
					keyType: 'ed25519',
				}),
				auth: 'encrypted',
				createdAt: now,
				updatedAt: now,
			},
		);
	}

	async function insertConnection(
		context: TestMigrationContext,
		id: string,
		providerId: string,
		scope = 'projects',
	) {
		const now = new Date();
		await context.runQuery(
			`INSERT INTO ${context.escape.tableName(CONNECTION_TABLE)}
			 ("id", "name", "providerId", "scope", "target", "createdAt", "updatedAt")
			 VALUES (:id, :name, :providerId, :scope, :target, :createdAt, :updatedAt)`,
			{
				id,
				name: 'Connection',
				providerId,
				scope,
				target: JSON.stringify({ schemaVersion: 1, remoteUrl: 'git@example.com:team/repo.git' }),
				createdAt: now,
				updatedAt: now,
			},
		);
	}

	async function insertProject(context: TestMigrationContext, id: string) {
		const now = new Date();
		await context.runQuery(
			`INSERT INTO ${context.escape.tableName('project')}
			 ("id", "name", "type", "customTelemetryTags", "createdAt", "updatedAt")
			 VALUES (:id, :name, :type, :tags, :createdAt, :updatedAt)`,
			{ id, name: 'Project', type: 'team', tags: '[]', createdAt: now, updatedAt: now },
		);
	}

	async function insertLink(
		context: TestMigrationContext,
		projectId: string,
		connectionId: string,
	) {
		const now = new Date();
		await context.runQuery(
			`INSERT INTO ${context.escape.tableName(LINK_TABLE)}
			 ("projectId", "connectionId", "createdAt", "updatedAt")
			 VALUES (:projectId, :connectionId, :createdAt, :updatedAt)`,
			{ projectId, connectionId, createdAt: now, updatedAt: now },
		);
	}

	async function insertConfig(
		context: TestMigrationContext,
		id: string,
		connectionId: string,
		direction: string,
	) {
		const now = new Date();
		await context.runQuery(
			`INSERT INTO ${context.escape.tableName(CONFIG_TABLE)}
			 ("id", "connectionId", "name", "direction", "settings", "createdAt", "updatedAt")
			 VALUES (:id, :connectionId, :name, :direction, :settings, :createdAt, :updatedAt)`,
			{
				id,
				connectionId,
				name: direction,
				direction,
				settings: JSON.stringify(
					direction === 'apply'
						? { schemaVersion: 1, branchName: 'dev' }
						: { schemaVersion: 1, baseBranchName: 'staging', createBranchOnPromotion: false },
				),
				createdAt: now,
				updatedAt: now,
			},
		);
	}

	async function countRows(
		context: TestMigrationContext,
		table: string,
		where: string,
		params: object,
	) {
		const rows = await context.runQuery<Array<{ c: number }>>(
			`SELECT COUNT(*) as c FROM ${context.escape.tableName(table)} WHERE ${where}`,
			params,
		);
		return Number(rows[0].c);
	}

	describe('Up migration', () => {
		it('allows one instance connection but any number of project connections', async () => {
			const context = createTestMigrationContext(dataSource);
			const providerId = randomUUID();
			await insertProvider(context, providerId);
			await insertConnection(context, randomUUID(), providerId, 'instance');

			await expect(
				insertConnection(context, randomUUID(), providerId, 'instance'),
			).rejects.toThrow();

			await insertConnection(context, randomUUID(), providerId, 'projects');
			await insertConnection(context, randomUUID(), providerId, 'projects');
			expect(
				await countRows(context, CONNECTION_TABLE, '"scope" = :scope', { scope: 'projects' }),
			).toBe(2);
			await context.queryRunner.release();
		});

		it('rejects values outside the type, auth type, scope, and direction enums', async () => {
			const context = createTestMigrationContext(dataSource);
			await expect(insertProvider(context, randomUUID(), { type: 'gitlab' })).rejects.toThrow();
			await expect(insertProvider(context, randomUUID(), { authType: 'oauth2' })).rejects.toThrow();

			const providerId = randomUUID();
			await insertProvider(context, providerId);
			await expect(
				insertConnection(context, randomUUID(), providerId, 'workflows'),
			).rejects.toThrow();

			const connectionId = randomUUID();
			await insertConnection(context, connectionId, providerId);
			await expect(insertConfig(context, randomUUID(), connectionId, 'sync')).rejects.toThrow();
			await context.queryRunner.release();
		});

		it('refuses to delete a provider that a connection still uses', async () => {
			const context = createTestMigrationContext(dataSource);
			const providerId = randomUUID();
			await insertProvider(context, providerId);
			await insertConnection(context, randomUUID(), providerId);

			await expect(
				context.runQuery(
					`DELETE FROM ${context.escape.tableName(PROVIDER_TABLE)} WHERE "id" = :id`,
					{ id: providerId },
				),
			).rejects.toThrow();
			await context.queryRunner.release();
		});

		it('allows one config for each direction and rejects a repeated direction', async () => {
			const context = createTestMigrationContext(dataSource);
			const providerId = randomUUID();
			const connectionId = randomUUID();
			await insertProvider(context, providerId);
			await insertConnection(context, connectionId, providerId);
			await insertConfig(context, randomUUID(), connectionId, 'apply');
			await insertConfig(context, randomUUID(), connectionId, 'promote');

			await expect(insertConfig(context, randomUUID(), connectionId, 'apply')).rejects.toThrow();
			expect(
				await countRows(context, CONFIG_TABLE, '"connectionId" = :connectionId', { connectionId }),
			).toBe(2);
			await context.queryRunner.release();
		});

		it('links a project to one connection at most', async () => {
			const context = createTestMigrationContext(dataSource);
			const providerId = randomUUID();
			const connectionId = randomUUID();
			const otherConnectionId = randomUUID();
			const projectId = randomUUID();
			await insertProvider(context, providerId);
			await insertConnection(context, connectionId, providerId);
			await insertConnection(context, otherConnectionId, providerId);
			await insertProject(context, projectId);
			await insertLink(context, projectId, connectionId);

			await expect(insertLink(context, projectId, otherConnectionId)).rejects.toThrow();
			await context.queryRunner.release();
		});

		it('deletes the configs and links of a deleted connection, but keeps its provider', async () => {
			const context = createTestMigrationContext(dataSource);
			const providerId = randomUUID();
			const connectionId = randomUUID();
			const projectId = randomUUID();
			await insertProvider(context, providerId);
			await insertConnection(context, connectionId, providerId);
			await insertProject(context, projectId);
			await insertLink(context, projectId, connectionId);
			await insertConfig(context, randomUUID(), connectionId, 'apply');

			await context.runQuery(
				`DELETE FROM ${context.escape.tableName(CONNECTION_TABLE)} WHERE "id" = :id`,
				{ id: connectionId },
			);

			expect(
				await countRows(context, CONFIG_TABLE, '"connectionId" = :connectionId', { connectionId }),
			).toBe(0);
			expect(await countRows(context, LINK_TABLE, '"projectId" = :projectId', { projectId })).toBe(
				0,
			);
			expect(await countRows(context, PROVIDER_TABLE, '"id" = :id', { id: providerId })).toBe(1);
			await context.queryRunner.release();
		});

		it('deletes only the link of a deleted project, not the connection', async () => {
			const context = createTestMigrationContext(dataSource);
			const providerId = randomUUID();
			const connectionId = randomUUID();
			const projectId = randomUUID();
			await insertProvider(context, providerId);
			await insertConnection(context, connectionId, providerId);
			await insertProject(context, projectId);
			await insertLink(context, projectId, connectionId);

			await context.runQuery(
				`DELETE FROM ${context.escape.tableName('project')} WHERE "id" = :id`,
				{ id: projectId },
			);

			expect(await countRows(context, LINK_TABLE, '"projectId" = :projectId', { projectId })).toBe(
				0,
			);
			expect(await countRows(context, CONNECTION_TABLE, '"id" = :id', { id: connectionId })).toBe(
				1,
			);
			await context.queryRunner.release();
		});
	});

	describe('Down migration', () => {
		it('drops the four tables and can be applied again', async () => {
			const tables = [PROVIDER_TABLE, CONNECTION_TABLE, LINK_TABLE, CONFIG_TABLE];
			await dataSource.undoLastMigration({ transaction: 'each' });

			const context = createTestMigrationContext(dataSource);
			for (const table of tables) {
				expect(await context.queryRunner.hasTable(`${context.tablePrefix}${table}`)).toBe(false);
			}
			await context.queryRunner.release();

			await runSingleMigration(MIGRATION_NAME);

			const afterRerun = createTestMigrationContext(dataSource);
			for (const table of tables) {
				expect(await afterRerun.queryRunner.hasTable(`${afterRerun.tablePrefix}${table}`)).toBe(
					true,
				);
			}
			await afterRerun.queryRunner.release();
		});
	});
});
