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

const MIGRATION_NAME = 'CreatePageTables1794930041563';

describe('CreatePageTables migration', () => {
	let dataSource: DataSource;
	let context: TestMigrationContext;

	beforeAll(async () => {
		const dbConnection = Container.get(DbConnection);
		await dbConnection.init();
		dataSource = Container.get(DataSource);
		const cleanup = createTestMigrationContext(dataSource);
		await cleanup.queryRunner.clearDatabase();
		await cleanup.queryRunner.release();
		await initDbUpToMigration(MIGRATION_NAME);
		await runSingleMigration(MIGRATION_NAME);
	});

	beforeEach(() => {
		context = createTestMigrationContext(dataSource);
	});

	afterEach(async () => {
		await context.queryRunner.release();
	});

	afterAll(async () => {
		await Container.get(DbConnection).close();
	});

	/** A migration run needs the connection that an open context holds. */
	async function runWithoutOpenContext(migrate: () => Promise<void>) {
		await context.queryRunner.release();
		await migrate();
		context = createTestMigrationContext(dataSource);
	}

	async function insertProject(id: string) {
		const now = new Date();
		await context.runQuery(
			`INSERT INTO ${context.escape.tableName('project')} ("id", "name", "type", "customTelemetryTags", "createdAt", "updatedAt")
			 VALUES (:id, :name, :type, :tags, :createdAt, :updatedAt)`,
			{ id, name: 'Project', type: 'team', tags: '[]', createdAt: now, updatedAt: now },
		);
	}

	async function insertPage(id: string, projectId: string) {
		await context.runQuery(
			`INSERT INTO ${context.escape.tableName('page')} ("id", "projectId", "title")
			 VALUES (:id, :projectId, :title)`,
			{ id, projectId, title: 'Runbook' },
		);
	}

	async function insertReference(pageId: string, resourceType: string, resourceId: string) {
		await context.runQuery(
			`INSERT INTO ${context.escape.tableName('page_reference')} ("pageId", "resourceType", "resourceId")
			 VALUES (:pageId, :resourceType, :resourceId)`,
			{ pageId, resourceType, resourceId },
		);
	}

	async function countRows(tableName: string) {
		const [{ count }] = await context.runQuery<Array<{ count: number | string }>>(
			`SELECT COUNT(*) AS count FROM ${context.escape.tableName(tableName)}`,
		);
		return Number(count);
	}

	it('should give a new page empty content, version 1 and no author', async () => {
		await insertProject('project-defaults');
		await insertPage('page-defaults', 'project-defaults');

		const [page] = await context.runQuery<
			Array<{ content: string; version: number; createdById: string | null }>
		>(
			`SELECT "content", "version", "createdById" FROM ${context.escape.tableName('page')} WHERE "id" = :id`,
			{ id: 'page-defaults' },
		);

		expect(page).toMatchObject({ content: '', version: 1, createdById: null });
	});

	it('should reject a page of a project that does not exist', async () => {
		await expect(insertPage('page-orphan', 'missing-project')).rejects.toThrow();
	});

	it('should reject a reference with an unknown resource type', async () => {
		await insertProject('project-check');
		await insertPage('page-check', 'project-check');

		await expect(insertReference('page-check', 'folder', 'folder-1')).rejects.toThrow();
	});

	it('should reject a second reference from a page to the same resource', async () => {
		await insertProject('project-unique');
		await insertPage('page-unique', 'project-unique');
		await insertReference('page-unique', 'workflow', 'wf-1');

		await expect(insertReference('page-unique', 'workflow', 'wf-1')).rejects.toThrow();
	});

	it('should delete the pages and their references with the project', async () => {
		await insertProject('project-cascade');
		await insertPage('page-cascade', 'project-cascade');
		await insertReference('page-cascade', 'workflow', 'wf-cascade');
		const pagesBefore = await countRows('page');
		const referencesBefore = await countRows('page_reference');

		await context.runQuery(`DELETE FROM ${context.escape.tableName('project')} WHERE "id" = :id`, {
			id: 'project-cascade',
		});

		expect(await countRows('page')).toBe(pagesBefore - 1);
		expect(await countRows('page_reference')).toBe(referencesBefore - 1);
	});

	describe('down', () => {
		it('should drop both tables and allow the migration to run again', async () => {
			await runWithoutOpenContext(undoLastSingleMigration);

			await expect(countRows('page')).rejects.toThrow();
			await expect(countRows('page_reference')).rejects.toThrow();

			await runWithoutOpenContext(async () => await runSingleMigration(MIGRATION_NAME));

			expect(await countRows('page')).toBe(0);
			expect(await countRows('page_reference')).toBe(0);
		});
	});
});
