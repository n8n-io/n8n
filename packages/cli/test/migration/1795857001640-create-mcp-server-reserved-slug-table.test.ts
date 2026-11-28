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
import { v7 as uuidv7 } from 'uuid';

const migrationName = 'CreateMcpServerReservedSlugTable1795857001640';
const TABLE = 'mcp_server_reserved_slug';

describe('CreateMcpServerReservedSlugTable migration', () => {
	let dataSource: DataSource;
	let context: TestMigrationContext;

	beforeAll(async () => {
		await Container.get(DbConnection).init();
		dataSource = Container.get(DataSource);
	});

	beforeEach(async () => {
		context = createTestMigrationContext(dataSource);
		await context.queryRunner.clearDatabase();
		await context.queryRunner.release();
		await initDbUpToMigration(migrationName);
		await runSingleMigration(migrationName);
		context = createTestMigrationContext(dataSource);
	});

	afterEach(async () => {
		if (!context.queryRunner.isReleased) await context.queryRunner.release();
	});

	afterAll(async () => {
		await Container.get(DbConnection).close();
	});

	async function insert(table: string, row: Record<string, unknown>) {
		const { escape, runQuery } = context;
		const columns = Object.keys(row);
		await runQuery(
			`INSERT INTO ${escape.tableName(table)} (${columns.map(escape.columnName).join(', ')})
			 VALUES (${columns.map((column) => `:${column}`).join(', ')})`,
			row,
		);
	}

	async function count(table: string) {
		const { escape, runQuery } = context;
		const [row] = await runQuery<Array<{ count: number | string }>>(
			`SELECT COUNT(*) AS ${escape.columnName('count')} FROM ${escape.tableName(table)}`,
		);
		return Number(row.count);
	}

	async function seedServer() {
		const projectId = uuidv7();
		const serverId = uuidv7();
		await insert('project', { id: projectId, name: 'Test project', type: 'team' });
		await insert('mcp_server', { id: serverId, projectId, name: 'Sales tools', slug: 'new-slug' });
		return { projectId, serverId };
	}

	it('keeps each reserved slug unique and lets one server hold several reserved slugs', async () => {
		const { serverId } = await seedServer();
		await insert(TABLE, { slug: 'old-slug-1', serverId });
		await insert(TABLE, { slug: 'old-slug-2', serverId });

		await expect(insert(TABLE, { slug: 'old-slug-1', serverId })).rejects.toThrow();
		expect(await count(TABLE)).toBe(2);
	});

	it('deletes reserved slugs when the server project is deleted', async () => {
		const { projectId, serverId } = await seedServer();
		await insert(TABLE, { slug: 'old-slug', serverId });
		const { escape, runQuery } = context;

		await runQuery(
			`DELETE FROM ${escape.tableName('project')} WHERE ${escape.columnName('id')} = :id`,
			{ id: projectId },
		);

		expect(await count(TABLE)).toBe(0);
	});

	it('reverts a populated table and can run again', async () => {
		const { serverId } = await seedServer();
		await insert(TABLE, { slug: 'old-slug', serverId });
		await context.queryRunner.release();

		await undoLastSingleMigration();
		context = createTestMigrationContext(dataSource);
		expect(await context.queryRunner.hasTable(`${context.tablePrefix}${TABLE}`)).toBe(false);
		await context.queryRunner.release();

		await runSingleMigration(migrationName);
		context = createTestMigrationContext(dataSource);
		expect(await context.queryRunner.hasTable(`${context.tablePrefix}${TABLE}`)).toBe(true);
		await insert(TABLE, { slug: 'old-slug', serverId });
		expect(await count(TABLE)).toBe(1);
	});
});
