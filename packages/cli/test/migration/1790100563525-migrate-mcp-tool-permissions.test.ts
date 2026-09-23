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
import { jsonParse } from 'n8n-workflow';

const MIGRATION_NAME = 'MigrateMcpToolPermissions1790100563525';
const CONNECTION_TABLE = 'instance_ai_mcp_registry_connections';
const SETTINGS_KEY = 'instanceAi.settings';

type LegacyFilter = { mode: 'allow' | 'exclude'; tools: string[] } | Record<string, unknown> | null;

type ConnectionRow = {
	id: string;
	toolFilter?: string | Record<string, unknown> | null;
	toolPermissions?: string | Record<string, unknown>;
};

describe('MigrateMcpToolPermissions migration', () => {
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
		await initDbUpToMigration(MIGRATION_NAME);
		dataSource = Container.get(DataSource);
	});

	afterAll(async () => {
		await Container.get(DbConnection).close();
	});

	async function seedLegacyData({
		settings,
		filters,
	}: {
		settings?: Record<string, unknown>;
		filters: Array<{ id: string; filter: LegacyFilter }>;
	}) {
		await withContext(async ({ escape, runQuery }) => {
			const now = new Date();
			const userId = randomUUID();
			const serverSlug = `server-${randomUUID()}`;

			await runQuery(
				`INSERT INTO ${escape.tableName('user')} ("id", "email") VALUES (:id, :email)`,
				{ id: userId, email: `${userId}@example.com` },
			);
			await runQuery(
				`INSERT INTO ${escape.tableName('mcp_registry_server')}
				 ("slug", "status", "version", "registryUpdatedAt", "data", "createdAt", "updatedAt")
				 VALUES (:slug, 'active', '1.0.0', :now, :data, :now, :now)`,
				{ slug: serverSlug, now, data: JSON.stringify({}) },
			);

			for (const { id, filter } of filters) {
				const credentialId = randomUUID();
				await runQuery(
					`INSERT INTO ${escape.tableName('credentials_entity')}
					 ("id", "name", "data", "type", "createdAt", "updatedAt")
					 VALUES (:id, :name, 'encrypted', 'testApi', :now, :now)`,
					{ id: credentialId, name: `Credential ${id}`, now },
				);
				await runQuery(
					`INSERT INTO ${escape.tableName(CONNECTION_TABLE)}
					 ("id", "credentialId", "serverSlug", "toolFilter", "userId", "createdAt", "updatedAt")
					 VALUES (:id, :credentialId, :serverSlug, :toolFilter, :userId, :now, :now)`,
					{
						id,
						credentialId,
						serverSlug,
						toolFilter: filter === null ? null : JSON.stringify(filter),
						userId,
						now,
					},
				);
			}

			if (settings) {
				await runQuery(
					`INSERT INTO ${escape.tableName('settings')} ("key", "value", "loadOnStartup")
					 VALUES (:key, :value, :loadOnStartup)`,
					{
						key: SETTINGS_KEY,
						value: JSON.stringify(settings),
						loadOnStartup: true,
					},
				);
			}
		});
	}

	async function readSetting(): Promise<Record<string, unknown> | undefined> {
		return await withContext(async ({ escape, runQuery }) => {
			const rows = await runQuery<Array<{ value: string | Record<string, unknown> }>>(
				`SELECT ${escape.columnName('value')} AS "value"
				 FROM ${escape.tableName('settings')}
				 WHERE ${escape.columnName('key')} = :key`,
				{ key: SETTINGS_KEY },
			);
			if (!rows[0]) return undefined;
			return typeof rows[0].value === 'string'
				? jsonParse<Record<string, unknown>>(rows[0].value)
				: rows[0].value;
		});
	}

	async function readConnections(column: 'toolFilter' | 'toolPermissions') {
		return await withContext(async ({ escape, runQuery }) => {
			const rows = await runQuery<ConnectionRow[]>(
				`SELECT ${escape.columnName('id')} AS "id", ${escape.columnName(column)} AS "${column}"
				 FROM ${escape.tableName(CONNECTION_TABLE)}`,
			);
			return new Map(
				rows.map((row) => {
					const value = row[column];
					return [
						row.id,
						value === null || value === undefined
							? value
							: typeof value === 'string'
								? jsonParse<Record<string, unknown>>(value)
								: value,
					];
				}),
			);
		});
	}

	async function connectionColumns(): Promise<string[]> {
		return await withContext(async (context) => {
			const table = await context.queryRunner.getTable(`${context.tablePrefix}${CONNECTION_TABLE}`);
			return table?.columns.map((column) => column.name) ?? [];
		});
	}

	it('migrates legacy settings and connection filters', async () => {
		const noFilterId = randomUUID();
		const allowFilterId = randomUUID();
		const excludeFilterId = randomUUID();
		await seedLegacyData({
			settings: {
				permissions: { executeMcpTool: 'require_approval', createWorkflow: 'blocked' },
			},
			filters: [
				{ id: noFilterId, filter: null },
				{ id: allowFilterId, filter: { mode: 'allow', tools: ['search'] } },
				{ id: excludeFilterId, filter: { mode: 'exclude', tools: ['delete'] } },
			],
		});

		await runSingleMigration(MIGRATION_NAME);
		dataSource = Container.get(DataSource);

		expect(await readSetting()).toEqual({
			permissions: {
				createWorkflow: 'blocked',
				mcpRead: 'always_allow',
				mcpWrite: 'require_approval',
			},
		});
		const connections = await readConnections('toolPermissions');
		expect(connections.get(noFilterId)).toEqual({
			categories: { read: 'always_allow', write: 'require_approval' },
		});
		expect(connections.get(allowFilterId)).toEqual({
			categories: { read: 'blocked', write: 'blocked' },
			tools: { search: 'require_approval' },
		});
		expect(connections.get(excludeFilterId)).toEqual({
			categories: { read: 'always_allow', write: 'require_approval' },
			tools: { delete: 'blocked' },
		});
		expect(await connectionColumns()).toContain('toolPermissions');
		expect(await connectionColumns()).not.toContain('toolFilter');
	});

	it('uses the default policy when settings are absent and a filter is invalid', async () => {
		const connectionId = randomUUID();
		await seedLegacyData({
			filters: [{ id: connectionId, filter: { mode: 'unknown', tools: [] } }],
		});

		await runSingleMigration(MIGRATION_NAME);
		dataSource = Container.get(DataSource);

		expect(await readSetting()).toBeUndefined();
		expect((await readConnections('toolPermissions')).get(connectionId)).toEqual({
			categories: { read: 'always_allow', write: 'require_approval' },
		});
	});

	it('restores legacy settings, filters, and schema on revert', async () => {
		const connectionId = randomUUID();
		await seedLegacyData({
			settings: { permissions: { executeMcpTool: 'always_allow' } },
			filters: [{ id: connectionId, filter: { mode: 'exclude', tools: ['delete'] } }],
		});
		await runSingleMigration(MIGRATION_NAME);
		dataSource = Container.get(DataSource);

		await undoLastSingleMigration();
		dataSource = Container.get(DataSource);

		expect(await readSetting()).toEqual({
			permissions: { executeMcpTool: 'always_allow' },
		});
		expect((await readConnections('toolFilter')).get(connectionId)).toEqual({
			mode: 'exclude',
			tools: ['delete'],
		});
		expect(await connectionColumns()).toContain('toolFilter');
		expect(await connectionColumns()).not.toContain('toolPermissions');
	});
});
