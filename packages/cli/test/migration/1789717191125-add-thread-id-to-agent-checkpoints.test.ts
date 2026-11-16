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

import { indexColumnsInOrder } from './shared/index-columns';

vi.hoisted(() => {
	const { GlobalConfig } = require('@n8n/config') as typeof import('@n8n/config');
	const { Container } = require('@n8n/di') as typeof import('@n8n/di');
	const { database } = Container.get(GlobalConfig);
	// PostgreSQL truncates long index names. Set the prefix before migration helpers capture it.
	if (database.type === 'postgresdb') database.tablePrefix = 'test_long_prefix_';
});

const MIGRATION_NAME = 'AddThreadIdToAgentCheckpoints1789717191125';
const INDEX_NAME = 'agent_checkpoints_thread';
const originalColumns = ['runId', 'agentId', 'state', 'expired', 'createdAt', 'updatedAt'];
const checkpoints = [
	...Array.from({ length: 101 }, (_, index) => ({
		runId: `run-${String(index).padStart(3, '0')}`,
		state: `{ "persistence": { "threadId": "thread-${index}" }, "status": "suspended" }`,
		threadId: `thread-${index}`,
		expired: false,
	})),
	{
		runId: 'expired',
		state: '{"persistence":{"threadId":"expired-thread"}}',
		threadId: 'expired-thread',
		expired: true,
	},
	{
		runId: 'delegated',
		state: '{"persistence":{"threadId":"parent-thread","delegated":true}}',
		threadId: 'parent-thread',
		expired: false,
	},
	{
		runId: 'running',
		state: '{"status":"running","persistence":{"threadId":"running-thread"}}',
		threadId: 'running-thread',
		expired: false,
	},
	...['{', 'null', '{}', '{"persistence":{}}', '{"persistence":{"threadId":42}}', null].map(
		(state, index) => ({
			runId: `invalid-${index}`,
			state,
			threadId: null,
			expired: false,
		}),
	),
];

describe('AddThreadIdToAgentCheckpoints migration', () => {
	let dataSource: DataSource;

	async function withContext<T>(fn: (context: TestMigrationContext) => Promise<T>): Promise<T> {
		const context = createTestMigrationContext(dataSource);
		try {
			return await fn(context);
		} finally {
			await context.queryRunner.release();
		}
	}

	async function readOriginalColumns() {
		return await withContext(
			async ({ escape, runQuery }) =>
				await runQuery<Array<Record<string, unknown>>>(
					`SELECT ${originalColumns.map(escape.columnName).join(', ')} FROM ${escape.tableName('agent_checkpoints')} ORDER BY ${escape.columnName('runId')}`,
				),
		);
	}

	async function readSqliteCheckpointRootPage() {
		return await withContext(async ({ escape, isSqlite, runQuery, tablePrefix }) => {
			if (!isSqlite) return undefined;
			const [table] = await runQuery<Array<{ rootPage: number }>>(
				`SELECT rootpage AS ${escape.columnName('rootPage')} FROM sqlite_master WHERE type = 'table' AND name = :tableName`,
				{ tableName: `${tablePrefix}agent_checkpoints` },
			);
			return table?.rootPage;
		});
	}

	beforeAll(async () => {
		await Container.get(DbConnection).init();
		dataSource = Container.get(DataSource);
	});

	beforeEach(async () => {
		await withContext(async (context) => await context.queryRunner.clearDatabase());
		await initDbUpToMigration(MIGRATION_NAME);
		await withContext(async ({ escape, runQuery }) => {
			const projectId = randomUUID();
			const agentId = randomUUID();
			const now = new Date('2026-01-01T00:00:00.000Z');
			await runQuery(
				`INSERT INTO ${escape.tableName('project')} (${['id', 'name', 'type', 'createdAt', 'updatedAt'].map(escape.columnName).join(', ')})
				 VALUES (:projectId, 'Project', 'team', :now, :now)`,
				{ projectId, now },
			);
			await runQuery(
				`INSERT INTO ${escape.tableName('agents')} (${['id', 'name', 'projectId', 'integrations', 'tools', 'skills', 'createdAt', 'updatedAt'].map(escape.columnName).join(', ')})
				 VALUES (:agentId, 'Agent', :projectId, '[]', '{}', '{}', :now, :now)`,
				{ agentId, projectId, now },
			);
			for (const checkpoint of checkpoints) {
				await runQuery(
					`INSERT INTO ${escape.tableName('agent_checkpoints')} (${originalColumns.map(escape.columnName).join(', ')})
					 VALUES (:runId, :agentId, :state, :expired, :now, :now)`,
					{ ...checkpoint, agentId, now },
				);
			}
		});
	});

	afterAll(async () => {
		await Container.get(DbConnection).close();
	});

	it('indexes existing thread keys without rebuilding the SQLite table or changing checkpoint state or age', async () => {
		const original = await readOriginalColumns();
		const sqliteRootPage = await readSqliteCheckpointRootPage();

		await runSingleMigration(MIGRATION_NAME);

		expect(await readOriginalColumns()).toEqual(original);
		if (sqliteRootPage !== undefined) {
			expect(await readSqliteCheckpointRootPage()).toBe(sqliteRootPage);
		}
		await withContext(async (context) => {
			const { escape, runQuery } = context;
			const rows = await runQuery<Array<{ runId: string; threadId: string | null }>>(
				`SELECT ${escape.columnName('runId')}, ${escape.columnName('threadId')} FROM ${escape.tableName('agent_checkpoints')}`,
			);
			expect(new Map(rows.map(({ runId, threadId }) => [runId, threadId]))).toEqual(
				new Map(checkpoints.map(({ runId, threadId }) => [runId, threadId])),
			);
			expect(await indexColumnsInOrder(context, INDEX_NAME)).toEqual([
				'agentId',
				'threadId',
				'expired',
				'updatedAt',
			]);
			const table = await context.queryRunner.getTable(`${context.tablePrefix}agent_checkpoints`);
			expect(table?.findColumnByName('threadId')).toMatchObject({ type: 'text', isNullable: true });
		});
	});

	it('preserves checkpoints through rollback and reapplication', async () => {
		const original = await readOriginalColumns();
		await runSingleMigration(MIGRATION_NAME);

		await undoLastSingleMigration();

		expect(await readOriginalColumns()).toEqual(original);
		await withContext(async (context) => {
			const table = await context.queryRunner.getTable(`${context.tablePrefix}agent_checkpoints`);
			expect(table?.findColumnByName('threadId')).toBeUndefined();
			expect(await indexColumnsInOrder(context, INDEX_NAME)).toBeUndefined();
		});
		await runSingleMigration(MIGRATION_NAME);
		expect(await readOriginalColumns()).toEqual(original);
		await withContext(async ({ escape, runQuery }) => {
			const rows = await runQuery<Array<{ threadId: string }>>(
				`SELECT ${escape.columnName('threadId')} FROM ${escape.tableName('agent_checkpoints')} WHERE ${escape.columnName('runId')} = 'run-100'`,
			);
			expect(rows).toEqual([{ threadId: 'thread-100' }]);
		});
	});
});
