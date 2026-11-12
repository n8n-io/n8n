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

const migration = 'AddAgentFolderPlacement1794325645791';

describe('Agent folder placement migration', () => {
	let dataSource: DataSource;

	beforeAll(async () => {
		await Container.get(DbConnection).init();
		dataSource = Container.get(DataSource);
	});

	beforeEach(async () => {
		await withContext(async ({ queryRunner }) => await queryRunner.clearDatabase());
		await initDbUpToMigration(migration);
		await withContext(async ({ escape, runQuery }) => {
			await runQuery(
				`INSERT INTO ${escape.tableName('project')} (${escape.columnName('id')}, ${escape.columnName('name')}, ${escape.columnName('type')}) VALUES ('project-1', 'Project', 'team')`,
			);
			await runQuery(
				`INSERT INTO ${escape.tableName('folder')} (${escape.columnName('id')}, ${escape.columnName('name')}, ${escape.columnName('projectId')}) VALUES ('folder-1', 'Folder', 'project-1')`,
			);
			await runQuery(
				`INSERT INTO ${escape.tableName('agents')} (${escape.columnName('id')}, ${escape.columnName('name')}, ${escape.columnName('projectId')}) VALUES ('agent-1', 'Agent', 'project-1')`,
			);
			await runQuery(
				`INSERT INTO ${escape.tableName('agent_execution_threads')} (${['id', 'agentId', 'agentName', 'projectId'].map(escape.columnName).join(', ')}) VALUES ('thread-1', 'agent-1', 'Agent', 'project-1')`,
			);
		});
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

	it('keeps existing folders in the workflow tree and Agents at root', async () => {
		await runSingleMigration(migration);

		await withContext(async ({ escape, runQuery }) => {
			expect(
				await runQuery(
					`SELECT ${escape.columnName('resourceType')} FROM ${escape.tableName('folder')}`,
				),
			).toEqual([{ resourceType: 'workflow' }]);
			expect(
				await runQuery(
					`SELECT ${escape.columnName('parentFolderId')} FROM ${escape.tableName('agents')}`,
				),
			).toEqual([{ parentFolderId: null }]);
			expect(
				await runQuery(
					`SELECT ${escape.columnName('id')} FROM ${escape.tableName('agent_execution_threads')}`,
				),
			).toEqual([{ id: 'thread-1' }]);
		});
	});

	it('requires lifecycle cleanup before a folder can be deleted', async () => {
		await runSingleMigration(migration);

		await withContext(async ({ escape, runQuery }) => {
			await runQuery(
				`UPDATE ${escape.tableName('folder')} SET ${escape.columnName('resourceType')} = 'agent'`,
			);
			await runQuery(
				`UPDATE ${escape.tableName('agents')} SET ${escape.columnName('parentFolderId')} = 'folder-1'`,
			);
			await expect(runQuery(`DELETE FROM ${escape.tableName('folder')}`)).rejects.toThrow();
			await expect(
				runQuery(
					`UPDATE ${escape.tableName('agents')} SET ${escape.columnName('projectId')} = NULL, ${escape.columnName('scope')} = 'instance'`,
				),
			).rejects.toThrow();
		});
	});

	it('reverts the new columns and keeps Agent sessions', async () => {
		await runSingleMigration(migration);
		await undoLastSingleMigration();

		await withContext(async ({ escape, runQuery, queryRunner, isSqlite, tablePrefix }) => {
			const agentTable = await queryRunner.getTable(`${tablePrefix}agents`);
			expect(agentTable?.findColumnByName('parentFolderId')).toBeUndefined();
			expect(
				await runQuery(
					`SELECT ${escape.columnName('id')} FROM ${escape.tableName('agent_execution_threads')}`,
				),
			).toEqual([{ id: 'thread-1' }]);

			if (isSqlite) {
				expect(await runQuery('PRAGMA foreign_key_check')).toEqual([]);
			}
		});
	});
});
