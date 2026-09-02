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

const MIGRATION_NAME = 'CreateGitConnectionProjectTable1787089039726';

describe('CreateGitConnectionProjectTable migration', () => {
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

	async function insertProject(context: TestMigrationContext, id: string) {
		const table = context.escape.tableName('project');
		const now = new Date();
		await context.runQuery(
			`INSERT INTO ${table} ("id", "name", "type", "customTelemetryTags", "createdAt", "updatedAt")
			 VALUES (:id, :name, :type, :tags, :createdAt, :updatedAt)`,
			{ id, name: 'Project', type: 'team', tags: '[]', createdAt: now, updatedAt: now },
		);
	}

	async function insertConnection(context: TestMigrationContext, id: string) {
		const table = context.escape.tableName('git_connection');
		const now = new Date();
		await context.runQuery(
			`INSERT INTO ${table} ("id", "name", "repositoryUrl", "connectionType", "createdAt", "updatedAt")
			 VALUES (:id, :name, :repositoryUrl, :connectionType, :createdAt, :updatedAt)`,
			{
				id,
				name: 'Connection',
				repositoryUrl: 'https://example.com/org/repo.git',
				connectionType: 'https',
				createdAt: now,
				updatedAt: now,
			},
		);
	}

	async function insertLink(
		context: TestMigrationContext,
		projectId: string,
		connectionId: string,
	) {
		const table = context.escape.tableName('git_connection_project');
		const now = new Date();
		await context.runQuery(
			`INSERT INTO ${table} ("projectId", "gitConnectionId", "createdAt", "updatedAt")
			 VALUES (:projectId, :gitConnectionId, :createdAt, :updatedAt)`,
			{ projectId, gitConnectionId: connectionId, createdAt: now, updatedAt: now },
		);
	}

	async function countLinks(context: TestMigrationContext, projectId: string) {
		const table = context.escape.tableName('git_connection_project');
		const rows = await context.runQuery<Array<{ c: number }>>(
			`SELECT COUNT(*) as c FROM ${table} WHERE "projectId" = :projectId`,
			{ projectId },
		);
		return Number(rows[0].c);
	}

	describe('Up migration', () => {
		it('enforces one connection per project via the primary key', async () => {
			const context = createTestMigrationContext(dataSource);
			const projectId = randomUUID();
			const connectionId = randomUUID();
			await insertProject(context, projectId);
			await insertConnection(context, connectionId);
			await insertLink(context, projectId, connectionId);

			await expect(insertLink(context, projectId, connectionId)).rejects.toThrow();
			await context.queryRunner.release();
		});

		it('cascades the link away when the git connection is deleted', async () => {
			const context = createTestMigrationContext(dataSource);
			const projectId = randomUUID();
			const connectionId = randomUUID();
			await insertProject(context, projectId);
			await insertConnection(context, connectionId);
			await insertLink(context, projectId, connectionId);

			await context.runQuery(
				`DELETE FROM ${context.escape.tableName('git_connection')} WHERE "id" = :id`,
				{ id: connectionId },
			);

			expect(await countLinks(context, projectId)).toBe(0);
			await context.queryRunner.release();
		});

		it('cascades the link away when the project is deleted', async () => {
			const context = createTestMigrationContext(dataSource);
			const projectId = randomUUID();
			const connectionId = randomUUID();
			await insertProject(context, projectId);
			await insertConnection(context, connectionId);
			await insertLink(context, projectId, connectionId);

			await context.runQuery(
				`DELETE FROM ${context.escape.tableName('project')} WHERE "id" = :id`,
				{ id: projectId },
			);

			expect(await countLinks(context, projectId)).toBe(0);
			await context.queryRunner.release();
		});
	});

	describe('Down migration', () => {
		it('drops the table and can be re-applied', async () => {
			await dataSource.undoLastMigration({ transaction: 'each' });

			const context = createTestMigrationContext(dataSource);
			const table = `${context.tablePrefix}git_connection_project`;
			expect(await context.queryRunner.hasTable(table)).toBe(false);
			await context.queryRunner.release();

			await runSingleMigration(MIGRATION_NAME);
			const context2 = createTestMigrationContext(dataSource);
			expect(await context2.queryRunner.hasTable(table)).toBe(true);
			await context2.queryRunner.release();
		});
	});
});
