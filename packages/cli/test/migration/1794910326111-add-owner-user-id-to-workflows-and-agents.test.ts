import {
	createTestMigrationContext,
	initDbUpToMigration,
	runSingleMigration,
	type TestMigrationContext,
	undoLastSingleMigration,
} from '@n8n/backend-test-utils';
import { DbConnection } from '@n8n/db';
import { Container } from '@n8n/di';
import { DataSource } from '@n8n/typeorm';
import { randomUUID } from 'node:crypto';

const MIGRATION_NAME = 'AddOwnerUserIdToWorkflowsAndAgents1794910326111';

const userId = randomUUID();

describe('AddOwnerUserIdToWorkflowsAndAgents migration', () => {
	let dataSource: DataSource;

	async function withContext<T>(fn: (context: TestMigrationContext) => Promise<T>): Promise<T> {
		const context = createTestMigrationContext(dataSource);
		try {
			return await fn(context);
		} finally {
			await context.queryRunner.release();
		}
	}

	async function insert(table: string, row: Record<string, unknown>) {
		await withContext(async ({ escape, runQuery }) => {
			const keys = Object.keys(row);
			await runQuery(
				`INSERT INTO ${escape.tableName(table)} (${keys.map(escape.columnName).join(', ')}) VALUES (${keys.map((key) => `:${key}`).join(', ')})`,
				row,
			);
		});
	}

	const getOwners = async (table: string) =>
		await withContext(async ({ escape, runQuery }) => {
			const rows = await runQuery<Array<{ ownerUserId: string | null }>>(
				`SELECT ${escape.columnName('ownerUserId')} FROM ${escape.tableName(table)}`,
			);
			return rows.map(({ ownerUserId }) => ownerUserId);
		});

	const hasOwnerColumn = async (table: string) =>
		await withContext(async ({ queryRunner, tablePrefix }) => {
			const schema = await queryRunner.getTable(`${tablePrefix}${table}`);
			return schema?.findColumnByName('ownerUserId') !== undefined;
		});

	const countRows = async (table: string) =>
		await withContext(async ({ escape, runQuery }) => {
			const rows = await runQuery<unknown[]>(`SELECT 1 FROM ${escape.tableName(table)}`);
			return rows.length;
		});

	const getTriggerAndIndexNames = async () =>
		await withContext(async ({ isPostgres, runQuery, tablePrefix }) => {
			const rows = await runQuery<Array<{ name: string }>>(
				isPostgres
					? 'SELECT tgname AS name FROM pg_trigger UNION SELECT indexname FROM pg_indexes'
					: "SELECT name FROM sqlite_master WHERE type IN ('trigger', 'index')",
			);
			return rows.map(({ name }) => name.replace(tablePrefix, ''));
		});

	beforeAll(async () => {
		await Container.get(DbConnection).init();
		dataSource = Container.get(DataSource);
		await withContext(async ({ queryRunner }) => await queryRunner.clearDatabase());
		await initDbUpToMigration(MIGRATION_NAME);

		const now = new Date();
		await insert('user', { id: userId });
		await insert('project', { id: 'team', name: 'team', type: 'team' });
		await insert('workflow_entity', {
			id: 'workflow',
			name: 'workflow',
			nodes: '[]',
			connections: '{}',
			active: false,
			versionId: randomUUID(),
			createdAt: now,
			updatedAt: now,
		});
		await insert('shared_workflow', {
			workflowId: 'workflow',
			projectId: 'team',
			role: 'workflow:owner',
		});
		await insert('agents', {
			id: 'agent',
			name: 'agent',
			projectId: 'team',
			scope: 'project',
			integrations: '[]',
			tools: '{}',
			skills: '{}',
		});
		await insert('agent_publish_history', {
			agentId: 'agent',
			event: 'activated',
			userId,
			author: 'Author',
		});
	});

	afterAll(async () => {
		await Container.get(DbConnection).close();
	});

	it('adds an owner column that is null for existing rows', async () => {
		await runSingleMigration(MIGRATION_NAME);

		expect(await getOwners('workflow_entity')).toEqual([null]);
		expect(await getOwners('agents')).toEqual([null]);
	});

	it('removes the column on rollback and keeps rows, dependents, triggers and indexes', async () => {
		await undoLastSingleMigration();

		expect(await hasOwnerColumn('workflow_entity')).toBe(false);
		expect(await hasOwnerColumn('agents')).toBe(false);
		expect(await countRows('workflow_entity')).toBe(1);
		expect(await countRows('shared_workflow')).toBe(1);
		expect(await countRows('agents')).toBe(1);
		expect(await countRows('agent_publish_history')).toBe(1);

		expect(await getTriggerAndIndexNames()).toEqual(
			expect.arrayContaining([
				'workflow_version_increment',
				'IDX_workflow_entity_sourceWorkflowId',
				'IDX_agents_identityId',
			]),
		);
	});

	it('runs again after a rollback', async () => {
		await runSingleMigration(MIGRATION_NAME);

		expect(await hasOwnerColumn('workflow_entity')).toBe(true);
		expect(await hasOwnerColumn('agents')).toBe(true);
	});

	it('clears the owner and keeps the resource when the user is deleted', async () => {
		await withContext(async ({ escape, runQuery }) => {
			for (const table of ['workflow_entity', 'agents']) {
				await runQuery(
					`UPDATE ${escape.tableName(table)} SET ${escape.columnName('ownerUserId')} = :userId`,
					{ userId },
				);
			}
			await runQuery(`DELETE FROM ${escape.tableName('user')} WHERE id = :userId`, { userId });
		});

		expect(await getOwners('workflow_entity')).toEqual([null]);
		expect(await getOwners('agents')).toEqual([null]);
	});
});
